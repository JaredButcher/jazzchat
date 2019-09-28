const express = require('express');
const uuidv4 = require('uuid/v4');
const app = express();
const port = 3000;
app.use(express.json());

const serverName = 'Javascript Server';
const adminPassword = 'Let me in!';
const rooms = {};

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

	if (!!req.body.accessPassword) {
		newRoom.accessPassword = req.body.accessPassword;
	}

	rooms[newRoom.id] = newRoom;

	res.send({successful: true});
});

app.get('/room', (req, res) => {
	const parsedRooms = [];
	for (roomId in rooms) {
		const room = rooms[roomId];
		parsedRooms.push({ id: room.id, name: room.name, description: room.description }); 
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
	room.messages.push({
		id: messageId,
		sender: req.body.user,
		message: req.body.message,
		timeStamp: Math.floor(Date.now() / 1000),
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

app.listen(port, () => console.log(`Example app listening on port ${port}!`));