const { useState, useEffect } = React;
const API_BASE = 'http://127.0.0.1:8000/api';

if (!localStorage.getItem('access_token')) window.location.href = 'index.html';

let redirecting = false;

async function apiFetch(endpoint, options = {}) {
    if (redirecting) return null;
    const res = await fetch(API_BASE + endpoint, {
        ...options,
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    if (res.status === 401) {
        if (!redirecting) {
            redirecting = true;
            localStorage.clear();
            window.location.href = 'index.html';
        }
        return null;
    }
    if (res.ok) return res.status === 204 ? true : await res.json();
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
                <a href="dashboard.html">📊 Dashboard</a>
                <a href="flights.html">✈ Flights</a>
                <a href="gates.html">🚪 Gates</a>
                <a href="baggage.html">🧳 Baggage</a>
                <a href="maintenance.html">🔧 Maintenance</a>
                <a href="staff.html">👷 Staff</a>
                <a href="notifications.html">🔔 Notifications</a>
                <a href="reports.html" className="active">📋 Reports</a>
            </div>
        </>
    );
}

function StatRow({ label, value, color }) {
    return (
        <tr>
            <td>{label}</td>
            <td><strong style={{color: color || '#1a1a2e'}}>{value}</strong></td>
        </tr>
    );
}

function SectionCard({ title, children }) {
    return (
        <div className="table-container" style={{marginBottom:'24px'}}>
            <h3 style={{marginBottom:'16px', color:'#1a1a2e', fontSize:'1rem'}}>{title}</h3>
            {children}
        </div>
    );
}

function ReportsPage() {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        async function loadAll() {
            setLoading(true);
            const [flights, gates, baggage, maintenance, staff, notifications] = await Promise.all([
                apiFetch('/flights/'),
                apiFetch('/gates/'),
                apiFetch('/baggage/'),
                apiFetch('/maintenance/'),
                apiFetch('/staff/'),
                apiFetch('/notifications/'),
            ]);

            const arr = d => d ? (d.results || d) : [];

            const f = arr(flights);
            const g = arr(gates);
            const b = arr(baggage);
            const m = arr(maintenance);
            const s = arr(staff);
            const n = arr(notifications);

            setData({
                flights: {
                    total:     f.length,
                    scheduled: f.filter(x => x.status === 'scheduled').length,
                    departed:  f.filter(x => x.status === 'departed').length,
                    delayed:   f.filter(x => x.status === 'delayed').length,
                    cancelled: f.filter(x => x.status === 'cancelled').length,
                    arrived:   f.filter(x => x.status === 'arrived').length,
                },
                gates: {
                    total:       g.length,
                    available:   g.filter(x => x.status === 'available').length,
                    occupied:    g.filter(x => x.status === 'occupied').length,
                    maintenance: g.filter(x => x.status === 'maintenance').length,
                },
                baggage: {
                    total:      b.length,
                    delivered:  b.filter(x => x.status === 'delivered').length,
                    missing:    b.filter(x => x.status === 'missing').length,
                    damaged:    b.filter(x => x.status === 'damaged').length,
                    in_transit: b.filter(x => x.status === 'in_transit').length,
                },
                maintenance: {
                    total:       m.length,
                    pending:     m.filter(x => x.status === 'pending').length,
                    in_progress: m.filter(x => x.status === 'in_progress').length,
                    completed:   m.filter(x => x.status === 'completed').length,
                    critical:    m.filter(x => x.priority === 'critical').length,
                },
                staff: {
                    total:     s.length,
                    morning:   s.filter(x => x.shift === 'morning').length,
                    afternoon: s.filter(x => x.shift === 'afternoon').length,
                    night:     s.filter(x => x.shift === 'night').length,
                },
                notifications: {
                    total:   n.length,
                    unread:  n.filter(x => !x.is_read).length,
                    warning: n.filter(x => x.type === 'warning').length,
                    error:   n.filter(x => x.type === 'error').length,
                }
            });
            setLoading(false);
        }
        loadAll();
    }, []);

    function exportCSV() {
        if (!data) return;
        const rows = [
            ['Module', 'Metric', 'Count'],
            ['Flights','Total', data.flights.total],
            ['Flights','Scheduled', data.flights.scheduled],
            ['Flights','Departed', data.flights.departed],
            ['Flights','Arrived', data.flights.arrived],
            ['Flights','Delayed', data.flights.delayed],
            ['Flights','Cancelled', data.flights.cancelled],
            ['Gates','Total', data.gates.total],
            ['Gates','Available', data.gates.available],
            ['Gates','Occupied', data.gates.occupied],
            ['Gates','Maintenance', data.gates.maintenance],
            ['Baggage','Total', data.baggage.total],
            ['Baggage','Delivered', data.baggage.delivered],
            ['Baggage','In Transit', data.baggage.in_transit],
            ['Baggage','Missing', data.baggage.missing],
            ['Baggage','Damaged', data.baggage.damaged],
            ['Maintenance','Total', data.maintenance.total],
            ['Maintenance','Pending', data.maintenance.pending],
            ['Maintenance','In Progress', data.maintenance.in_progress],
            ['Maintenance','Completed', data.maintenance.completed],
            ['Maintenance','Critical', data.maintenance.critical],
            ['Staff','Total', data.staff.total],
            ['Staff','Morning Shift', data.staff.morning],
            ['Staff','Afternoon Shift', data.staff.afternoon],
            ['Staff','Night Shift', data.staff.night],
            ['Notifications','Total', data.notifications.total],
            ['Notifications','Unread', data.notifications.unread],
            ['Notifications','Warnings', data.notifications.warning],
            ['Notifications','Errors', data.notifications.error],
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'airport_operations_report.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div>
            <Navbar onMenuClick={() => setMenuOpen(true)} />
            <div className="layout">
                <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
                <div className="main">
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'10px'}}>
                        <p className="page-title" style={{marginBottom:0}}>📋 Operations Report</p>
                        <button className="btn btn-success" onClick={exportCSV} disabled={!data}>
                            ⬇ Export CSV
                        </button>
                    </div>

                    {loading ? (
                        <p style={{padding:'30px', color:'#888', textAlign:'center'}}>Loading report data…</p>
                    ) : !data ? (
                        <p style={{padding:'30px', color:'#e74c3c', textAlign:'center'}}>Failed to load data.</p>
                    ) : (
                        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'20px'}}>

                            <SectionCard title="✈ Flights">
                                <table>
                                    <tbody>
                                        <StatRow label="Total Flights"  value={data.flights.total} />
                                        <StatRow label="Scheduled"      value={data.flights.scheduled}  color="#3498db" />
                                        <StatRow label="Departed"       value={data.flights.departed}   color="#27ae60" />
                                        <StatRow label="Arrived"        value={data.flights.arrived}    color="#27ae60" />
                                        <StatRow label="Delayed"        value={data.flights.delayed}    color="#e74c3c" />
                                        <StatRow label="Cancelled"      value={data.flights.cancelled}  color="#e74c3c" />
                                    </tbody>
                                </table>
                            </SectionCard>

                            <SectionCard title="🚪 Gates">
                                <table>
                                    <tbody>
                                        <StatRow label="Total Gates"   value={data.gates.total} />
                                        <StatRow label="Available"     value={data.gates.available}    color="#27ae60" />
                                        <StatRow label="Occupied"      value={data.gates.occupied}     color="#e74c3c" />
                                        <StatRow label="Maintenance"   value={data.gates.maintenance}  color="#f39c12" />
                                    </tbody>
                                </table>
                            </SectionCard>

                            <SectionCard title="🧳 Baggage">
                                <table>
                                    <tbody>
                                        <StatRow label="Total Items"  value={data.baggage.total} />
                                        <StatRow label="Delivered"    value={data.baggage.delivered}   color="#27ae60" />
                                        <StatRow label="In Transit"   value={data.baggage.in_transit}  color="#f39c12" />
                                        <StatRow label="Missing"      value={data.baggage.missing}     color="#e74c3c" />
                                        <StatRow label="Damaged"      value={data.baggage.damaged}     color="#e74c3c" />
                                    </tbody>
                                </table>
                            </SectionCard>

                            <SectionCard title="🔧 Maintenance">
                                <table>
                                    <tbody>
                                        <StatRow label="Total Requests"  value={data.maintenance.total} />
                                        <StatRow label="Pending"         value={data.maintenance.pending}      color="#f39c12" />
                                        <StatRow label="In Progress"     value={data.maintenance.in_progress}  color="#3498db" />
                                        <StatRow label="Completed"       value={data.maintenance.completed}    color="#27ae60" />
                                        <StatRow label="Critical"        value={data.maintenance.critical}     color="#e74c3c" />
                                    </tbody>
                                </table>
                            </SectionCard>

                            <SectionCard title="👷 Staff">
                                <table>
                                    <tbody>
                                        <StatRow label="Total Staff"      value={data.staff.total} />
                                        <StatRow label="Morning Shift"    value={data.staff.morning}    color="#f39c12" />
                                        <StatRow label="Afternoon Shift"  value={data.staff.afternoon}  color="#3498db" />
                                        <StatRow label="Night Shift"      value={data.staff.night}      color="#9b59b6" />
                                    </tbody>
                                </table>
                            </SectionCard>

                            <SectionCard title="🔔 Notifications">
                                <table>
                                    <tbody>
                                        <StatRow label="Total"     value={data.notifications.total} />
                                        <StatRow label="Unread"    value={data.notifications.unread}    color="#e74c3c" />
                                        <StatRow label="Warnings"  value={data.notifications.warning}   color="#f39c12" />
                                        <StatRow label="Errors"    value={data.notifications.error}     color="#e74c3c" />
                                    </tbody>
                                </table>
                            </SectionCard>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ReportsPage />);