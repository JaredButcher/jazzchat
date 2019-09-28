const express = require('express');
const uuidv4 = require('uuid/v4');
const app = express();
const port = 3000;
app.use(express.json());

const serverName = 'Javascript Server';
const adminPassword = 'Let me in!';
const rooms = [];

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

	rooms.push(newRoom);

	res.send({successful: true});
});

app.get('/room', (req, res) => {
	const parsedRooms = rooms.map((room) => { 
		return { id: room.id, name: room.name, description: room.description }; 
	});

	res.send({ name: serverName, rooms: parsedRooms});
});

app.delete('/room/:roomId', (req, res) => {
	if (req.body.adminPassword !== adminPassword) {
		return res.status(401).send({ successful: false, errMsg: 'Invalid adminPassword!'});
	}

	const roomId = req.params.roomId;
	const roomIndex = rooms.findIndex(room => room.id === roomId);

	if (roomIndex === -1) {
		return res.status(404).send({ successful: false, errMsg: 'Room not found!'});
	}

	rooms.splice(roomIndex, 1);

	return res.send({successful: true})
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));