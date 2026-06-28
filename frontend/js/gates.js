// Theme & sidebar
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

let allGates = [];
let searchQuery = '';

const STATUS_CLASSES = {
    available: 'badge-success',
    occupied: 'badge-danger',
    maintenance: 'badge-warning',
    closed: 'badge-info',
};

function badge(status) {
    return `<span class="badge ${STATUS_CLASSES[status] || 'badge-info'}">${status}</span>`;
}

async function loadGates() {
    const tbody = document.getElementById('gatesTbody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;padding:30px;">Loading…</td></tr>';

    const data = await apiFetch('/gates/');
    allGates = data ? (data.results || data) : [];

    // Update stat cards
    document.getElementById('countAvailable').textContent = allGates.filter(g => g.status === 'available').length;
    document.getElementById('countOccupied').textContent = allGates.filter(g => g.status === 'occupied').length;
    document.getElementById('countMaintenance').textContent = allGates.filter(g => g.status === 'maintenance').length;

    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('gatesTbody');
    const filtered = allGates.filter(g =>
        (g.gate_number || '').toLowerCase().includes(searchQuery) ||
        (g.terminal || '').toLowerCase().includes(searchQuery)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;padding:30px;">No gates found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(g => `
        <tr>
            <td><strong>${g.gate_number || ''}</strong></td>
            <td>${g.terminal || '—'}</td>
            <td>${badge(g.status)}</td>
            <td>${g.notes || '—'}</td>
            <td>
                <button class="btn btn-primary" style="margin-right:6px" onclick='openModal(${JSON.stringify(g)})'>Edit</button>
                <button class="btn btn-danger" onclick="deleteGate(${g.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

let searchTimer;
function onSearch(val) {
    searchQuery = val.toLowerCase();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderTable, 300);
}

async function deleteGate(id) {
    if (!confirm('Delete this gate?')) return;
    await apiFetch(`/gates/${id}/`, { method: 'DELETE' });
    loadGates();
}

// Modal
function openModal(gate) {
    document.getElementById('modalTitle').textContent = gate ? 'Edit Gate' : 'Add Gate';
    document.getElementById('editId').value = gate ? gate.id : '';
    document.getElementById('f_gate_number').value = gate ? gate.gate_number || '' : '';
    document.getElementById('f_terminal').value = gate ? gate.terminal || '' : '';
    document.getElementById('f_notes').value = gate ? gate.notes || '' : '';
    document.getElementById('f_status').value = gate ? gate.status || 'available' : 'available';
    document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

async function saveGate() {
    const id = document.getElementById('editId').value;
    const payload = {
        gate_number: document.getElementById('f_gate_number').value,
        terminal: document.getElementById('f_terminal').value,
        notes: document.getElementById('f_notes').value,
        status: document.getElementById('f_status').value,
    };

    const btn = document.getElementById('saveBtn');
    btn.disabled = true; btn.textContent = 'Saving…';

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/gates/${id}/` : '/gates/';
    const result = await apiFetch(url, { method, body: JSON.stringify(payload) });

    btn.disabled = false; btn.textContent = 'Save';
    if (result) { closeModal(); loadGates(); }
}

// Init
loadGates();