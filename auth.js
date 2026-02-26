/**
 * auth.js
 * Frontend-only authentication simulation for DoseCare.
 * Handles login, session management (via localStorage), and logout functionality.
 */

document.addEventListener('DOMContentLoaded', () => {

    // Determine which page the user is currently on
    const currentPath = window.location.pathname;
    const isDashboardPage = currentPath.endsWith('dashboard.html');

    // Check if the user is "logged in" by looking for the flag in localStorage
    const isLoggedIn = localStorage.getItem('doseCare_loggedIn') === 'true';

    // ==========================================
    // 1. Route Protection
    // ==========================================

    // If user is on dashboard but NOT logged in, kick them back to index.html
    if (isDashboardPage && !isLoggedIn) {
        window.location.replace('index.html');
        return; // Stop execution
    }

    // If user is on login page (or root) and IS logged in, skip login and go to dashboard
    if (!isDashboardPage && isLoggedIn) {
        window.location.replace('dashboard.html');
        return; // Stop execution
    }


    // ==========================================
    // 2. Login Logic (index.html)
    // ==========================================
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            // Prevent the default form submission (page reload)
            event.preventDefault();

            // Get input fields
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');

            // Basic validation: Check if fields are not empty
            if (emailInput.value.trim() !== '' && passwordInput.value.trim() !== '') {
                // Extract part of email before @ to use as name
                const emailParts = emailInput.value.split('@');
                let userName = emailParts[0];
                userName = userName.charAt(0).toUpperCase() + userName.slice(1); // Capitalize

                // Save login state and name in localStorage
                localStorage.setItem('doseCare_loggedIn', 'true');
                localStorage.setItem('doseCare_userName', userName);

                // Redirect to the dashboard page
                window.location.href = 'dashboard.html';
            } else {
                // This shouldn't trigger if HTML 'required' attributes are working,
                // but it's a good fallback validation.
                alert('Please enter both your email and password.');
            }
        });
    }


    // ==========================================
    // 3. Logout Logic (dashboard.html)
    // ==========================================
    const logoutBtn = document.getElementById('logout-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Remove the login state from localStorage
            localStorage.removeItem('doseCare_loggedIn');

            // Redirect back to the login page
            window.location.replace('index.html');
        });
    }

});
