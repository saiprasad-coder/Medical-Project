/**
 * dashboard.js
 * Handles all dynamic UI state, reminder CRUD, Auto Order toggles, and navigation for DoseCare Dashboard.
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. User Personalization & Profile ---
    const userName = localStorage.getItem('doseCare_userName') || 'User';

    // Greeting
    const greetingNameEl = document.getElementById('greeting-name');
    if (greetingNameEl) greetingNameEl.textContent = userName;

    // Profile View
    const profileNameDisplay = document.getElementById('profile-name-display');
    if (profileNameDisplay) profileNameDisplay.textContent = userName;


    // --- 2. State Management (Reminders) ---
    const defaultReminders = [
        { id: '1', name: 'Amoxicillin', dosage: '500mg', date: getTodayDateString(), time: '08:00 AM', meal: 'After Food', status: 'taken' },
        { id: '2', name: 'Vitamin D3', dosage: '1 pill', date: getTodayDateString(), time: '01:00 PM', meal: 'Before Food', status: 'upcoming' },
        { id: '3', name: 'Lisinopril', dosage: '10mg', date: getTodayDateString(), time: '07:00 AM', meal: 'Before Food', status: 'missed' }
    ];

    let reminders = JSON.parse(localStorage.getItem('doseCare_reminders'));
    if (!reminders) {
        reminders = defaultReminders;
        saveReminders();
    }

    function saveReminders() {
        localStorage.setItem('doseCare_reminders', JSON.stringify(reminders));
    }

    // Helper: get YYYY-MM-DD for today
    function getTodayDateString() {
        return new Date().toISOString().split('T')[0];
    }


    // --- 3. UI Rendering & Counts (Dashboard) ---
    const reminderContainer = document.getElementById('reminder-container');
    const totalCountEl = document.getElementById('count-total');
    const todayCountEl = document.getElementById('count-today');
    const missedCountEl = document.getElementById('count-missed');

    function renderDashboard() {
        if (!reminderContainer) return;
        reminderContainer.innerHTML = '';

        let upcomingCount = 0;
        let missedCount = 0;

        // Filter just today's (or missed) for the dashboard list?
        // For simplicity, we'll display all reminders but tally accurately
        const todayStr = getTodayDateString();

        if (reminders.length === 0) {
            reminderContainer.innerHTML = `<p style="text-align: center; color: #6c757d; padding: 20px;">You have no reminders. Add a new dose to get started.</p>`;
        }

        reminders.forEach(reminder => {
            // Tally counts (Total is total count of medicines)
            if (reminder.status === 'upcoming') upcomingCount++;
            if (reminder.status === 'missed') missedCount++;

            // Visual Status configuration
            let statusClass = '';
            let badgeClass = '';
            let badgeText = '';

            if (reminder.status === 'taken') {
                statusClass = 'status--taken';
                badgeClass = 'badge--success';
                badgeText = 'Taken';
            } else if (reminder.status === 'upcoming') {
                statusClass = 'status--upcoming';
                badgeClass = 'badge--pending';
                badgeText = 'Upcoming';
            } else if (reminder.status === 'missed') {
                statusClass = 'status--missed';
                badgeClass = 'badge--danger';
                badgeText = 'Missed';
            }

            // Build controls (No edit/take on missed)
            let controlsHtml = '';
            if (reminder.status === 'upcoming') {
                controlsHtml = `
                    <div class="reminder-controls" aria-label="Actions for ${reminder.name}">
                        <button class="action-btn action-take" onclick="updateStatus('${reminder.id}', 'taken')">Take</button>
                        <button class="action-btn action-skip" onclick="updateStatus('${reminder.id}', 'missed')">Skip</button>
                    </div>
                `;
            }

            // Edit button logic
            let editButtonHtml = '';
            if (reminder.status !== 'missed') {
                editButtonHtml = `<a href="#" onclick="openEditModal('${reminder.id}', event)" style="font-size: 13px; color: #4fa9ff; text-decoration: none; margin-left: 10px;">Edit</a>`;
            }

            // Format date for display
            let displayDate = reminder.date === todayStr ? 'Today' : reminder.date;

            // Construct Card
            const article = document.createElement('article');
            article.className = `reminder-item ${statusClass}`;
            article.innerHTML = `
                <div class="reminder-details">
                    <h4 class="medicine-name">${reminder.name} ${editButtonHtml}</h4>
                    <p class="medicine-dosage">${reminder.dosage} • ${reminder.meal}</p>
                </div>
                <div class="reminder-schedule" style="flex-direction: column; align-items: flex-end; gap: 5px;">
                    <span class="schedule-time" style="font-size:13px; color:#6c757d;">${displayDate}</span>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span class="schedule-time">${reminder.time}</span>
                        <span class="status-badge ${badgeClass}" role="status">${badgeText}</span>
                    </div>
                </div>
                ${controlsHtml}
            `;

            // Animation
            article.style.animation = "fadeIn 0.3s ease";
            reminderContainer.appendChild(article);
        });

        // Update Statistic Counts
        if (totalCountEl) totalCountEl.textContent = reminders.length;
        if (todayCountEl) todayCountEl.textContent = upcomingCount;
        if (missedCountEl) missedCountEl.textContent = missedCount;
    }

    window.updateStatus = function (id, newStatus) {
        const index = reminders.findIndex(r => r.id === id);
        if (index !== -1) {
            reminders[index].status = newStatus;
            saveReminders();
            renderDashboard();
        }
    };


    // --- 4. Auto Order Feature ---
    const defaultAutoOrders = [
        { id: 'ao1', name: 'Amoxicillin Base', enabled: true },
        { id: 'ao2', name: 'Vitamin D3 Supply', enabled: false },
        { id: 'ao3', name: 'Lisinopril Monthly', enabled: true }
    ];

    let autoOrders = JSON.parse(localStorage.getItem('doseCare_autoOrder'));
    if (!autoOrders) {
        autoOrders = defaultAutoOrders;
        saveAutoOrders();
    }

    function saveAutoOrders() {
        localStorage.setItem('doseCare_autoOrder', JSON.stringify(autoOrders));
    }

    const autoOrderListEl = document.getElementById('auto-order-list');

    function renderAutoOrders() {
        if (!autoOrderListEl) return;
        autoOrderListEl.innerHTML = '';

        autoOrders.forEach(item => {
            const article = document.createElement('article');
            article.className = `reminder-item`;
            article.style.marginBottom = '10px';
            article.innerHTML = `
                <div class="reminder-details">
                    <h4 class="medicine-name">${item.name}</h4>
                    <p class="medicine-dosage">Auto-refill when 5 days supply remains</p>
                </div>
                <div class="reminder-controls" style="margin-left:auto;">
                    <label style="display: flex; align-items: center; cursor: pointer; font-size: 14px; color: ${item.enabled ? '#28a745' : '#6c757d'};">
                        <input type="checkbox" ${item.enabled ? 'checked' : ''} 
                               onchange="toggleAutoOrder('${item.id}', this.checked)" 
                               style="margin-right: 8px; width:18px; height:18px; cursor:pointer;">
                        ${item.enabled ? 'Active' : 'Disabled'}
                    </label>
                </div>
            `;
            autoOrderListEl.appendChild(article);
        });
    }

    window.toggleAutoOrder = function (id, isEnabled) {
        const index = autoOrders.findIndex(a => a.id === id);
        if (index !== -1) {
            autoOrders[index].enabled = isEnabled;
            saveAutoOrders();
            renderAutoOrders(); // Re-render to update text colors nicely
        }
    };


    // --- 5. Navigation & Views ---
    const navDashboard = document.getElementById('nav-dashboard');
    const navAutoOrder = document.getElementById('nav-auto-order');
    const navProfile = document.getElementById('nav-profile');

    const dashboardView = document.getElementById('dashboard-active-view');
    const autoOrderView = document.getElementById('auto-order-view');
    const profileView = document.getElementById('profile-view');

    // Also Header Greeting
    const headerGreeting = document.querySelector('.workspace-header');

    function switchView(viewName) {
        // Reset all views & navs
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
            // Dashboard
            dashboardView.style.display = 'block';
            if (headerGreeting) headerGreeting.style.display = 'block'; // Show greeting only on dashboard
            navDashboard.classList.add('nav-link--active');
            renderDashboard();
        }
    }

    if (navDashboard) navDashboard.addEventListener('click', (e) => { e.preventDefault(); switchView('dashboard'); });
    if (navAutoOrder) navAutoOrder.addEventListener('click', (e) => { e.preventDefault(); switchView('auto-order'); });
    if (navProfile) navProfile.addEventListener('click', (e) => { e.preventDefault(); switchView('profile'); });


    // --- 6. Modal (Add / Edit Reminder) Logic ---
    const modal = document.getElementById('reminder-modal');
    const reminderForm = document.getElementById('reminder-form');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const modalTitle = document.getElementById('modal-title');

    const idInput = document.getElementById('reminder-id');
    const nameInput = document.getElementById('medicine-name');
    const dosageInput = document.getElementById('medicine-dosage');
    const dateInput = document.getElementById('medicine-date');
    const timeInput = document.getElementById('medicine-time');
    // meal radios are fetched live

    function openAddModal(e) {
        if (e) e.preventDefault();
        idInput.value = '';
        nameInput.value = '';
        dosageInput.value = '';
        dateInput.value = getTodayDateString();
        timeInput.value = '';

        // Reset radio
        const mealRadios = document.getElementsByName('medicine-meal');
        if (mealRadios.length) mealRadios[0].checked = true;

        modalTitle.textContent = 'Add New Medicine';
        modal.style.display = 'flex';
    }

    window.openEditModal = function (id, e) {
        if (e) e.preventDefault();
        const reminder = reminders.find(r => r.id === id);
        if (reminder) {
            idInput.value = reminder.id;
            nameInput.value = reminder.name;
            dosageInput.value = reminder.dosage;
            dateInput.value = reminder.date || getTodayDateString();

            // Set radio
            const mealRadios = document.getElementsByName('medicine-meal');
            for (let r of mealRadios) {
                if (r.value === reminder.meal) r.checked = true;
            }

            // Convert "08:00 AM" -> "08:00" for input type="time"
            let parsedTime = reminder.time;
            try {
                const [timeStart, period] = reminder.time.split(' ');
                let [hours, minutes] = timeStart.split(':');
                if (period === 'PM' && hours !== '12') hours = String(parseInt(hours) + 12);
                if (period === 'AM' && hours === '12') hours = '00';
                parsedTime = `${hours.padStart(2, '0')}:${minutes}`;
            } catch (e) { }

            timeInput.value = parsedTime;
            modalTitle.textContent = 'Edit Medicine';
            modal.style.display = 'flex';
        }
    };

    function closeModal() {
        modal.style.display = 'none';
    }

    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

    function formatTime12h(timeStr) {
        let [hours, minutes] = timeStr.split(':');
        hours = parseInt(hours);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }

    // Handle Form Submit
    if (reminderForm) {
        reminderForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const isEdit = idInput.value !== '';

            // Get Meal Preference
            let mealPref = 'Before Food';
            const mealRadios = document.getElementsByName('medicine-meal');
            for (let r of mealRadios) {
                if (r.checked) mealPref = r.value;
            }

            if (isEdit) {
                const index = reminders.findIndex(r => r.id === idInput.value);
                if (index !== -1) {
                    reminders[index].name = nameInput.value;
                    reminders[index].dosage = dosageInput.value;
                    reminders[index].date = dateInput.value;
                    reminders[index].time = formatTime12h(timeInput.value);
                    reminders[index].meal = mealPref;
                }
            } else {
                const newReminder = {
                    id: String(Date.now()),
                    name: nameInput.value,
                    dosage: dosageInput.value,
                    date: dateInput.value,
                    time: formatTime12h(timeInput.value),
                    meal: mealPref,
                    status: 'upcoming'
                };
                reminders.push(newReminder);
            }

            saveReminders();
            // Go to dashboard to see new reminder if not there
            switchView('dashboard');
            closeModal();
        });
    }

    // Global Add Navbar hook
    const addNavBtn = document.getElementById('nav-add-reminder');
    if (addNavBtn) addNavBtn.addEventListener('click', openAddModal);

    // Section Add Button ("Add New Dose")
    document.body.addEventListener('click', (e) => {
        if (e.target && e.target.textContent === 'Add New Dose') {
            openAddModal(e);
        }
    });

    // --- 7. Initial Boot ---
    renderDashboard();

});
