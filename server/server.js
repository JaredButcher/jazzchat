const express = require('express');
const uuidv4 = require('uuid/v4');

const app = express();
const ws = require('express-ws')(app);
app.use(express.json());

let port;
let serverName;
let adminPassword;
let connectionString;
const dbName = 'JazzChat';

const activeSockets = [];
const roomWatchers = {};

const MongoClient = require('mongodb').MongoClient;
const getDatabase = (cb) => {
	const client = new MongoClient(connectionString);
	client.connect(function(err) {
		if (err) {
			console.log(err);
		}
		const db = client.db(dbName);

		cb(db);

		client.close();
	});
}

const countRooms = (cb) => {
	getDatabase((db) => {
		const collection = db.collection('rooms');

		collection.count({}, (err, rooms) => {
			if (err) {
				console.log(err);
			}

			cb(rooms);
		});
	});
}

const getRooms = (cb) => {
	getDatabase((db) => {
		const collection = db.collection('rooms');

		collection.find({}).toArray(function(err, rooms) {
			if (err) {
				console.log(err);
			}

			cb(rooms);
		});
	});
}

const getRoom = (roomId, cb) => {
	getDatabase((db) => {
		const collection = db.collection('rooms');

		console.log(roomId);

		collection.findOne({roomId: Number(roomId)}, (err, room) => {
			if (err) {
				console.log(err);
			}

			cb(room);
		});
	});
}

const addRoom = (room, cb) => {
	getDatabase((db) => {
		const collection = db.collection('rooms');

		collection.insertOne(room, cb);
	});
}

const updateRoom = (roomId, newRoom, cb) => {
	getDatabase(db => {
		const collection = db.collection('rooms');

		collection.updateOne({ roomId : Number(roomId) }, { $set: newRoom }, cb);
	});
}

const deleteRoom = (roomId, cb) => {
	getDatabase(db => {
		const collection = db.collection('rooms');

		collection.deleteOne({ roomId : Number(roomId) }, cb);
	});
}

app.post('/createRoom', (req, res) => {
	console.log('received request to create room');

	if (req.body.adminPassword !== adminPassword) {
		console.log('user could not create room because they used the wrong password');
		return res.status(401).send({ successful: false, errMsg: 'Invalid adminPassword!' });
	}
	
	if (!req.body.name) {
		console.log('user did not create room because they did not name it');
		return res.status(422).send({ successful: false, errMsg: 'Missing name!' });
	}

	if (!req.body.description) {
		console.log('user did not create room because they did not provide a description');
		return res.status(422).send({ successful: false, errMsg: 'Missing description!' });
	}

	countRooms(roomCount => {
		const newRoom = {};

		newRoom.roomId = roomCount;
		newRoom.name = req.body.name;
		newRoom.description = req.body.description;
		newRoom.messages = [];

		if (!!req.body.accessPassword) {
			newRoom.accessPassword = req.body.accessPassword;
		}

		addRoom(newRoom, () => {
			res.send({successful: true, newRoomId: newRoom.roomId});
			console.log(`user created a new chatroom ${newRoom.name}`);
		});
	});
});

app.get('/server', (req, res) => {
	console.log(`user requested a list of rooms`);

	getRooms(rooms => {
		const parsedRooms = [];
		for (roomId in rooms) {
			const room = rooms[roomId];
			parsedRooms.push({ id: room.roomId, name: room.name, description: room.description, hasPassword: !!room.accessPassword }); 
		};

		res.send({ name: serverName, rooms: parsedRooms});
	});
});

app.delete('/room/:roomId', (req, res) => {
	console.log('user attempted to delete chatroom');
	if (req.body.adminPassword !== adminPassword) {
		return res.status(401).send({ successful: false, errMsg: 'Invalid adminPassword!'});
	}

	if (!!roomWatchers[req.params.roomId]) {
		roomWatchers[req.params.roomId].forEach(socketId => {
			unsubscribeSocket(socketId, req.params.roomId);
		});
	}

	console.log(req.params.roomId);
	deleteRoom(req.params.roomId, (err, result) => {
		if (!!err) {
			console.log(err.message);
			res.status(500).send(err);//{successful: false, errMsg: 'Something weird happened'});
			console.log('something happened... the delete was unsuccessful');
			return;
		}
		if (result.result.n === 1) {
			res.send({successful: true});
			console.log('delete successful!');
		} else if (result.result.n === 0) {
			res.status(404).send({successful: false, errMsg: 'Room not found'});
			console.log('they tried to delete a room that did not exist');
		} else {
			console.log(result.result);
			res.status(500).send(err);//{successful: false, errMsg: 'Something weird happened'});
			console.log('something happened... the delete was unsuccessful');
		}
	});
});

app.post('/room/:roomId/message', (req, res) => {
	console.log('user attempted to post a new message');
	if (!req.params.roomId) {
		return res.status(422).send({ successful: false, errMsg: 'Invalid room id!'});
	}

	getRoom(req.params.roomId, room => {
		if (!room) {
			return res.status(404).send({successful: false, errMsg: 'A room with that id was not found!'})
		}

		if (!!room.accessPassword && room.accessPassword !== req.params.accessPassword) {
			return res.status(401).send({successful: false, errMsg: 'Invalid password!'});
		}

		const messageId = room.messages.length;
		const message = {
			id: messageId,
			sender: req.body.user,
			message: req.body.message,
			timeStamp: Math.floor(Date.now() / 1000),
		};
		room.messages.push(message);
		if (!!roomWatchers[room.roomId]) {
			roomWatchers[room.roomId].forEach(socketId => {
				try {
					const socket = activeSockets.find(socket => socket.id === socketId).socket;
					socket.send(JSON.stringify({update: {roomId: room.roomId, message}}));
				} catch(e) {
					console.log('Something went wrong notifying a subscriber!');
					console.log(e);
				}
			});
		}

		updateRoom(room.roomId, room, () => {
			res.send({successful: true, messageId: messageId});
			console.log('message received!');
		});
	});
});

app.get('/room/:roomId', (req, res) => {
	console.log('user wanted to view chatroom');
	if (!req.params.roomId) {
		return res.status(422).send({ successful: false, errMsg: 'Invalid room id!'});
	}

	if (!req.body.messageCount && req.body.messageCount !== 0) {
		return res.status(422).send({successful: false, errMsg: 'Missing messageCount!'})
	}

	getRoom(req.params.roomId, room => {
		if (!room) {
			return res.status(404).send({successful: false, errMsg: 'A room with that id was not found!'})
		}

		if (!!room.accessPassword && room.accessPassword !== req.params.accessPassword) {
			return res.status(401).send({successful: false, errMsg: 'Invalid password!'});
		}

		let messageOffsetIndex = room.messages.length ;
		if (req.body.messageOffset) {
			messageOffsetIndex = room.messages.findIndex((message) => message.id === req.body.messageOffset) + 1;
		}

		const start = Math.max(messageOffsetIndex - req.body.messageCount, 0);
		const messages = room.messages.slice(start, messageOffsetIndex);

		res.send({successful: true, name: room.name, description: room.description, messages: messages});
		console.log('user was able to see chatroom');
	});
});


app.ws('/', (socket, req) => {
	console.log('socket connection established');
	const roomSubscriptions = [];
	const socketId = uuidv4();
	activeSockets.push({id: socketId, roomSubscriptions: roomSubscriptions, socket: socket});
	socket.on('message', (args) => {
		console.log('socket message received', args)
		args = JSON.parse(args);
		if (!!args.subscribe) {
			const roomId = args.subscribe.roomId;
			const accessPassword = args.subscribe.accessPassword;

			getRoom(roomId, room => {
				console.log('user subscribed to room', roomId, room)
				if (!room) {
					return socket.send(JSON.stringify({error: 'Room not found!'}));
				}

				if (!!room.accessPassword && room.accessPassword !== accessPassword) {
					return socket.send(JSON.stringify({error: 'Invalid password for room ' + room.name}));
				}

				if (!roomWatchers[roomId]) {
					roomWatchers[roomId] = [];
				}

				roomWatchers[roomId].push(socketId);
				roomSubscriptions.push(room.roomId);

				console.log({roomWatchers});
				console.log({roomSubscriptions});
			});
		}
		if (!!args.unsubscribe) {
			unsubscribeSocket(socketId, args.unsubscribe.roomId);
		}
	});
	socket.onclose(() => {
		roomSubscriptions.forEach((roomSubscription) => {
			unsubscribeSocket(socketId, roomSubscription);
		});
		const activeSocketIndex = activeSockets.findIndex(x => x.id === socketId);
		activeSockets.splice(activeSocketIndex, 1);
	});
});

function unsubscribeSocket(socketId, roomId) {
	if (!!roomWatchers[roomId]) {
		const subscriptionIndex = roomWatchers[roomId].findIndex(x => x === socketId);
		if (subscriptionIndex != -1) {
			roomWatchers[roomId].splice(subscriptionIndex, 1);
		}
	}

	const socket = activeSockets.find(x => x.id === socketId);
	if (!!socket) {
		const roomIndex = socket.roomSubscriptions.findIndex(roomSubscription => roomSubscription === roomId);
		if (roomIndex != -1) {
			socket.roomSubscriptions.splice(roomIndex, 1);
		}
	}	
}

const serverSetup = () => {
	console.log(`${serverName} listening on port ${port}!`);
}

var fs = require("fs");
try {
	const unparsedSettings = fs.readFileSync("jazz-settings.json");
	const settings = JSON.parse(unparsedSettings);

	port = settings.port;
	serverName = settings.serverName;
	adminPassword = settings.adminPassword;
	connectionString = settings.connectionString;
	app.listen(port, serverSetup);
} catch (e) {
	const readline = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout
	});
	
	console.log('Configuration file "jazz-settings.json" not found!');
	console.log();
	readline.question('What PORT should the server run on? ', (inputPort) => {
		port = inputPort;
		readline.question('What should the server\'s name be? ', (inputServerName) => {
			serverName = inputServerName;
			readline.question('What should the administrator password be? ', (inputAdminPassword) => {
				adminPassword = inputAdminPassword;
				readline.question('What should the connection string be? ', (inputConnectionString) => {
					adminPassword = inputConnectionString;
					readline.close();

					const settings = {port: port, serverName: serverName, adminPassword: adminPassword};
					fs.writeFileSync('jazz-settings.json', JSON.stringify(settings));
					console.log('"jazz-settings.json" created automatically for you.');
					console.log();

					app.listen(port, serverSetup);
				});
			});
		});
	});
}