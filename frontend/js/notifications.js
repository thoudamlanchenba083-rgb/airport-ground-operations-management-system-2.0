(function () {
    const dark = localStorage.getItem('theme') !== 'light';
    document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
    const btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = dark ? '☀ Light' : '🌙 Dark';
})();

function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    document.getElementById('themeBtn').textContent = isDark ? '🌙 Dark' : '☀ Light';
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('mobile-open');
    document.getElementById('overlay').classList.toggle('open');
}

Auth.requireAuth();

let allNotifications = [];
let currentFilter = 'all';

const TYPE_CLASSES = {
    FLIGHT: 'badge-info', MAINTENANCE: 'badge-warning',
    BAGGAGE: 'badge-warning', GENERAL: 'badge-success',
};

function typeBadge(type) {
    return `<span class="badge ${TYPE_CLASSES[type] || 'badge-info'}">${type}</span>`;
}

async function loadNotifications() {
    const tbody = document.getElementById('notifTbody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;padding:30px;">Loading…</td></tr>';

    const data = await apiFetch('/notifications/');
    allNotifications = data ? (data.results || data) : [];

    const unread = allNotifications.filter(n => !n.is_read).length;
    document.getElementById('countTotal').textContent  = allNotifications.length;
    document.getElementById('countUnread').textContent = unread;
    document.getElementById('countRead').textContent   = allNotifications.length - unread;
    document.getElementById('markAllBtn').style.display = unread > 0 ? 'inline-block' : 'none';

    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('notifTbody');
    const filtered = allNotifications.filter(n => {
        if (currentFilter === 'unread') return !n.is_read;
        if (currentFilter === 'read')   return  n.is_read;
        return true;
    });

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;padding:30px;">No notifications found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(n => `
        <tr style="${!n.is_read ? 'background:rgba(52,152,219,0.06);' : ''}">
            <td style="max-width:350px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${n.message || ''}</td>
            <td>${typeBadge(n.type)}</td>
            <td>${n.is_read
                ? '<span class="badge badge-success">Read</span>'
                : '<span class="badge badge-warning">Unread</span>'}</td>
            <td>${n.created_at ? new Date(n.created_at).toLocaleString() : '—'}</td>
            <td style="white-space:nowrap;">
                ${!n.is_read ? `<button class="btn btn-success" style="margin-right:6px" onclick="markRead(${n.id})">✓</button>` : ''}
                <button class="btn btn-primary" style="margin-right:6px" onclick='openModal(${JSON.stringify(n)})'>Edit</button>
                <button class="btn btn-danger" onclick="deleteItem(${n.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function setFilter(f) {
    currentFilter = f;
    ['all','unread','read'].forEach(name => {
        const btn = document.getElementById('filter' + name.charAt(0).toUpperCase() + name.slice(1));
        btn.className = 'btn' + (name === f ? ' btn-primary' : '');
        if (name !== f) btn.style.cssText = 'background:#eee;color:#333;';
        else btn.style.cssText = '';
    });
    renderTable();
}

async function markRead(id) {
    const n = allNotifications.find(x => x.id === id);
    if (!n) return;
    await apiFetch(`/notifications/${id}/`, {
        method: 'PUT',
        body: JSON.stringify({ ...n, is_read: true }),
    });
    loadNotifications();
}

async function markAllRead() {
    const unread = allNotifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n =>
        apiFetch(`/notifications/${n.id}/`, {
            method: 'PUT',
            body: JSON.stringify({ ...n, is_read: true }),
        })
    ));
    loadNotifications();
}

async function deleteItem(id) {
    if (!confirm('Delete this notification?')) return;
    await apiFetch(`/notifications/${id}/`, { method: 'DELETE' });
    loadNotifications();
}

function openModal(item) {
    document.getElementById('modalTitle').textContent = item ? 'Edit Notification' : 'New Notification';
    document.getElementById('editId').value   = item ? item.id : '';
    document.getElementById('f_message').value = item ? item.message || '' : '';
    document.getElementById('f_type').value    = item ? item.type || 'GENERAL' : 'GENERAL';
    document.getElementById('f_is_read').checked = item ? !!item.is_read : false;
    document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

async function saveNotification() {
    const id = document.getElementById('editId').value;
    const payload = {
        message: document.getElementById('f_message').value,
        type:    document.getElementById('f_type').value,
        is_read: document.getElementById('f_is_read').checked,
    };

    const btn = document.getElementById('saveBtn');
    btn.disabled = true; btn.textContent = 'Saving…';

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/notifications/${id}/` : '/notifications/';
    const result = await apiFetch(url, { method, body: JSON.stringify(payload) });

    btn.disabled = false; btn.textContent = 'Save';
    if (result) { closeModal(); loadNotifications(); }
}

loadNotifications();