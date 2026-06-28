const { useState, useEffect, useRef } = React;

function Navbar({ onMenuClick }) {
    const [dark, setDark] = useState(localStorage.getItem('theme') !== 'light');

    useEffect(() => {
        document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    }, [dark]);

    return (
        <div className="navbar">
            <div className="navbar-left">
                <button className="hamburger" onClick={onMenuClick}>☰</button>
                <h1>✈ Airport Ground Operations</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                    onClick={() => setDark(d => !d)}
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '7px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    {dark ? '☀ Light' : '🌙 Dark'}
                </button>
                <button onClick={() => {
                    const refresh = localStorage.getItem('refresh_token');
                    if (refresh) {
                        fetch(`${API_BASE}/accounts/logout/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ refresh })
                        }).finally(() => { localStorage.clear(); window.location.href = 'landing.html'; });
                    } else {
                        localStorage.clear(); window.location.href = 'landing.html';
                    }
                }}>Logout</button>
            </div>
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
        <a href={link} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ borderTop: '4px solid ' + color, cursor: 'pointer' }}>
                <h3 style={{ color, fontSize: '2rem', margin: '0 0 6px' }}>{count}</h3>
                <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>{title}</p>
            </div>
        </a>
    );
}

function FlightStatusChart({ data }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!data || !canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        const labels = Object.keys(data);
        const values = Object.values(data);

        chartRef.current = new Chart(canvasRef.current, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: ['#4e79a7','#f28e2b','#59a14f','#76b7b2','#e15759'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
                    title: { display: true, text: 'Flights by Status (Last 7 Days)', font: { size: 14 } }
                }
            }
        });

        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [data]);

    return <canvas ref={canvasRef} style={{ maxHeight: '260px' }} />;
}

function MaintenanceChart({ data }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!data || !canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        const labels = Object.keys(data.by_status || {});
        const values = Object.values(data.by_status || {});

        chartRef.current = new Chart(canvasRef.current, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Requests',
                    data: values,
                    backgroundColor: ['#59a14f','#f28e2b','#e15759','#4e79a7'],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Maintenance Requests by Status', font: { size: 14 } }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });

        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [data]);

    return <canvas ref={canvasRef} style={{ maxHeight: '260px' }} />;
}

function StaffChart({ data }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!data || !canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        const labels = Object.keys(data.by_type || {});
        const values = Object.values(data.by_type || {});

        chartRef.current = new Chart(canvasRef.current, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Staff Count',
                    data: values,
                    backgroundColor: '#4e79a7',
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Active Staff by Type', font: { size: 14 } }
                },
                scales: {
                    x: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });

        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [data]);

    return <canvas ref={canvasRef} style={{ maxHeight: '260px' }} />;
}

function Dashboard() {
    const [stats, setStats] = useState({
        flights: 0, gates: 0, baggage: 0,
        maintenance: 0, staff: 0, notifications: 0
    });
    const [flightSummary, setFlightSummary] = useState(null);
    const [maintenanceSummary, setMaintenanceSummary] = useState(null);
    const [staffSummary, setStaffSummary] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadAll() {
            setLoading(true);
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

            setStats({
                flights:       flights?.count       ?? 0,
                gates:         gates?.count         ?? 0,
                baggage:       baggage?.count        ?? 0,
                maintenance:   maintenance?.count    ?? 0,
                staff:         staff?.count          ?? 0,
                notifications: notifications?.count  ?? 0,
            });

            if (flightRep?.by_status)      setFlightSummary(flightRep.by_status);
            if (maintRep)                  setMaintenanceSummary(maintRep);
            if (staffRep)                  setStaffSummary(staffRep);
            setLoading(false);
        }
        loadAll();
    }, []);

    return (
        <div>
            <Navbar onMenuClick={() => setMenuOpen(true)} />
            <div className="layout">
                <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
                <div className="main">
                    <p className="page-title">📊 Dashboard</p>

                    {loading ? (
                        <p style={{ color: '#888', padding: '20px' }}>Loading dashboard...</p>
                    ) : (
                        <>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: '16px', marginBottom: '2rem'
                            }}>
                                <StatCard title="Flights"       count={stats.flights}       color="#4e79a7" link="flights.html" />
                                <StatCard title="Gates"         count={stats.gates}         color="#59a14f" link="gates.html" />
                                <StatCard title="Baggage"       count={stats.baggage}       color="#f28e2b" link="baggage.html" />
                                <StatCard title="Maintenance"   count={stats.maintenance}   color="#e15759" link="maintenance.html" />
                                <StatCard title="Staff"         count={stats.staff}         color="#76b7b2" link="staff.html" />
                                <StatCard title="Notifications" count={stats.notifications} color="#b07aa1" link="notifications.html" />
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                gap: '20px'
                            }}>
                                <div className="card">
                                    {flightSummary
                                        ? <FlightStatusChart data={flightSummary} />
                                        : <p style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>No flight data available</p>
                                    }
                                </div>
                                <div className="card">
                                    {maintenanceSummary
                                        ? <MaintenanceChart data={maintenanceSummary} />
                                        : <p style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>No maintenance data available</p>
                                    }
                                </div>
                                <div className="card">
                                    {staffSummary
                                        ? <StaffChart data={staffSummary} />
                                        : <p style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>No staff data available</p>
                                    }
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);