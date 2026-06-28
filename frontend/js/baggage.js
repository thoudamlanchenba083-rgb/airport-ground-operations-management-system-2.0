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

let allBaggage = [];
let allTracking = [];
let flightsList = [];
let searchQuery = '';

const STATUS_CLASSES = {
    CHECKED_IN: 'badge-info', LOADED: 'badge-warning',
    IN_TRANSIT: 'badge-warning', ARRIVED: 'badge-success', CLAIMED: 'badge-success',
};

function badge(status) {
    const label = status ? status.replace(/_/g, ' ') : 'No status';
    return `<span class="badge ${STATUS_CLASSES[status] || 'badge-info'}">${label}</span>`;
}

function latestStatus(baggageId) {
    const entries = allTracking.filter(t => t.baggage === baggageId);
    if (!entries.length) return null;
    return entries.reduce((a, b) => new Date(a.updated_at) > new Date(b.updated_at) ? a : b);
}

async function loadData() {
    const tbody = document.getElementById('baggageTbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:30px;">Loading…</td></tr>';

    const [b, t] = await Promise.all([apiFetch('/baggage/'), apiFetch('/baggage-tracking/')]);
    allBaggage = b ? (b.results || b) : [];
    allTracking = t ? (t.results || t) : [];

    // Stat cards
    document.getElementById('countTotal').textContent = allBaggage.length;
    document.getElementById('countTransit').textContent = allTracking.filter(t => t.status === 'IN_TRANSIT').length;
    document.getElementById('countArrived').textContent = allTracking.filter(t => t.status === 'ARRIVED').length;
    document.getElementById('countClaimed').textContent = allTracking.filter(t => t.status === 'CLAIMED').length;

    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('baggageTbody');
    const filtered = allBaggage.filter(b =>
        (b.baggage_tag || '').toLowerCase().includes(searchQuery) ||
        (b.passenger_name || '').toLowerCase().includes(searchQuery)
    );

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:30px;">No baggage records found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(b => {
        const latest = latestStatus(b.id);
        const flightNum = b.flight_detail ? b.flight_detail.flight_number : (b.flight || '—');
        return `<tr>
            <td><strong>${b.baggage_tag || ''}</strong></td>
            <td>${b.passenger_name || '—'}</td>
            <td>${flightNum}</td>
            <td>${b.weight ? b.weight + ' kg' : '—'}</td>
            <td>${badge(latest ? latest.status : null)}</td>
            <td style="white-space:nowrap">
                <button class="btn btn-success" style="margin-right:6px" onclick='openTrackModal(${JSON.stringify(b)})'>Track</button>
                <button class="btn btn-primary" style="margin-right:6px" onclick='openModal(${JSON.stringify(b)})'>Edit</button>
                <button class="btn btn-danger" onclick="deleteItem(${b.id})">Delete</button>
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
    if (!confirm('Delete this baggage record?')) return;
    await apiFetch(`/baggage/${id}/`, { method: 'DELETE' });
    loadData();
}

// Baggage Modal
async function openModal(item) {
    document.getElementById('modalTitle').textContent = item ? 'Edit Baggage' : 'Add Baggage';
    document.getElementById('editId').value = item ? item.id : '';
    document.getElementById('f_baggage_tag').value = item ? item.baggage_tag || '' : '';
    document.getElementById('f_passenger_name').value = item ? item.passenger_name || '' : '';
    document.getElementById('f_weight').value = item ? item.weight || '' : '';

    if (!flightsList.length) {
        const f = await apiFetch('/flights/');
        flightsList = f ? (f.results || f) : [];
        const sel = document.getElementById('f_flight');
        sel.innerHTML = '<option value="">-- Select Flight --</option>' +
            flightsList.map(f => `<option value="${f.id}">${f.flight_number} (${f.origin} → ${f.destination})</option>`).join('');
    }

    document.getElementById('f_flight').value = item ? (item.flight || '') : '';
    document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

async function saveBaggage() {
    const id = document.getElementById('editId').value;
    const payload = {
        baggage_tag: document.getElementById('f_baggage_tag').value,
        passenger_name: document.getElementById('f_passenger_name').value,
        flight: document.getElementById('f_flight').value ? Number(document.getElementById('f_flight').value) : null,
        weight: document.getElementById('f_weight').value ? Number(document.getElementById('f_weight').value) : null,
    };

    const btn = document.getElementById('saveBtn');
    btn.disabled = true; btn.textContent = 'Saving…';

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/baggage/${id}/` : '/baggage/';
    const result = await apiFetch(url, { method, body: JSON.stringify(payload) });

    btn.disabled = false; btn.textContent = 'Save';
    if (result) { closeModal(); loadData(); }
}

// Tracking Modal
function openTrackModal(baggage) {
    document.getElementById('trackTitle').textContent = `Update Status — ${baggage.baggage_tag}`;
    document.getElementById('trackBaggageId').value = baggage.id;
    document.getElementById('f_track_status').value = 'CHECKED_IN';
    document.getElementById('trackError').style.display = 'none';
    document.getElementById('trackOverlay').classList.add('open');
}

function closeTrackModal() {
    document.getElementById('trackOverlay').classList.remove('open');
}

async function saveTracking() {
    const baggageId = document.getElementById('trackBaggageId').value;
    const status = document.getElementById('f_track_status').value;
    const errEl = document.getElementById('trackError');
    const btn = document.getElementById('trackSaveBtn');

    btn.disabled = true; btn.textContent = 'Saving…';
    errEl.style.display = 'none';

    const res = await fetch(API_BASE + '/baggage-tracking/', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ baggage: Number(baggageId), status }),
    });

    btn.disabled = false; btn.textContent = 'Add Status';

    if (res.ok) {
        closeTrackModal();
        loadData();
    } else if (res.status === 403) {
        errEl.textContent = 'Only admin users can update tracking status.';
        errEl.style.display = 'block';
    } else {
        errEl.textContent = 'Failed to update status.';
        errEl.style.display = 'block';
    }
}

// Init
loadData();