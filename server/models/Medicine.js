/**
 * models/Medicine.js
 * Mongoose schema for medicine reminders.
 */

const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
    // Owner — the user this reminder belongs to
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Medicine details
    name: {
        type: String,
        required: [true, 'Medicine name is required'],
        trim: true
    },
    dosage: {
        type: String,
        required: [true, 'Dosage is required'],
        trim: true
    },

    // Schedule
    date: {
        type: String,   // ISO date string "YYYY-MM-DD" for easy frontend use
        required: [true, 'Date is required']
    },
    time: {
        type: String,   // e.g. "08:00 AM"
        required: [true, 'Time is required']
    },
    meal: {
        type: String,
        enum: ['Before Food', 'After Food'],
        default: 'After Food'
    },

    // Reminder state
    status: {
        type: String,
        enum: ['upcoming', 'taken', 'missed'],
        default: 'upcoming'
    },
    alarm: {
        type: Boolean,
        default: true
    },

    // Auto Order
    autoOrder: {
        type: Boolean,
        default: false
    },
    autoOrderEnabled: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Medicine', medicineSchema);
