/**
 * api.js
 * DoseCare API Client — replaces direct localStorage CRUD calls.
 * All requests go to the Express backend at http://localhost:5000.
 *
 * Usage (auto-loaded globally as window.DoseCareAPI):
 *   const medicines = await DoseCareAPI.getMedicines();
 *   await DoseCareAPI.addMedicine({ name, dosage, date, time, meal, alarm });
 *   await DoseCareAPI.updateMedicine(id, { status: 'taken' });
 *   await DoseCareAPI.deleteMedicine(id);
 *   await DoseCareAPI.toggleAutoOrder(id, true);
 */

const BASE_URL = 'http://localhost:5000/api';

// ─── Auth Header Helper ───────────────────────────────────────────────────────
function getAuthHeaders() {
    const token = localStorage.getItem('doseCare_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

// ─── Generic fetch wrapper with unified error handling ────────────────────────
async function apiFetch(path, options = {}) {
    try {
        const response = await fetch(BASE_URL + path, {
            headers: getAuthHeaders(),
            ...options
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `API Error: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error(`[DoseCare API] ${options.method || 'GET'} ${path}:`, error.message);
        throw error;
    }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function register(name, email, password) {
    const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
    });
    // Persist JWT and user info
    localStorage.setItem('doseCare_token', data.token);
    localStorage.setItem('doseCare_userName', data.user.name);
    localStorage.setItem('doseCare_loggedIn', 'true');
    return data;
}

async function login(email, password) {
    const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    // Persist JWT and user info
    localStorage.setItem('doseCare_token', data.token);
    localStorage.setItem('doseCare_userName', data.user.name);
    localStorage.setItem('doseCare_loggedIn', 'true');
    return data;
}

function logout() {
    localStorage.removeItem('doseCare_token');
    localStorage.removeItem('doseCare_loggedIn');
    localStorage.removeItem('doseCare_userName');
}

// ─── Medicines ────────────────────────────────────────────────────────────────

async function getMedicines() {
    return await apiFetch('/medicines');
}

async function addMedicine(medicineData) {
    return await apiFetch('/medicines', {
        method: 'POST',
        body: JSON.stringify(medicineData)
    });
}

async function updateMedicine(id, updates) {
    return await apiFetch(`/medicines/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
    });
}

async function deleteMedicine(id) {
    return await apiFetch(`/medicines/${id}`, {
        method: 'DELETE'
    });
}

async function toggleAutoOrder(id, enabled) {
    return await apiFetch(`/medicines/${id}/auto-order`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled })
    });
}

// ─── Expose globally ──────────────────────────────────────────────────────────
window.DoseCareAPI = {
    register,
    login,
    logout,
    getMedicines,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    toggleAutoOrder
};
