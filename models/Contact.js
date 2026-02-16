const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Имя обязательно'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email обязателен'],
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Некорректный email']
    },
    message: {
        type: String,
        required: [true, 'Сообщение обязательно'],
        trim: true
    },
    status: {
        type: String,
        enum: ['new', 'read', 'replied'],
        default: 'new'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Contact', contactSchema);

