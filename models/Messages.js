const mongoose = require('mongoose');

// Create a schema for messages
const messageSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    room: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    time: {
        type: Date,
        default: Date.now
    }
});

// Create the Message model
const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
