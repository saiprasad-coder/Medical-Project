/**
 * routes/medicine.routes.js
 * Full CRUD for medicine reminders + auto-order toggle.
 * All routes are protected by JWT middleware.
 *
 * GET    /api/medicines             → Get all medicines for logged-in user
 * POST   /api/medicines             → Add new medicine reminder
 * PUT    /api/medicines/:id         → Update a reminder (status, dosage, etc.)
 * DELETE /api/medicines/:id         → Delete a reminder
 * PATCH  /api/medicines/:id/auto-order → Toggle auto-order on/off
 */

const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const { protect } = require('../middleware/auth.middleware');

// Apply JWT protection to ALL medicine routes
router.use(protect);

// ─── GET /api/medicines ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const medicines = await Medicine.find({ userId: req.user._id }).sort({ date: 1, createdAt: 1 });
        res.json(medicines);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch medicines.' });
    }
});

// ─── POST /api/medicines ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    const { name, dosage, date, time, meal, alarm, autoOrder } = req.body;

    if (!name || !dosage || !date || !time) {
        return res.status(400).json({ message: 'Name, dosage, date and time are required.' });
    }

    try {
        const medicine = await Medicine.create({
            userId: req.user._id,
            name, dosage, date, time,
            meal: meal || 'After Food',
            status: 'upcoming',
            alarm: alarm !== undefined ? alarm : true,
            autoOrder: autoOrder || false,
            autoOrderEnabled: false
        });

        res.status(201).json(medicine);
    } catch (error) {
        console.error('Add Medicine Error:', error.message);
        res.status(500).json({ message: 'Failed to add medicine.' });
    }
});

// ─── PUT /api/medicines/:id ───────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
    try {
        const medicine = await Medicine.findOne({ _id: req.params.id, userId: req.user._id });

        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found.' });
        }

        // Merge allowed updates
        const allowedFields = ['name', 'dosage', 'date', 'time', 'meal', 'status', 'alarm', 'autoOrder'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                medicine[field] = req.body[field];
            }
        });

        const updated = await medicine.save();
        res.json(updated);
    } catch (error) {
        console.error('Update Medicine Error:', error.message);
        res.status(500).json({ message: 'Failed to update medicine.' });
    }
});

// ─── DELETE /api/medicines/:id ────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const medicine = await Medicine.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found.' });
        }

        res.json({ message: 'Reminder deleted successfully.', id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete medicine.' });
    }
});

// ─── PATCH /api/medicines/:id/auto-order ──────────────────────────────────────
router.patch('/:id/auto-order', async (req, res) => {
    const { enabled } = req.body;

    if (enabled === undefined) {
        return res.status(400).json({ message: '`enabled` field is required (true/false).' });
    }

    try {
        const medicine = await Medicine.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { autoOrderEnabled: enabled },
            { new: true }
        );

        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found.' });
        }

        res.json(medicine);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update auto-order.' });
    }
});

module.exports = router;
