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

app.listen(port, () => console.log(`Example app listening on port ${port}!`));