const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users');

const botName = 'Bot';

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', socket => {
    socket.on('joinRoom', ({ username, room }) => {
        const user = userJoin(socket.id, username, room);
        socket.join(user.room);

        // Emit room users and room name to the client
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });

        // Welcome current user
        socket.emit('message', { username: botName, text: 'Welcome to ChatCord!' });

        // Broadcast when a user connects
        socket.broadcast.to(user.room).emit('message', {
            username: botName,
            text: `${user.username} has joined the chat`
        });
    });

    // Listen for chat messages
    socket.on('chatMessage', msg => {
        const user = getCurrentUser(socket.id);
        io.to(user.room).emit('message', { username: user.username, text: msg, time: new Date().toLocaleTimeString() });
    });

    // When a user disconnects
    socket.on('disconnect', () => {
        const user = userLeave(socket.id); // Ensure user is correctly fetched here
        if (user) {
            io.to(user.room).emit('message', { username: botName, text: `${user.username} has left the chat` });

            // Emit updated room users list
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        }
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
