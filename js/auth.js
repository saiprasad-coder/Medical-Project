/**
 * auth.js
 * Frontend authentication for DoseCare.
 * Uses DoseCareAPI (api.js) to communicate with the Express backend.
 */

document.addEventListener('DOMContentLoaded', () => {

    const currentPath = window.location.pathname;
    const isDashboardPage = currentPath.endsWith('dashboard.html');

    const hasToken = !!localStorage.getItem('doseCare_token');
    const isLoggedIn = localStorage.getItem('doseCare_loggedIn') === 'true' && hasToken;

    // If loggedIn flag is set but token is missing (stale session from old auth),
    // clear everything and force re-login through the API
    if (localStorage.getItem('doseCare_loggedIn') === 'true' && !hasToken) {
        localStorage.removeItem('doseCare_loggedIn');
        localStorage.removeItem('doseCare_userName');
    }

    // ── Route Protection ──────────────────────────────────────────────────────
    if (isDashboardPage && !isLoggedIn) {
        window.location.replace('index.html');
        return;
    }

    if (!isDashboardPage && isLoggedIn) {
        window.location.replace('dashboard.html');
        return;
    }


    // ── Login Logic (index.html) ──────────────────────────────────────────────
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        const loginBtn = loginForm.querySelector('button[type="submit"]');
        const errorMsg = document.getElementById('login-error') || createErrorEl(loginForm);

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();

            if (!email || !password) {
                showError(errorMsg, 'Please enter both your email and password.');
                return;
            }

            if (loginBtn) { loginBtn.textContent = 'Signing in...'; loginBtn.disabled = true; }
            errorMsg.style.display = 'none';

            try {
                await window.DoseCareAPI.login(email, password);
                window.location.href = 'dashboard.html';
            } catch (err) {
                showError(errorMsg, err.message || 'Login failed. Please check your credentials.');
                if (loginBtn) { loginBtn.textContent = 'Sign In'; loginBtn.disabled = false; }
            }
        });
    }

    // ── Signup Logic (signup.html) ────────────────────────────────────────────
    const signupForm = document.getElementById('signup-form');

    if (signupForm) {
        const signupBtn = signupForm.querySelector('button[type="submit"]');
        const errorMsg = document.getElementById('signup-error') || createErrorEl(signupForm);

        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const name = document.getElementById('name')?.value.trim() || '';
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();

            if (!email || !password) {
                showError(errorMsg, 'Please fill in all fields.');
                return;
            }

            if (signupBtn) { signupBtn.textContent = 'Creating account...'; signupBtn.disabled = true; }
            errorMsg.style.display = 'none';

            try {
                await window.DoseCareAPI.register(name || email.split('@')[0], email, password);
                window.location.href = 'dashboard.html';
            } catch (err) {
                showError(errorMsg, err.message || 'Registration failed. Please try again.');
                if (signupBtn) { signupBtn.textContent = 'Sign Up'; signupBtn.disabled = false; }
            }
        });
    }

    // ── Logout Logic (dashboard.html) ─────────────────────────────────────────
    const logoutBtn = document.getElementById('logout-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.DoseCareAPI.logout();
            window.location.replace('index.html');
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function showError(el, msg) {
        el.textContent = msg;
        el.style.display = 'block';
    }

    function createErrorEl(form) {
        const el = document.createElement('p');
        el.style.cssText = 'color:#e74c3c; font-size:13px; margin-top:10px; display:none;';
        form.appendChild(el);
        return el;
    }
});
