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

let reportData = null;

function arr(d) { return d ? (d.results || d) : []; }

function sectionCard(title, rows) {
    const rowsHtml = rows.map(([label, value, color]) =>
        `<tr>
            <td>${label}</td>
            <td><strong style="color:${color || 'inherit'}">${value}</strong></td>
        </tr>`
    ).join('');
    return `
        <div class="table-container" style="margin-bottom:0;">
            <h3 style="margin-bottom:16px;font-size:1rem;">${title}</h3>
            <table><tbody>${rowsHtml}</tbody></table>
        </div>`;
}

async function loadReport() {
    const [flights, gates, baggage, maintenance, staff, notifications] = await Promise.all([
        apiFetch('/flights/'),
        apiFetch('/gates/'),
        apiFetch('/baggage/'),
        apiFetch('/maintenance/'),
        apiFetch('/staff/'),
        apiFetch('/notifications/'),
    ]);

    const f = arr(flights);
    const g = arr(gates);
    const b = arr(baggage);
    const m = arr(maintenance);
    const s = arr(staff);
    const n = arr(notifications);

    if (!f && !g && !b) {
        document.getElementById('loadingMsg').style.display = 'none';
        document.getElementById('errorMsg').style.display = 'block';
        return;
    }

    reportData = {
        flights:       { total: f.length, scheduled: f.filter(x=>x.status==='SCHEDULED').length, departed: f.filter(x=>x.status==='DEPARTED').length, arrived: f.filter(x=>x.status==='ARRIVED').length, cancelled: f.filter(x=>x.status==='CANCELLED').length },
        gates:         { total: g.length, available: g.filter(x=>x.status==='available').length, occupied: g.filter(x=>x.status==='occupied').length, maintenance: g.filter(x=>x.status==='maintenance').length },
        baggage:       { total: b.length, in_transit: b.filter(x=>x.status==='IN_TRANSIT').length, arrived: b.filter(x=>x.status==='ARRIVED').length, claimed: b.filter(x=>x.status==='CLAIMED').length },
        maintenance:   { total: m.length, open: m.filter(x=>x.priority!=='completed').length, high: m.filter(x=>x.priority==='HIGH').length, medium: m.filter(x=>x.priority==='MEDIUM').length, low: m.filter(x=>x.priority==='LOW').length },
        staff:         { total: s.length, ground: s.filter(x=>x.staff_type==='GROUND').length, security: s.filter(x=>x.staff_type==='SECURITY').length, maintenance: s.filter(x=>x.staff_type==='MAINTENANCE').length, supervisor: s.filter(x=>x.staff_type==='SUPERVISOR').length },
        notifications: { total: n.length, unread: n.filter(x=>!x.is_read).length, flight: n.filter(x=>x.type==='FLIGHT').length, maintenance: n.filter(x=>x.type==='MAINTENANCE').length },
    };

    const grid = document.getElementById('reportGrid');
    grid.innerHTML = [
        sectionCard('✈ Flights', [
            ['Total Flights',  reportData.flights.total,     ''],
            ['Scheduled',      reportData.flights.scheduled,  '#3498db'],
            ['Departed',       reportData.flights.departed,   '#27ae60'],
            ['Arrived',        reportData.flights.arrived,    '#27ae60'],
            ['Cancelled',      reportData.flights.cancelled,  '#e74c3c'],
        ]),
        sectionCard('🚪 Gates', [
            ['Total Gates',  reportData.gates.total,       ''],
            ['Available',    reportData.gates.available,   '#27ae60'],
            ['Occupied',     reportData.gates.occupied,    '#e74c3c'],
            ['Maintenance',  reportData.gates.maintenance, '#f39c12'],
        ]),
        sectionCard('🧳 Baggage', [
            ['Total Items',  reportData.baggage.total,      ''],
            ['In Transit',   reportData.baggage.in_transit, '#f39c12'],
            ['Arrived',      reportData.baggage.arrived,    '#27ae60'],
            ['Claimed',      reportData.baggage.claimed,    '#9b59b6'],
        ]),
        sectionCard('🔧 Maintenance', [
            ['Total Requests', reportData.maintenance.total,  ''],
            ['High Priority',  reportData.maintenance.high,   '#e74c3c'],
            ['Medium Priority',reportData.maintenance.medium, '#f39c12'],
            ['Low Priority',   reportData.maintenance.low,    '#3498db'],
        ]),
        sectionCard('👷 Staff', [
            ['Total Staff',  reportData.staff.total,       ''],
            ['Ground',       reportData.staff.ground,      '#3498db'],
            ['Security',     reportData.staff.security,    '#f39c12'],
            ['Maintenance',  reportData.staff.maintenance, '#e74c3c'],
            ['Supervisors',  reportData.staff.supervisor,  '#9b59b6'],
        ]),
        sectionCard('🔔 Notifications', [
            ['Total',       reportData.notifications.total,       ''],
            ['Unread',      reportData.notifications.unread,      '#e74c3c'],
            ['Flight',      reportData.notifications.flight,      '#3498db'],
            ['Maintenance', reportData.notifications.maintenance,  '#f39c12'],
        ]),
    ].join('');

    document.getElementById('loadingMsg').style.display = 'none';
    grid.style.display = 'grid';
    document.getElementById('exportBtn').disabled = false;
}

function exportCSV() {
    if (!reportData) return;
    const d = reportData;
    const rows = [
        ['Module','Metric','Count'],
        ['Flights','Total',d.flights.total],
        ['Flights','Scheduled',d.flights.scheduled],
        ['Flights','Departed',d.flights.departed],
        ['Flights','Arrived',d.flights.arrived],
        ['Flights','Cancelled',d.flights.cancelled],
        ['Gates','Total',d.gates.total],
        ['Gates','Available',d.gates.available],
        ['Gates','Occupied',d.gates.occupied],
        ['Gates','Maintenance',d.gates.maintenance],
        ['Baggage','Total',d.baggage.total],
        ['Baggage','In Transit',d.baggage.in_transit],
        ['Baggage','Arrived',d.baggage.arrived],
        ['Baggage','Claimed',d.baggage.claimed],
        ['Maintenance','Total',d.maintenance.total],
        ['Maintenance','High Priority',d.maintenance.high],
        ['Maintenance','Medium Priority',d.maintenance.medium],
        ['Maintenance','Low Priority',d.maintenance.low],
        ['Staff','Total',d.staff.total],
        ['Staff','Ground',d.staff.ground],
        ['Staff','Security',d.staff.security],
        ['Staff','Maintenance',d.staff.maintenance],
        ['Staff','Supervisors',d.staff.supervisor],
        ['Notifications','Total',d.notifications.total],
        ['Notifications','Unread',d.notifications.unread],
        ['Notifications','Flight',d.notifications.flight],
        ['Notifications','Maintenance',d.notifications.maintenance],
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'airport_operations_report.csv'; a.click();
    URL.revokeObjectURL(url);
}

loadReport();