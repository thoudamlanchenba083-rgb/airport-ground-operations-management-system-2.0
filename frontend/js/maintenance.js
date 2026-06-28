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

let allItems = [];
let allLogs = [];
let aircraftList = [];
let searchQuery = '';

const PRIORITY_CLASSES = { LOW: 'badge-info', MEDIUM: 'badge-warning', HIGH: 'badge-danger' };

function priorityBadge(p) {
    return `<span class="badge ${PRIORITY_CLASSES[p] || 'badge-info'}">${p}</span>`;
}

function statusBadge(completed) {
    return completed
        ? `<span class="badge badge-success">Completed</span>`
        : `<span class="badge badge-warning">Open</span>`;
}

function isCompleted(requestId) {
    return allLogs.some(l => l.request === requestId && l.completed_at);
}

async function loadData() {
    const tbody = document.getElementById('mainTbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:30px;">Loading…</td></tr>';

    const [i, l] = await Promise.all([apiFetch('/maintenance/'), apiFetch('/maintenance-logs/')]);
    allItems = i ? (i.results || i) : [];
    allLogs  = l ? (l.results || l) : [];

    document.getElementById('countTotal').textContent = allItems.length;
    document.getElementById('countOpen').textContent  = allItems.filter(i => !isCompleted(i.id)).length;
    document.getElementById('countDone').textContent  = allItems.filter(i =>  isCompleted(i.id)).length;
    document.getElementById('countHigh').textContent  = allItems.filter(i => i.priority === 'HIGH').length;

    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('mainTbody');
    const filtered = allItems.filter(i =>
        (i.issue_description || '').toLowerCase().includes(searchQuery) ||
        (i.aircraft_detail ? i.aircraft_detail.registration_number : '').toLowerCase().includes(searchQuery)
    );

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:30px;">No maintenance requests found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(i => {
        const aircraft = i.aircraft_detail ? i.aircraft_detail.registration_number : (i.aircraft || '—');
        const created  = i.created_at ? new Date(i.created_at).toLocaleString() : '—';
        return `<tr>
            <td><strong>${aircraft}</strong></td>
            <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${i.issue_description || ''}</td>
            <td>${priorityBadge(i.priority)}</td>
            <td>${statusBadge(isCompleted(i.id))}</td>
            <td>${created}</td>
            <td style="white-space:nowrap;">
                <button class="btn btn-success" style="margin-right:6px" onclick='openLogModal(${JSON.stringify(i)})'>Add Log</button>
                <button class="btn btn-primary" style="margin-right:6px" onclick='openModal(${JSON.stringify(i)})'>Edit</button>
                <button class="btn btn-danger" onclick="deleteItem(${i.id})">Delete</button>
            </td>
        </tr>`;
    }).join('');
}

let searchTimer;
function onSearch(val) {
    searchQuery = val.toLowerCase();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderTable, 300);
}

async function deleteItem(id) {
    if (!confirm('Delete this maintenance request?')) return;
    await apiFetch(`/maintenance/${id}/`, { method: 'DELETE' });
    loadData();
}

async function openModal(item) {
    document.getElementById('modalTitle').textContent = item ? 'Edit Request' : 'New Maintenance Request';
    document.getElementById('editId').value = item ? item.id : '';
    document.getElementById('f_issue').value = item ? item.issue_description || '' : '';
    document.getElementById('f_priority').value = item ? item.priority || 'MEDIUM' : 'MEDIUM';

    if (!aircraftList.length) {
        const c = await apiFetch('/aircraft/');
        aircraftList = c ? (c.results || c) : [];
        const sel = document.getElementById('f_aircraft');
        sel.innerHTML = '<option value="">-- Select Aircraft --</option>' +
            aircraftList.map(c => `<option value="${c.id}">${c.registration_number} (${c.aircraft_type})</option>`).join('');
    }

    document.getElementById('f_aircraft').value = item ? (item.aircraft || '') : '';
    document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

async function saveItem() {
    const id = document.getElementById('editId').value;
    const payload = {
        aircraft: document.getElementById('f_aircraft').value ? Number(document.getElementById('f_aircraft').value) : null,
        issue_description: document.getElementById('f_issue').value,
        priority: document.getElementById('f_priority').value,
    };

    const btn = document.getElementById('saveBtn');
    btn.disabled = true; btn.textContent = 'Saving…';

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/maintenance/${id}/` : '/maintenance/';
    const result = await apiFetch(url, { method, body: JSON.stringify(payload) });

    btn.disabled = false; btn.textContent = 'Save';
    if (result) { closeModal(); loadData(); }
}

function openLogModal(request) {
    document.getElementById('logTitle').textContent = `Add Log — Request #${request.id}`;
    document.getElementById('logRequestId').value = request.id;
    document.getElementById('f_action').value = '';
    document.getElementById('f_completed').checked = false;
    document.getElementById('logError').style.display = 'none';
    document.getElementById('logOverlay').classList.add('open');
}

function closeLogModal() {
    document.getElementById('logOverlay').classList.remove('open');
}

async function saveLog() {
    const requestId = document.getElementById('logRequestId').value;
    const actionTaken = document.getElementById('f_action').value;
    const completed = document.getElementById('f_completed').checked;
    const errEl = document.getElementById('logError');
    const btn = document.getElementById('logSaveBtn');

    btn.disabled = true; btn.textContent = 'Saving…';
    errEl.style.display = 'none';

    const res = await fetch(API_BASE + '/maintenance-logs/', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            request: Number(requestId),
            action_taken: actionTaken,
            completed_at: completed ? new Date().toISOString() : null,
        }),
    });

    btn.disabled = false; btn.textContent = 'Add Log';

    if (res.ok) { closeLogModal(); loadData(); }
    else if (res.status === 403) {
        errEl.textContent = 'Only admin users can log maintenance actions.';
        errEl.style.display = 'block';
    } else {
        errEl.textContent = 'Failed to save log.';
        errEl.style.display = 'block';
    }
}

loadData();