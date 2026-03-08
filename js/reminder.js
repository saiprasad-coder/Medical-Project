/**
 * reminder.js
 * Handles alarm scheduling and browser notifications for DoseCare.
 */

(function () {
    let activeAlarms = {}; // Store setTimeout IDs by reminder ID

    async function requestNotificationPermission() {
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notification");
            return false;
        }
        if (Notification.permission === "granted") return true;
        if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            return permission === "granted";
        }
        return false;
    }

    function showNotification(reminder) {
        const title = "DoseCare Reminder";
        const options = {
            body: `Time to take ${reminder.name} (${reminder.dosage}) - ${reminder.meal}`,
            icon: '../assets/images/dosecarelogo.png'
        };

        if (Notification.permission === "granted") {
            new Notification(title, options);
        } else {
            // Fallback UX
            alert(`⏰ REMINDER: Time to take ${reminder.name} (${reminder.dosage}) - ${reminder.meal}`);
        }

        // Play alarm sound if exists
        const audio = new Audio('../assets/sounds/alarm.mp3');
        audio.play().catch(e => console.log("Audio play failed:", e));
    }

    function convertTo24h(time12h) {
        try {
            const [timeStart, period] = time12h.split(' ');
            let [hours, minutes] = timeStart.split(':');
            if (period === 'PM' && hours !== '12') hours = String(parseInt(hours) + 12);
            if (period === 'AM' && hours === '12') hours = '00';
            return `${hours.padStart(2, '0')}:${minutes}`;
        } catch (e) {
            return '00:00';
        }
    }

    window.rescheduleAllAlarms = function () {
        const Storage = window.DoseCareStorage;
        if (!Storage) return;

        // Clear existing timers
        Object.values(activeAlarms).forEach(timerId => clearTimeout(timerId));
        activeAlarms = {};

        const reminders = Storage.getReminders();
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        reminders.forEach(reminder => {
            if (reminder.alarm !== false && reminder.status === 'upcoming') {
                const reminderDateTime = new Date(`${reminder.date} ${convertTo24h(reminder.time)}`);
                const diff = reminderDateTime - now;

                if (diff > 0) {
                    const timerId = setTimeout(() => {
                        showNotification(reminder);
                        delete activeAlarms[reminder.id];
                    }, diff);
                    activeAlarms[reminder.id] = timerId;
                }
            }
        });
    };

    window.cancelAlarm = function (id) {
        if (activeAlarms[id]) {
            clearTimeout(activeAlarms[id]);
            delete activeAlarms[id];
        }
    };

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        window.rescheduleAllAlarms();
        requestNotificationPermission();
    });
})();
