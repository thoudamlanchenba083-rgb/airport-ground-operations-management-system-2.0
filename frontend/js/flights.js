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

// State
let currentPage = 1;
let searchQuery = '';
let nextUrl = null;
let prevUrl = null;
let totalCount = 0;
let airlines = [];
let aircraftList = [];

const STATUS_CLASSES = {
    SCHEDULED: 'badge-info', BOARDING: 'badge-warning',
    DEPARTED: 'badge-success', ARRIVED: 'badge-success', CANCELLED: 'badge-danger'
};

function badge(status) {
    return `<span class="badge ${STATUS_CLASSES[status] || 'badge-info'}">${status}</span>`;
}

function fmtDt(val) {
    return val ? new Date(val).toLocaleString() : '—';
}

async function loadFlights(url) {
    const tbody = document.getElementById('flightsTbody');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;padding:30px;">Loading…</td></tr>';

    const endpoint = url
        ? url.replace(/^https?:\/\/[^/]+\/api/, '')
        : `/flights/?page=${currentPage}&search=${encodeURIComponent(searchQuery)}`;

    const data = await apiFetch(endpoint);
    if (!data) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#e74c3c;padding:30px;">Failed to load flights.</td></tr>';
        return;
    }

    const flights = data.results || data;
    nextUrl = data.next || null;
    prevUrl = data.previous || null;
    totalCount = data.count || flights.length;

    const totalPages = Math.ceil(totalCount / 10) || 1;
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages} · ${totalCount} total`;
    document.getElementById('prevBtn').disabled = !prevUrl;
    document.getElementById('nextBtn').disabled = !nextUrl;

    if (flights.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;padding:30px;">No flights found.</td></tr>';
        return;
    }

    tbody.innerHTML = flights.map(f => `
        <tr>
            <td><strong>${f.flight_number || ''}</strong></td>
            <td>${f.origin || ''}</td>
            <td>${f.destination || ''}</td>
            <td>${fmtDt(f.departure_time)}</td>
            <td>${fmtDt(f.arrival_time)}</td>
            <td>${f.aircraft_detail ? f.aircraft_detail.registration_number : (f.aircraft || '—')}</td>
            <td>${badge(f.status)}</td>
            <td>
                <button class="btn btn-primary" style="margin-right:6px" onclick='openModal(${JSON.stringify(f)})'>Edit</button>
                <button class="btn btn-danger" onclick="deleteFlight(${f.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function goPage(dir) {
    if (dir === 1 && nextUrl) { currentPage++; loadFlights(nextUrl); }
    if (dir === -1 && prevUrl) { currentPage--; loadFlights(prevUrl); }
}

let searchTimer;
function onSearch(val) {
    searchQuery = val;
    currentPage = 1;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadFlights(), 400);
}

async function deleteFlight(id) {
    if (!confirm('Delete this flight?')) return;
    await apiFetch(`/flights/${id}/`, { method: 'DELETE' });
    loadFlights();
}

// Modal
async function openModal(flight) {
    document.getElementById('modalTitle').textContent = flight ? 'Edit Flight' : 'Add Flight';
    document.getElementById('editId').value = flight ? flight.id : '';
    document.getElementById('f_flight_number').value = flight ? flight.flight_number || '' : '';
    document.getElementById('f_origin').value = flight ? flight.origin || '' : '';
    document.getElementById('f_destination').value = flight ? flight.destination || '' : '';
    document.getElementById('f_departure_time').value = flight && flight.departure_time ? flight.departure_time.slice(0,16) : '';
    document.getElementById('f_arrival_time').value = flight && flight.arrival_time ? flight.arrival_time.slice(0,16) : '';
    document.getElementById('f_status').value = flight ? flight.status || 'SCHEDULED' : 'SCHEDULED';

    // Load dropdowns if not already loaded
    if (airlines.length === 0 || aircraftList.length === 0) {
        const [a, c] = await Promise.all([apiFetch('/airlines/'), apiFetch('/aircraft/')]);
        airlines = a ? (a.results || a) : [];
        aircraftList = c ? (c.results || c) : [];

        const airlineSel = document.getElementById('f_airline');
        airlineSel.innerHTML = '<option value="">-- Select Airline --</option>' +
            airlines.map(a => `<option value="${a.id}">${a.name} (${a.code})</option>`).join('');

        const aircraftSel = document.getElementById('f_aircraft');
        aircraftSel.innerHTML = '<option value="">-- Select Aircraft --</option>' +
            aircraftList.map(c => `<option value="${c.id}">${c.registration_number} (${c.aircraft_type})</option>`).join('');
    }

    document.getElementById('f_airline').value = flight ? (flight.airline || '') : '';
    document.getElementById('f_aircraft').value = flight ? (flight.aircraft || '') : '';
    document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

async function saveFlight() {
    const id = document.getElementById('editId').value;
    const payload = {
        flight_number: document.getElementById('f_flight_number').value,
        airline: document.getElementById('f_airline').value ? Number(document.getElementById('f_airline').value) : null,
        aircraft: document.getElementById('f_aircraft').value ? Number(document.getElementById('f_aircraft').value) : null,
        origin: document.getElementById('f_origin').value,
        destination: document.getElementById('f_destination').value,
        departure_time: document.getElementById('f_departure_time').value || null,
        arrival_time: document.getElementById('f_arrival_time').value || null,
        status: document.getElementById('f_status').value,
    };

    const btn = document.getElementById('saveBtn');
    btn.disabled = true; btn.textContent = 'Saving…';

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/flights/${id}/` : '/flights/';
    const result = await apiFetch(url, { method, body: JSON.stringify(payload) });

    btn.disabled = false; btn.textContent = 'Save';
    if (result) { closeModal(); loadFlights(); }
}

// Init
loadFlights();