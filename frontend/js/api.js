const API_BASE = (() => {
    // In production the frontend is served by Django on the same origin.
    // In local dev (Live Server on :5501) point to the Django dev server.
    const devOrigins = ['localhost:5501', '127.0.0.1:5501'];
    const isDev = devOrigins.some(o => window.location.host === o);
    return isDev ? 'http://127.0.0.1:8000/api' : (window.location.origin + '/api');
})();

// ─── Auth ────────────────────────────────────────────────────────────────────
const Auth = {
    getToken:   () => localStorage.getItem('access_token'),
    getRefresh: () => localStorage.getItem('refresh_token'),

    save: (access, refresh) => {
        localStorage.setItem('access_token', access);
        if (refresh) localStorage.setItem('refresh_token', refresh);
    },

    logout: () => {
        const refresh = localStorage.getItem('refresh_token');
        if (refresh) {
            fetch(`${API_BASE}/accounts/logout/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh }),
            }).finally(() => {
                localStorage.clear();
                window.location.href = 'landing.html';
            });
        } else {
            localStorage.clear();
            window.location.href = 'landing.html';
        }
    },

    isLoggedIn:  () => !!localStorage.getItem('access_token'),

    requireAuth: () => {
        if (!localStorage.getItem('access_token')) {
            window.location.href = 'landing.html';
        }
    },
};

// ─── Token refresh ───────────────────────────────────────────────────────────
async function refreshAccessToken() {
    const refresh = Auth.getRefresh();
    if (!refresh) return false;
    try {
        const res = await fetch(`${API_BASE}/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
        });
        if (res.ok) {
            const data = await res.json();
            Auth.save(data.access, data.refresh || refresh);
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

// ─── Toast notifications ─────────────────────────────────────────────────────
(function injectToastStyles() {
    if (document.getElementById('toast-style')) return;
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = `
        #toast-container{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;}
        .toast{padding:12px 18px;border-radius:8px;font-size:0.88rem;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.2);
               opacity:0;transform:translateY(8px);transition:all .25s ease;max-width:320px;line-height:1.4;}
        .toast.show{opacity:1;transform:translateY(0);}
        .toast.toast-error  {background:#e74c3c;}
        .toast.toast-success{background:#27ae60;}
        .toast.toast-warn   {background:#f39c12;}
    `;
    document.head.appendChild(s);
    const el = document.createElement('div');
    el.id = 'toast-container';
    document.body.appendChild(el);
})();

function showToast(message, type = 'error', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('show'));
    });
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ─── Core fetch wrapper ──────────────────────────────────────────────────────
let isRedirecting = false;

async function apiFetch(endpoint, options = {}) {
    if (isRedirecting) return null;

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + Auth.getToken(),
        ...options.headers,
    };

    let res;
    try {
        res = await fetch(API_BASE + endpoint, { ...options, headers });
    } catch (err) {
        showToast('Network error — is the server running?', 'error');
        return null;
    }

    // Auto-refresh on 401
    if (res.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            headers['Authorization'] = 'Bearer ' + Auth.getToken();
            try {
                res = await fetch(API_BASE + endpoint, { ...options, headers });
            } catch {
                showToast('Network error after token refresh.', 'error');
                return null;
            }
        } else {
            if (!isRedirecting) {
                isRedirecting = true;
                localStorage.clear();
                window.location.href = 'landing.html';
            }
            return null;
        }
    }

    // Success (includes 204 No Content on DELETE)
    if (res.ok) {
        const text = await res.text();
        return text ? JSON.parse(text) : true;
    }

    // Surface errors to user
    let errorMsg = `Request failed (${res.status})`;
    try {
        const errData = await res.json();
        const first = Object.values(errData)[0];
        if (first) errorMsg = Array.isArray(first) ? first[0] : String(first);
    } catch { /* ignore parse errors */ }

    if (res.status === 403) {
        showToast('Permission denied — admin access required.', 'warn');
    } else if (res.status === 404) {
        showToast('Resource not found.', 'warn');
    } else if (res.status >= 500) {
        showToast('Server error — please try again.', 'error');
    } else {
        showToast(errorMsg, 'error');
    }

    return null;
}
