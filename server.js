const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const { PORT } = require('./config.js');

const app = express();
const server = http.createServer(app);
const io = new socketio.Server(server);

app.use(express.static('wwwroot'));
app.use(require('./routes/auth.js'));
app.use(require('./routes/models.js'));

io.on('connection', (socket) => {
    console.log('user connected');

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    socket.on('join-channel', function (data) {
        socket.join(data.urn);
    });
    socket.on('leave-channel', function (data) {
        socket.leave(data.urn);
    });
    socket.on('update-state', function (data) {
        socket.to(data.urn).emit('state-changed', data.state);
    });
});

server.listen(PORT, function () { console.log(`Server listening on port ${PORT}...`); });
