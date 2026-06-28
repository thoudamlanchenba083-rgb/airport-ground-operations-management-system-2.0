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

const STAT_CONFIG = [
    { title: 'Flights',       key: 'flights',       color: '#4e79a7', link: 'flights.html' },
    { title: 'Gates',         key: 'gates',         color: '#59a14f', link: 'gates.html' },
    { title: 'Baggage',       key: 'baggage',       color: '#f28e2b', link: 'baggage.html' },
    { title: 'Maintenance',   key: 'maintenance',   color: '#e15759', link: 'maintenance.html' },
    { title: 'Staff',         key: 'staff',         color: '#76b7b2', link: 'staff.html' },
    { title: 'Notifications', key: 'notifications', color: '#b07aa1', link: 'notifications.html' },
];

function renderStatCards(stats) {
    document.getElementById('statCards').innerHTML = STAT_CONFIG.map(c => `
        <a href="${c.link}" style="text-decoration:none;">
            <div class="card" style="border-top:4px solid ${c.color};cursor:pointer;">
                <h3 style="color:${c.color};font-size:2rem;margin:0 0 6px;">${stats[c.key] ?? 0}</h3>
                <p style="margin:0;color:#888;font-size:0.9rem;">${c.title}</p>
            </div>
        </a>
    `).join('');
}

let flightChartInst = null;
let maintChartInst  = null;
let staffChartInst  = null;

function renderFlightChart(byStatus) {
    const canvas = document.getElementById('flightChart');
    const empty  = document.getElementById('flightChartEmpty');
    const labels = Object.keys(byStatus);
    const values = Object.values(byStatus);
    if (!labels.length) { canvas.style.display = 'none'; empty.style.display = 'block'; return; }
    if (flightChartInst) flightChartInst.destroy();
    flightChartInst = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data: values, backgroundColor: ['#4e79a7','#f28e2b','#59a14f','#76b7b2','#e15759'], borderWidth: 2, borderColor: '#fff' }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } }, title: { display: true, text: 'Flights by Status', font: { size: 14 } } } }
    });
}

function renderMaintChart(byStatus) {
    const canvas = document.getElementById('maintChart');
    const empty  = document.getElementById('maintChartEmpty');
    const labels = Object.keys(byStatus);
    const values = Object.values(byStatus);
    if (!labels.length) { canvas.style.display = 'none'; empty.style.display = 'block'; return; }
    if (maintChartInst) maintChartInst.destroy();
    maintChartInst = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{ label: 'Requests', data: values, backgroundColor: ['#59a14f','#f28e2b','#e15759','#4e79a7'], borderRadius: 6 }]
        },
        options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: 'Maintenance Requests by Status', font: { size: 14 } } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
}

function renderStaffChart(byType) {
    const canvas = document.getElementById('staffChart');
    const empty  = document.getElementById('staffChartEmpty');
    const labels = Object.keys(byType);
    const values = Object.values(byType);
    if (!labels.length) { canvas.style.display = 'none'; empty.style.display = 'block'; return; }
    if (staffChartInst) staffChartInst.destroy();
    staffChartInst = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{ label: 'Staff Count', data: values, backgroundColor: '#4e79a7', borderRadius: 6 }]
        },
        options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false }, title: { display: true, text: 'Active Staff by Type', font: { size: 14 } } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
}

async function loadDashboard() {
    const [flights, gates, baggage, maintenance, staff, notifications,
           flightRep, maintRep, staffRep] = await Promise.all([
        apiFetch('/flights/'),
        apiFetch('/gates/'),
        apiFetch('/baggage/'),
        apiFetch('/maintenance/'),
        apiFetch('/staff/'),
        apiFetch('/notifications/'),
        apiFetch('/reports/summary/flights'),
        apiFetch('/reports/summary/maintenance'),
        apiFetch('/reports/summary/staff'),
    ]);

    const count = d => d?.count ?? (Array.isArray(d) ? d.length : (d?.results?.length ?? 0));

    renderStatCards({
        flights:       count(flights),
        gates:         count(gates),
        baggage:       count(baggage),
        maintenance:   count(maintenance),
        staff:         count(staff),
        notifications: count(notifications),
    });

    // Flight chart — from summary API or fallback to raw data
    if (flightRep?.by_status) {
        renderFlightChart(flightRep.by_status);
    } else if (flights) {
        const arr = flights.results || flights;
        const byStatus = {};
        arr.forEach(f => { byStatus[f.status] = (byStatus[f.status] || 0) + 1; });
        renderFlightChart(byStatus);
    }

    // Maintenance chart
    if (maintRep?.by_status) {
        renderMaintChart(maintRep.by_status);
    } else if (maintenance) {
        const arr = maintenance.results || maintenance;
        const byStatus = {};
        arr.forEach(m => { byStatus[m.priority] = (byStatus[m.priority] || 0) + 1; });
        renderMaintChart(byStatus);
    }

    // Staff chart
    if (staffRep?.by_type) {
        renderStaffChart(staffRep.by_type);
    } else if (staff) {
        const arr = staff.results || staff;
        const byType = {};
        arr.forEach(s => { byType[s.staff_type] = (byType[s.staff_type] || 0) + 1; });
        renderStaffChart(byType);
    }

    document.getElementById('loadingMsg').style.display = 'none';
    document.getElementById('dashContent').style.display = 'block';
}

loadDashboard();