const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    guests: {
        type: Number,
        required: [true, 'Количество гостей обязательно'],
        min: 1
    },
    date: {
        type: Date,
        required: [true, 'Дата обязательна']
    },
    time: {
        type: String,
        required: [true, 'Время обязательно']
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    notes: {
        type: String
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

bookingSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Booking', bookingSchema);

