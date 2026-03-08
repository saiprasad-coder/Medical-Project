/**
 * add-medicine.js
 * Handles the Add/Edit Reminder modal and form logic.
 * Now uses DoseCareAPI (api.js) to persist medicines to the backend.
 */

document.addEventListener('DOMContentLoaded', () => {
    const API = window.DoseCareAPI;
    if (!API) return;

    const modal = document.getElementById('reminder-modal');
    const reminderForm = document.getElementById('reminder-form');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const modalTitle = document.getElementById('modal-title');

    const idInput = document.getElementById('reminder-id');
    const nameInput = document.getElementById('medicine-name');
    const dosageInput = document.getElementById('medicine-dosage');
    const dateInput = document.getElementById('medicine-date');
    const timeInput = document.getElementById('medicine-time');

    function getTodayDateString() {
        return new Date().toISOString().split('T')[0];
    }

    // Format 24h "HH:MM" → "HH:MM AM/PM"
    function formatTime12h(timeStr) {
        let [hours, minutes] = timeStr.split(':');
        hours = parseInt(hours);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }

    // Format "HH:MM AM/PM" → "HH:MM" for <input type="time">
    function parseTime24h(time12h) {
        try {
            const [timeStart, period] = time12h.split(' ');
            let [hours, minutes] = timeStart.split(':');
            if (period === 'PM' && hours !== '12') hours = String(parseInt(hours) + 12);
            if (period === 'AM' && hours === '12') hours = '00';
            return `${hours.padStart(2, '0')}:${minutes}`;
        } catch (e) { return ''; }
    }

    // ── Open modal to ADD new medicine ────────────────────────────────────────
    window.openAddModal = function (e) {
        if (e) e.preventDefault();
        idInput.value = '';
        nameInput.value = '';
        dosageInput.value = '';
        dateInput.value = getTodayDateString();
        timeInput.value = '';

        const alarmCheck = document.getElementById('medicine-alarm');
        if (alarmCheck) alarmCheck.checked = true;

        const mealRadios = document.getElementsByName('medicine-meal');
        if (mealRadios.length) mealRadios[0].checked = true;

        modalTitle.textContent = 'Add New Medicine';
        modal.style.display = 'flex';
        nameInput.focus();
    };

    // ── Open modal to EDIT an existing medicine ───────────────────────────────
    window.openEditModal = async function (id, e) {
        if (e) e.preventDefault();
        try {
            const medicines = await API.getMedicines();
            const reminder = medicines.find(r => (r._id || r.id) === id);
            if (reminder) {
                idInput.value = id;
                nameInput.value = reminder.name;
                dosageInput.value = reminder.dosage;
                dateInput.value = reminder.date || getTodayDateString();
                timeInput.value = parseTime24h(reminder.time);

                const alarmCheck = document.getElementById('medicine-alarm');
                if (alarmCheck) alarmCheck.checked = reminder.alarm !== false;

                const mealRadios = document.getElementsByName('medicine-meal');
                for (let r of mealRadios) {
                    if (r.value === reminder.meal) r.checked = true;
                }

                modalTitle.textContent = 'Edit Medicine';
                modal.style.display = 'flex';
                nameInput.focus();
            }
        } catch (err) {
            alert('Could not load medicine details. Please try again.');
        }
    };

    window.closeReminderModal = function () {
        modal.style.display = 'none';
    };

    if (cancelModalBtn) cancelModalBtn.addEventListener('click', window.closeReminderModal);

    // Close on backdrop click
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) window.closeReminderModal();
        });
    }

    // ── Form submit: Add or Update medicine ───────────────────────────────────
    if (reminderForm) {
        const submitBtn = reminderForm.querySelector('button[type="submit"]');

        reminderForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const isEdit = idInput.value !== '';
            let mealPref = 'Before Food';
            const mealRadios = document.getElementsByName('medicine-meal');
            for (let r of mealRadios) { if (r.checked) mealPref = r.value; }

            const alarmCheck = document.getElementById('medicine-alarm');
            const alarmEnabled = alarmCheck ? alarmCheck.checked : true;

            const reminderData = {
                name: nameInput.value.trim(),
                dosage: dosageInput.value.trim(),
                date: dateInput.value,
                time: formatTime12h(timeInput.value),
                meal: mealPref,
                alarm: alarmEnabled
            };

            if (submitBtn) { submitBtn.textContent = 'Saving...'; submitBtn.disabled = true; }

            try {
                if (isEdit) {
                    await API.updateMedicine(idInput.value, reminderData);
                } else {
                    await API.addMedicine(reminderData);
                }

                window.closeReminderModal();
                if (window.renderDashboard) await window.renderDashboard();
                if (window.rescheduleAllAlarms) window.rescheduleAllAlarms();
            } catch (err) {
                alert(err.message || 'Failed to save reminder. Please try again.');
            } finally {
                if (submitBtn) { submitBtn.textContent = 'Save Reminder'; submitBtn.disabled = false; }
            }
        });
    }
});
