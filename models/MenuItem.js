const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema({
    size: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    }
});

const menuItemSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: [true, 'Название обязательно'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Описание обязательно'],
        trim: true
    },
    image: {
        type: String,
        required: true
    },
    sizes: [sizeSchema],
    category: {
        type: String,
        default: 'coffee'
    },
    available: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

menuItemSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('MenuItem', menuItemSchema);

