// ============================================================
//  LOGIN.JS — Airport Ground Operations Management System
//  Handles: Login tab, Register tab, form validation, JWT auth
// ============================================================

const API_BASE_LOGIN = (() => {
    const devOrigins = ['localhost:5501', '127.0.0.1:5501', 'localhost:5500', '127.0.0.1:5500'];
    const isDev = devOrigins.some(o => window.location.host.startsWith(o.split(':')[0]) &&
                                       window.location.port === o.split(':')[1]);
    return (window.location.host.includes('localhost') || window.location.host.includes('127.0.0.1'))
        ? 'http://127.0.0.1:8000/api'
        : (window.location.origin + '/api');
})();

// ── Tab switching ────────────────────────────────────────────
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.form-panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Panel`).classList.add('active');
    clearMessages();
}

// ── Message helpers ──────────────────────────────────────────
function showError(msg, panelId) {
    const el = document.querySelector(`#${panelId} .error-msg`);
    if (el) { el.textContent = msg; el.classList.add('visible'); }
}
function showSuccess(msg, panelId) {
    const el = document.querySelector(`#${panelId} .success-msg`);
    if (el) { el.textContent = msg; el.classList.add('visible'); }
}
function clearMessages() {
    document.querySelectorAll('.error-msg, .success-msg').forEach(el => {
        el.classList.remove('visible');
        el.textContent = '';
    });
}

// ── Password toggle ──────────────────────────────────────────
function togglePassword(btnEl) {
    const input = btnEl.previousElementSibling;
    if (input.type === 'password') {
        input.type = 'text';
        btnEl.textContent = '🙈';
    } else {
        input.type = 'password';
        btnEl.textContent = '👁';
    }
}

// ── Loading state ────────────────────────────────────────────
function setLoading(btn, loading) {
    if (loading) {
        btn.disabled = true;
        btn.dataset.orig = btn.textContent;
        btn.innerHTML = '<span class="spinner"></span>Please wait…';
    } else {
        btn.disabled = false;
        btn.textContent = btn.dataset.orig || btn.textContent;
    }
}

// ── LOGIN ────────────────────────────────────────────────────
async function handleLogin(e) {
    e.preventDefault();
    clearMessages();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');

    if (!username || !password) {
        showError('Please enter your username and password.', 'loginPanel');
        return;
    }

    setLoading(btn, true);

    try {
        const res = await fetch(`${API_BASE_LOGIN}/token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (res.ok) {
            // Store tokens
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);

            // Fetch user profile to store role
            try {
                const profileRes = await fetch(`${API_BASE_LOGIN}/accounts/profile/`, {
                    headers: { 'Authorization': 'Bearer ' + data.access }
                });
                if (profileRes.ok) {
                    const profile = await profileRes.json();
                    localStorage.setItem('user_role', profile.role || '');
                    localStorage.setItem('username', profile.username || username);
                }
            } catch (_) { /* non-critical */ }

            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            const msg = data.detail || data.non_field_errors?.[0] ||
                        Object.values(data)[0]?.[0] || 'Invalid username or password.';
            showError(msg, 'loginPanel');
        }
    } catch (err) {
        showError('Cannot connect to server. Is the backend running?', 'loginPanel');
    } finally {
        setLoading(btn, false);
    }
}

// ── REGISTER ─────────────────────────────────────────────────
async function handleRegister(e) {
    e.preventDefault();
    clearMessages();

    const username  = document.getElementById('regUsername').value.trim();
    const email     = document.getElementById('regEmail').value.trim();
    const password  = document.getElementById('regPassword').value;
    const password2 = document.getElementById('regPassword2').value;
    const role      = document.getElementById('regRole').value;
    const phone     = document.getElementById('regPhone').value.trim();
    const btn       = document.getElementById('registerBtn');

    // Client-side validation
    if (!username || !email || !password || !role) {
        showError('Please fill in all required fields.', 'registerPanel');
        return;
    }
    if (password !== password2) {
        showError('Passwords do not match.', 'registerPanel');
        return;
    }
    if (password.length < 8) {
        showError('Password must be at least 8 characters.', 'registerPanel');
        return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
        showError('Please enter a valid email address.', 'registerPanel');
        return;
    }

    setLoading(btn, true);

    try {
        const body = { username, email, password, role };
        if (phone) body.phone = phone;

        const res = await fetch(`${API_BASE_LOGIN}/accounts/register/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await res.json();

        if (res.ok || res.status === 201) {
            showSuccess('Account created! You can now log in.', 'registerPanel');
            document.getElementById('registerForm').reset();
            // Auto-switch to login after 1.5s
            setTimeout(() => {
                switchTab('login');
                document.getElementById('loginUsername').value = username;
            }, 1500);
        } else {
            // Flatten DRF error object
            let msg = 'Registration failed.';
            if (data && typeof data === 'object') {
                const first = Object.entries(data)[0];
                if (first) {
                    const [field, err] = first;
                    const errText = Array.isArray(err) ? err[0] : String(err);
                    msg = field === 'non_field_errors' ? errText : `${field}: ${errText}`;
                }
            }
            showError(msg, 'registerPanel');
        }
    } catch (err) {
        showError('Cannot connect to server. Is the backend running?', 'registerPanel');
    } finally {
        setLoading(btn, false);
    }
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, skip to dashboard
    if (localStorage.getItem('access_token')) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Attach form listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);

    // Default tab
    switchTab('login');
});