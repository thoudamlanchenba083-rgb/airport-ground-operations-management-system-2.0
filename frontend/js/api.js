const API_BASE = 'http://127.0.0.1:8000/api';

const Auth = {
    getToken: () => localStorage.getItem('access_token'),
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
                body: JSON.stringify({ refresh })
            }).finally(() => {
                localStorage.clear();
                window.location.href = 'index.html';
            });
        } else {
            localStorage.clear();
            window.location.href = 'index.html';
        }
    },
    isLoggedIn: () => !!localStorage.getItem('access_token'),
    requireAuth: () => {
        if (!localStorage.getItem('access_token')) {
            window.location.href = 'index.html';
        }
    }
};

async function refreshAccessToken() {
    const refresh = Auth.getRefresh();
    if (!refresh) return false;
    try {
        const res = await fetch(`${API_BASE}/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh })
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

let isRedirecting = false;

async function apiFetch(endpoint, options = {}) {
    if (isRedirecting) return null;

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + Auth.getToken(),
        ...options.headers,
    };

    let res = await fetch(API_BASE + endpoint, { ...options, headers });

    if (res.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            headers['Authorization'] = 'Bearer ' + Auth.getToken();
            res = await fetch(API_BASE + endpoint, { ...options, headers });
        } else {
            if (!isRedirecting) {
                isRedirecting = true;
                localStorage.clear();
                window.location.href = 'index.html';
            }
            return null;
        }
    }

    if (res.ok) {
        const text = await res.text();
        return text ? JSON.parse(text) : null;
    }

    return null;
}

function Pagination({ next, previous, onNext, onPrev, page, total, pageSize }) {
    const totalPages = Math.ceil(total / pageSize) || 1;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: '1rem', padding: '0.5rem 0'
        }}>
            <button
                onClick={onPrev}
                disabled={!previous}
                style={{
                    padding: '6px 16px', borderRadius: '6px', border: '1px solid #ccc',
                    background: previous ? '#fff' : '#f5f5f5',
                    cursor: previous ? 'pointer' : 'not-allowed',
                    color: previous ? '#333' : '#aaa'
                }}>
                ← Prev
            </button>
            <span style={{ fontSize: '0.85rem', color: '#666' }}>
                Page {page} of {totalPages} &nbsp;·&nbsp; {total} total
            </span>
            <button
                onClick={onNext}
                disabled={!next}
                style={{
                    padding: '6px 16px', borderRadius: '6px', border: '1px solid #ccc',
                    background: next ? '#fff' : '#f5f5f5',
                    cursor: next ? 'pointer' : 'not-allowed',
                    color: next ? '#333' : '#aaa'
                }}>
                Next →
            </button>
        </div>
    );
}