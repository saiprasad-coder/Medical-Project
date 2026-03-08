/**
 * storage.js
 * Centralized localStorage management for DoseCare.
 */

const STORAGE_KEYS = {
    REMINDERS: 'doseCare_reminders',
    AUTO_ORDER: 'doseCare_autoOrder',
    USER_NAME: 'doseCare_userName',
    LAST_ACTION: 'doseCare_lastAction'
};

const Storage = {
    // --- Reminders ---
    getReminders() {
        const stored = localStorage.getItem(STORAGE_KEYS.REMINDERS);
        if (!stored) {
            const defaults = [
                { id: '1', name: 'Amoxicillin', dosage: '500mg', date: new Date().toISOString().split('T')[0], time: '08:00 AM', meal: 'After Food', status: 'taken', alarm: true },
                { id: '2', name: 'Vitamin D3', dosage: '1 pill', date: new Date().toISOString().split('T')[0], time: '01:00 PM', meal: 'Before Food', status: 'upcoming', alarm: true },
                { id: '3', name: 'Lisinopril', dosage: '10mg', date: new Date().toISOString().split('T')[0], time: '07:00 AM', meal: 'Before Food', status: 'missed', alarm: true }
            ];
            this.saveReminders(defaults);
            return defaults;
        }
        return JSON.parse(stored);
    },

    saveReminders(reminders) {
        localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
    },

    addReminder(reminder) {
        const reminders = this.getReminders();
        reminders.push(reminder);
        this.saveReminders(reminders);
        return reminder;
    },

    updateReminder(id, updates) {
        const reminders = this.getReminders();
        const index = reminders.findIndex(r => r.id === id);
        if (index !== -1) {
            // If updates has status, we merge it, otherwise keep old status
            reminders[index] = { ...reminders[index], ...updates };
            this.saveReminders(reminders);
            return reminders[index];
        }
        return null;
    },

    deleteReminder(id) {
        const reminders = this.getReminders();
        const filtered = reminders.filter(r => r.id !== id);
        this.saveReminders(filtered);
    },

    // --- Auto Order ---
    getAutoOrders() {
        const stored = localStorage.getItem(STORAGE_KEYS.AUTO_ORDER);
        if (!stored) {
            const defaults = [
                { id: 'ao1', name: 'Amoxicillin Base', enabled: true },
                { id: 'ao2', name: 'Vitamin D3 Supply', enabled: false },
                { id: 'ao3', name: 'Lisinopril Monthly', enabled: true }
            ];
            this.saveAutoOrders(defaults);
            return defaults;
        }
        return JSON.parse(stored);
    },

    saveAutoOrders(orders) {
        localStorage.setItem(STORAGE_KEYS.AUTO_ORDER, JSON.stringify(orders));
    },

    // --- Last Action (Undo) ---
    setLastAction(action) {
        localStorage.setItem(STORAGE_KEYS.LAST_ACTION, JSON.stringify(action));
    },

    getLastAction() {
        const stored = localStorage.getItem(STORAGE_KEYS.LAST_ACTION);
        return stored ? JSON.parse(stored) : null;
    },

    clearLastAction() {
        localStorage.removeItem(STORAGE_KEYS.LAST_ACTION);
    }
};

window.DoseCareStorage = Storage;
