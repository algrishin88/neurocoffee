const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    itemId: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    image: {
        type: String
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    }
});

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [orderItemSchema],
    total: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
        default: 'pending'
    },
    deliveryAddress: {
        type: String
    },
    phone: {
        type: String
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

orderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Order', orderSchema);

