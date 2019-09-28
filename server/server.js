const express = require('express');
const uuidv4 = require('uuid/v4');

const app = express();
const ws = require('express-ws')(app);
app.use(express.json());

let port;
let serverName;
let adminPassword;

const rooms = [];
const activeSockets = [];

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

	const newRoom = {};

	newRoom.id = rooms.length;
	newRoom.name = req.body.name;
	newRoom.description = req.body.description;
	newRoom.messages = [];
	newRoom.subscribedSocketIds = [];

	if (!!req.body.accessPassword) {
		newRoom.accessPassword = req.body.accessPassword;
	}

	rooms.push(newRoom);

	res.send({successful: true, newRoomId: newRoom.id});
	console.log(`user created a new chatroom ${newRoom.name}`);
});

app.get('/server', (req, res) => {
	console.log(`user requested a list of rooms`);

	const parsedRooms = [];
	for (roomId in rooms) {
		const room = rooms[roomId];
		parsedRooms.push({ id: room.id, name: room.name, description: room.description, hasPassword: !!room.accessPassword }); 
	};

	res.send({ name: serverName, rooms: parsedRooms});
});

app.delete('/room/:roomId', (req, res) => {
	console.log('user attempted to delete chatroom');
	if (req.body.adminPassword !== adminPassword) {
		return res.status(401).send({ successful: false, errMsg: 'Invalid adminPassword!'});
	}

	if (!rooms[req.params.roomId]) {
		return res.status(404).send({ successful: false, errMsg: 'Room not found!'});
	}

	rooms[req.params.roomId].subscribedSocketIds.forEach(socketId => {
		unsubscribeSocket(socketId, req.params.roomId);
	});

	delete rooms[req.params.roomId];

	res.send({successful: true});
	console.log('delete successful!');
});

app.post('/room/:roomId/message', (req, res) => {
	console.log('user attempted to post a new message');
	if (!req.params.roomId) {
		return res.status(422).send({ successful: false, errMsg: 'Invalid room id!'});
	}

	if (!rooms[req.params.roomId]) {
		return res.status(404).send({successful: false, errMsg: 'A room with that id was not found!'})
	}

	const room = rooms[req.params.roomId];
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
	room.subscribedSocketIds.forEach(socketId => {
		try {
			const socket = activeSockets.find(socket => socket.id === socketId).socket;
			socket.send(JSON.stringify({update: {roomId: room.id, message}}));
		} catch(e) {
			console.log('Something went wrong notifying a subscriber!');
			console.log(e);
		}
	});

	res.send({successful: true, messageId: messageId});
	console.log('message received!');
});

app.get('/room/:roomId', (req, res) => {
	console.log('user wanted to view chatroom')
	if (!req.params.roomId) {
		return res.status(422).send({ successful: false, errMsg: 'Invalid room id!'});
	}

	if (!req.body.messageCount && req.body.messageCount !== 0) {
		return res.status(422).send({successful: false, errMsg: 'Missing messageCount!'})
	}

	if (!rooms[req.params.roomId]) {
		return res.status(404).send({successful: false, errMsg: 'A room with that id was not found!'})
	}

	const room = rooms[req.params.roomId];
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

			const room = rooms[roomId];
			if (!room) {
				return socket.send(JSON.stringify({error: 'Room not found!'}));
			}

			if (!!room.accessPassword && room.accessPassword !== accessPassword) {
				return socket.send(JSON.stringify({error: 'Invalid password for room ' + room.name}));
			}

			room.subscribedSocketIds.push(socketId);
			roomSubscriptions.push(room.id);
		}
		if (!!args.unsubscribe) {
			unsubscribeSocket(socket, args.unsubscribe.roomId);
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
	const socket = activeSockets.find(x => x.id === socketId);
	if (!socket) {
		return;
	}

	const room = rooms[roomId];
	if (!room) {
		return;
	}

	const subscriptionIndex = room.subscribedSocketIds.findIndex(x => x === socketId);
	if (subscriptionIndex != -1) {
		room.subscribedSocketIds.splice(subscriptionIndex, 1);
	}

	const roomIndex = socket.roomSubscriptions.findIndex(roomSubscription => roomSubscription === roomId);
	if (roomIndex != -1) {
		socket.roomSubscriptions.splice(roomIndex, 1);
	}
}

var fs = require("fs");
try {
	const unparsedSettings = fs.readFileSync("jazz-settings.json");
	const settings = JSON.parse(unparsedSettings);

	port = settings.port;
	serverName = settings.serverName;
	adminPassword = settings.adminPassword;
	app.listen(port, () => console.log(`${serverName} listening on port ${port}!`));
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
				readline.close();

				const settings = {port: port, serverName: serverName, adminPassword: adminPassword};
				fs.writeFileSync('jazz-settings.json', JSON.stringify(settings));
				console.log('"jazz-settings.json" created automatically for you.');
				console.log();

				app.listen(port, () => console.log(`${serverName} listening on port ${port}!`));
			});
		});
	});
}