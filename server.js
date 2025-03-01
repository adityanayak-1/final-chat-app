const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const formatMessage = require('./utils/messages');
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users');
const Message = require('./models/Messages');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

console.log("MONGODB_URI:", process.env.MONGODB_URI); // Debugging

const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected successfully"))
.catch(err => console.error("MongoDB connection error:", err));

const botName = "Bot";

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Run when client connects
io.on('connection', socket => {
    socket.on('joinRoom', async ({ username, room }) => {
        const user = userJoin(socket.id, username, room);
        socket.join(user.room);

        // Fetch chat history from MongoDB
        const messages = await Message.find({ room }).sort({ time: 1 });
        socket.emit('loadMessages', messages);

        // Welcome current user
        socket.emit('message', formatMessage(botName, 'Welcome to ChatCord'));

        // Broadcast when a user connects
        socket.broadcast.to(user.room).emit('message', 
            formatMessage(botName, `${user.username} has joined the chat`));
    });

    // Listen for chat messages
    socket.on('chatMessage', async (msg) => {
        const user = getCurrentUser(socket.id);
        if (user) {
            const messageData = formatMessage(user.username, msg);

            // Save message to MongoDB
            const message = new Message({
                username: user.username,
                room: user.room,
                text: messageData.text,
                time: messageData.time
            });

            await message.save();

            io.to(user.room).emit('message', messageData);
        }
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);
        if (user) {
            io.to(user.room).emit('message', formatMessage(botName, `${user.username} has left the chat`));
        }
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
