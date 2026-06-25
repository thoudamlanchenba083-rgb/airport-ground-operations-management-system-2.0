// shared api utilities - no imports needed
const API_BASE = 'http://127.0.0.1:8000/api';

const Auth = {
    getToken: () => localStorage.getItem('access_token'),
    getRefresh: () => localStorage.getItem('refresh_token'),
    save: (access, refresh) => {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
    },
    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = 'index.html';
    },
    isLoggedIn: () => !!localStorage.getItem('access_token'),
    requireAuth: () => {
        if (!localStorage.getItem('access_token')) {
            window.location.href = 'index.html';
        }
    }
};