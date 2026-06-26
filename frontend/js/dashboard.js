const { useState, useEffect } = React;
const API_BASE = 'http://127.0.0.1:8000/api';

if (!localStorage.getItem('access_token')) window.location.href = 'index.html';

let redirecting = false;

async function apiFetch(endpoint) {
    if (redirecting) return null;
    const res = await fetch(API_BASE + endpoint, {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') }
    });
    if (res.status === 401) {
        if (!redirecting) {
            redirecting = true;
            localStorage.clear();
            window.location.href = 'index.html';
        }
        return null;
    }
    if (res.ok) return await res.json();
    return null;
}

function Navbar({ onMenuClick }) {
    return (
        <div className="navbar">
            <div className="navbar-left">
                <button className="hamburger" onClick={onMenuClick}>☰</button>
                <h1>✈ Airport Ground Operations</h1>
            </div>
            <button onClick={() => { localStorage.clear(); window.location.href = 'landing.html'; }}>Logout</button>
        </div>
    );
}

function Sidebar({ open, onClose }) {
    return (
        <>
            <div className={'sidebar-overlay' + (open ? ' open' : '')} onClick={onClose} />
            <div className={'sidebar' + (open ? ' mobile-open' : '')}>
                <a href="dashboard.html" className="active">📊 Dashboard</a>
                <a href="flights.html">✈ Flights</a>
                <a href="gates.html">🚪 Gates</a>
                <a href="baggage.html">🧳 Baggage</a>
                <a href="maintenance.html">🔧 Maintenance</a>
                <a href="staff.html">👷 Staff</a>
                <a href="notifications.html">🔔 Notifications</a>
                <a href="reports.html">📋 Reports</a>
            </div>
        </>
    );
}

function StatCard({ title, count, color, link }) {
    return (
        <a href={link} style={{textDecoration:'none'}}>
            <div className="card" style={{borderTop:'4px solid '+color, cursor:'pointer'}}>
                <h3 style={{color}}>{count}</h3>
                <p>{title}</p>
            </div>
        </a>
    );
}

function Dashboard() {
    const [stats, setStats] = useState({
        flights:0, gates:0, baggage:0,
        maintenance:0, staff:0, notifications:0
    });
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        async function loadStats() {
            const [flights, gates, baggage, maintenance, staff, notifications] = await Promise.all([
                apiFetch('/flights/'),
                apiFetch('/gates/'),
                apiFetch('/baggage/'),
                apiFetch('/maintenance/'),
                apiFetch('/staff/'),
                apiFetch('/notifications/'),
            ]);
            const count = d => d ? (d.count ?? (d.results || d).length) : 0;
            setStats({
                flights:       count(flights),
                gates:         count(gates),
                baggage:       count(baggage),
                maintenance:   count(maintenance),
                staff:         count(staff),
                notifications: count(notifications),
            });
        }
        loadStats();
    }, []);

    return (
        <div>
            <Navbar onMenuClick={() => setMenuOpen(true)} />
            <div className="layout">
                <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
                <div className="main">
                    <p className="page-title">📊 Dashboard</p>

                    <div className="cards">
                        <StatCard title="Total Flights"   count={stats.flights}       color="#3498db" link="flights.html" />
                        <StatCard title="Gates"           count={stats.gates}         color="#2ecc71" link="gates.html" />
                        <StatCard title="Baggage"         count={stats.baggage}       color="#e67e22" link="baggage.html" />
                        <StatCard title="Maintenance"     count={stats.maintenance}   color="#e74c3c" link="maintenance.html" />
                        <StatCard title="Staff"           count={stats.staff}         color="#9b59b6" link="staff.html" />
                        <StatCard title="Notifications"   count={stats.notifications} color="#1abc9c" link="notifications.html" />
                    </div>

                    <div className="table-container">
                        <h3 style={{marginBottom:'15px', color:'#1a1a2e'}}>Quick Links</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Module</th>
                                    <th>Description</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['✈ Flights',       'Manage airlines, aircraft and flights', 'flights.html'],
                                    ['🚪 Gates',         'Gate assignments and availability',     'gates.html'],
                                    ['🧳 Baggage',       'Baggage tracking and management',       'baggage.html'],
                                    ['🔧 Maintenance',   'Maintenance requests and logs',         'maintenance.html'],
                                    ['👷 Staff',         'Staff, shifts and schedules',           'staff.html'],
                                    ['🔔 Notifications', 'System notifications',                  'notifications.html'],
                                    ['📋 Reports',       'Operational reports',                   'reports.html'],
                                ].map(([name, desc, link]) => (
                                    <tr key={link}>
                                        <td><strong>{name}</strong></td>
                                        <td>{desc}</td>
                                        <td><a href={link} className="btn btn-primary">Open</a></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);