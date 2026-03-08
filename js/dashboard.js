/**
 * dashboard.js
 * Handles rendering, status actions, alarm scheduling, and navigation.
 * Now uses DoseCareAPI (api.js) to fetch/update data from the backend.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const API = window.DoseCareAPI;
    if (!API) { console.error('DoseCareAPI not loaded.'); return; }

    // --- 1. User Personalization ---
    const userName = localStorage.getItem('doseCare_userName') || 'User';
    const greetingNameEl = document.getElementById('greeting-name');
    if (greetingNameEl) greetingNameEl.textContent = userName;
    const profileNameDisplay = document.getElementById('profile-name-display');
    if (profileNameDisplay) profileNameDisplay.textContent = userName;

    // --- 2. Time helpers ---
    function convertTo24h(time12h) {
        try {
            const [timeStart, period] = time12h.split(' ');
            let [hours, minutes] = timeStart.split(':');
            if (period === 'PM' && hours !== '12') hours = String(parseInt(hours) + 12);
            if (period === 'AM' && hours === '12') hours = '00';
            return `${hours.padStart(2, '0')}:${minutes}`;
        } catch (e) { return '00:00'; }
    }

    // --- 3. UI Elements ---
    const reminderContainer = document.getElementById('reminder-container');
    const totalCountEl = document.getElementById('count-total');
    const todayCountEl = document.getElementById('count-today');
    const missedCountEl = document.getElementById('count-missed');

    // In-memory store for medicines (refreshed on each renderDashboard call)
    let _medicines = [];

    // --- 4. Render Dashboard ---
    window.renderDashboard = async function () {
        if (!reminderContainer) return;

        // Show loading state
        reminderContainer.innerHTML = `<p style="text-align:center;color:#6c757d;padding:20px;">Loading reminders...</p>`;

        try {
            _medicines = await API.getMedicines();
        } catch (err) {
            reminderContainer.innerHTML = `<p style="text-align:center;color:#e74c3c;padding:20px;">⚠️ Could not load reminders. Is the server running?</p>`;
            return;
        }

        reminderContainer.innerHTML = '';
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const sortedMedicines = [..._medicines].sort((a, b) => {
            const timeA = new Date(`${a.date} ${convertTo24h(a.time)}`);
            const timeB = new Date(`${b.date} ${convertTo24h(b.time)}`);
            return timeA - timeB;
        });

        let upcomingCount = 0;
        let missedCount = 0;
        sortedMedicines.forEach(r => {
            if (r.status === 'upcoming') upcomingCount++;
            if (r.status === 'missed') missedCount++;
        });

        const toShow = sortedMedicines.filter(r =>
            r.date === todayStr || (r.status === 'missed' && r.date <= todayStr)
        );

        if (toShow.length === 0) {
            reminderContainer.innerHTML = `<p style="text-align:center;color:#6c757d;padding:20px;">No reminders for today. Add a new dose to get started.</p>`;
        }

        toShow.forEach(reminder => {
            let statusClass = '', badgeClass = '', badgeText = '';
            if (reminder.status === 'taken') { statusClass = 'status--taken'; badgeClass = 'badge--success'; badgeText = 'Taken'; }
            else if (reminder.status === 'upcoming') { statusClass = 'status--upcoming'; badgeClass = 'badge--pending'; badgeText = 'Upcoming'; }
            else if (reminder.status === 'missed') { statusClass = 'status--missed'; badgeClass = 'badge--danger'; badgeText = 'Missed'; }

            // Use MongoDB _id as identifier
            const reminderId = reminder._id || reminder.id;

            let controlsHtml = '';
            if (reminder.status === 'upcoming') {
                controlsHtml = `
                    <div class="reminder-controls">
                        <button class="action-btn action-take" onclick="updateStatus('${reminderId}', 'taken')">Take</button>
                        <button class="action-btn action-skip" onclick="updateStatus('${reminderId}', 'missed')">Skip</button>
                    </div>`;
            } else {
                controlsHtml = `
                    <div class="reminder-controls">
                        <button class="action-btn" style="background:#f8f9fa;color:#666;" onclick="undoAction('${reminderId}')">Undo</button>
                    </div>`;
            }

            const displayDate = reminder.date === todayStr ? 'Today' : reminder.date;
            const alarmIcon = reminder.alarm !== false ? '🔔' : '🔕';

            const article = document.createElement('article');
            article.className = `reminder-item ${statusClass}`;
            article.innerHTML = `
                <div class="reminder-details">
                    <h4 class="medicine-name">
                        ${reminder.name}
                        <span style="font-weight:normal;font-size:12px;margin-left:5px;">${alarmIcon}</span>
                        <a href="#" onclick="openEditModal('${reminderId}', event)" class="edit-link">Edit</a>
                        <a href="#" onclick="deleteReminder('${reminderId}', event)" class="delete-link">Delete</a>
                    </h4>
                    <p class="medicine-dosage">${reminder.dosage} • ${reminder.meal}</p>
                </div>
                <div class="reminder-schedule" style="flex-direction:column;align-items:flex-end;gap:5px;">
                    <span class="schedule-time" style="font-size:13px;color:#6c757d;">${displayDate}</span>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span class="schedule-time">${reminder.time}</span>
                        <span class="status-badge ${badgeClass}" role="status">${badgeText}</span>
                    </div>
                </div>
                ${controlsHtml}
            `;
            reminderContainer.appendChild(article);
        });

        if (totalCountEl) totalCountEl.textContent = _medicines.length;
        if (todayCountEl) todayCountEl.textContent = upcomingCount;
        if (missedCountEl) missedCountEl.textContent = missedCount;
    };

    // --- 5. Status Actions ---
    window.updateStatus = async function (id, newStatus) {
        try {
            await API.updateMedicine(id, { status: newStatus });
            // Save undo info in memory
            const old = _medicines.find(m => (m._id || m.id) === id);
            if (old) localStorage.setItem('doseCare_lastAction', JSON.stringify({ id, oldStatus: old.status }));
            window.renderDashboard();
        } catch (err) {
            alert('Failed to update reminder status. Please try again.');
        }
    };

    window.deleteReminder = async function (id, e) {
        if (e) e.preventDefault();
        if (confirm('Are you sure you want to delete this reminder?')) {
            try {
                await API.deleteMedicine(id);
                window.renderDashboard();
            } catch (err) {
                alert('Failed to delete reminder. Please try again.');
            }
        }
    };

    window.undoAction = async function (id) {
        const lastAction = JSON.parse(localStorage.getItem('doseCare_lastAction') || 'null');
        if (lastAction && lastAction.id === id) {
            try {
                await API.updateMedicine(id, { status: lastAction.oldStatus });
                localStorage.removeItem('doseCare_lastAction');
                window.renderDashboard();
            } catch (err) {
                alert('Undo failed. Please try again.');
            }
        }
    };

    // --- 6. Auto Order Feature ---
    const autoOrderListEl = document.getElementById('auto-order-list');

    async function renderAutoOrders() {
        if (!autoOrderListEl) return;
        autoOrderListEl.innerHTML = `<p style="text-align:center;color:#6c757d;padding:20px;">Loading...</p>`;

        try {
            const medicines = await API.getMedicines();
            autoOrderListEl.innerHTML = '';

            if (medicines.length === 0) {
                autoOrderListEl.innerHTML = `<p style="text-align:center;color:#6c757d;padding:20px;">No medicines added yet.</p>`;
                return;
            }

            medicines.forEach(item => {
                const itemId = item._id || item.id;
                const article = document.createElement('article');
                article.className = 'reminder-item';
                article.style.marginBottom = '10px';
                article.innerHTML = `
                    <div class="reminder-details">
                        <h4 class="medicine-name">${item.name}</h4>
                        <p class="medicine-dosage">Auto-refill when 5 days supply remains</p>
                    </div>
                    <div class="reminder-controls" style="margin-left:auto;">
                        <label style="display:flex;align-items:center;cursor:pointer;font-size:14px;color:${item.autoOrderEnabled ? '#28a745' : '#6c757d'};">
                            <input type="checkbox" ${item.autoOrderEnabled ? 'checked' : ''}
                                   onchange="toggleAutoOrder('${itemId}', this.checked)"
                                   style="margin-right:8px;width:18px;height:18px;cursor:pointer;">
                            ${item.autoOrderEnabled ? 'Active' : 'Disabled'}
                        </label>
                    </div>
                `;
                autoOrderListEl.appendChild(article);
            });
        } catch (err) {
            autoOrderListEl.innerHTML = `<p style="text-align:center;color:#e74c3c;padding:20px;">⚠️ Could not load auto-orders.</p>`;
        }
    }

    window.toggleAutoOrder = async function (id, isEnabled) {
        try {
            await API.toggleAutoOrder(id, isEnabled);
            renderAutoOrders();
        } catch (err) {
            alert('Failed to update auto-order setting.');
        }
    };

    // --- 7. Navigation ---
    const navDashboard = document.getElementById('nav-dashboard');
    const navAutoOrder = document.getElementById('nav-auto-order');
    const navProfile = document.getElementById('nav-profile');
    const navAddReminder = document.getElementById('nav-add-reminder');
    const btnAddDose = document.getElementById('btn-add-dose');
    const dashboardView = document.getElementById('dashboard-active-view');
    const autoOrderView = document.getElementById('auto-order-view');
    const profileView = document.getElementById('profile-view');
    const headerGreeting = document.querySelector('.workspace-header');

    function switchView(viewName) {
        dashboardView.style.display = 'none';
        autoOrderView.style.display = 'none';
        profileView.style.display = 'none';
        if (headerGreeting) headerGreeting.style.display = 'none';
        navDashboard.classList.remove('nav-link--active');
        navAutoOrder.classList.remove('nav-link--active');
        navProfile.classList.remove('nav-link--active');

        if (viewName === 'auto-order') {
            autoOrderView.style.display = 'block';
            navAutoOrder.classList.add('nav-link--active');
            renderAutoOrders();
        } else if (viewName === 'profile') {
            profileView.style.display = 'block';
            navProfile.classList.add('nav-link--active');
        } else {
            dashboardView.style.display = 'block';
            if (headerGreeting) headerGreeting.style.display = 'block';
            navDashboard.classList.add('nav-link--active');
            window.renderDashboard();
        }
    }

    if (navDashboard) navDashboard.addEventListener('click', (e) => { e.preventDefault(); switchView('dashboard'); });
    if (navAutoOrder) navAutoOrder.addEventListener('click', (e) => { e.preventDefault(); switchView('auto-order'); });
    if (navProfile) navProfile.addEventListener('click', (e) => { e.preventDefault(); switchView('profile'); });

    if (navAddReminder) navAddReminder.addEventListener('click', (e) => { e.preventDefault(); if (window.openAddModal) window.openAddModal(e); });
    if (btnAddDose) btnAddDose.addEventListener('click', (e) => { e.preventDefault(); if (window.openAddModal) window.openAddModal(e); });

    // --- 8. Initial Boot ---
    window.renderDashboard();

    // Dynamic button/link styles
    const style = document.createElement('style');
    style.textContent = `
        .edit-link, .delete-link { font-size:12px; text-decoration:none; margin-left:8px; font-weight:normal; }
        .edit-link { color:#4fa9ff; }
        .delete-link { color:#ff6b6b; }
        .reminder-controls { display:flex; gap:5px; }
        .action-take { background:#28a745 !important; }
        .action-skip { background:#ffc107 !important; color:#000 !important; }
    `;
    document.head.appendChild(style);
});
