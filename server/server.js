const express = require('express');
const uuidv4 = require('uuid/v4');

const app = express();
const ws = require('express-ws')(app);
const port = 3000;
app.use(express.json());

const serverName = 'Javascript Server';
const adminPassword = 'Let me in!';
const rooms = {};
const activeSockets = [];

app.post('/createRoom', (req, res) => {
	if (req.body.adminPassword !== adminPassword) {
		return res.status(401).send({ successful: false, errMsg: 'Invalid adminPassword!' });
	}
	
	if (!req.body.name) {
		return res.status(422).send({ successful: false, errMsg: 'Missing name!' });
	}

	if (!req.body.description) {
		return res.status(422).send({ successful: false, errMsg: 'Missing description!' });
	}

	const newRoom = {};

	newRoom.id = uuidv4();
	newRoom.name = req.body.name;
	newRoom.description = req.body.description;
	newRoom.messages = [];
	newRoom.subscribedSocketIds = [];

	if (!!req.body.accessPassword) {
		newRoom.accessPassword = req.body.accessPassword;
	}

	rooms[newRoom.id] = newRoom;

	res.send({successful: true, newRoomId: newRoom.id});
});

app.get('/room', (req, res) => {
	const parsedRooms = [];
	for (roomId in rooms) {
		const room = rooms[roomId];
		parsedRooms.push({ id: room.id, name: room.name, description: room.description, hasPassword: !!room.accessPassword }); 
	};

	res.send({ name: serverName, rooms: parsedRooms});
});

app.delete('/room/:roomId', (req, res) => {
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

	return res.send({successful: true})
});

app.post('/room/:roomId/message', (req, res) => {
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

	const messageId = uuidv4();
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
});

app.get('/room/:roomId', (req, res) => {
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
});


app.ws('/', (socket, req) => {
	const roomSubscriptions = [];
	const socketId = uuidv4();
	activeSockets.push({id: socketId, roomSubscriptions: roomSubscriptions, socket: socket});
	socket.on('message', (args) => {
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

app.listen(port, () => console.log(`Example app listening on port ${port}!`));