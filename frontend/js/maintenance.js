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
                <a href="maintenance.html" className="active">🔧 Maintenance</a>
                <a href="staff.html">👷 Staff</a>
                <a href="notifications.html">🔔 Notifications</a>
                <a href="reports.html">📋 Reports</a>
            </div>
        </>
    );
}

function PriorityBadge({ priority }) {
    const map = {
        LOW:    'badge-info',
        MEDIUM: 'badge-warning',
        HIGH:   'badge-danger',
    };
    return <span className={'badge ' + (map[priority] || 'badge-info')}>{priority}</span>;
}

function StatusBadge({ completed }) {
    return completed
        ? <span className="badge badge-success">Completed</span>
        : <span className="badge badge-warning">Open</span>;
}

function MaintenanceModal({ item, onClose, onSaved }) {
    const blank = { aircraft:'', issue_description:'', priority:'MEDIUM' };
    const [form, setForm] = useState(item || blank);
    const [saving, setSaving] = useState(false);
    const [aircraftList, setAircraftList] = useState([]);

    useEffect(() => {
        async function loadAircraft() {
            const c = await apiFetch('/aircraft/');
            setAircraftList(c ? (c.results || c) : []);
        }
        loadAircraft();
    }, []);

    function set(k, v) { setForm(f => ({...f, [k]: v})); }

    async function save() {
        setSaving(true);
        const payload = {
            ...form,
            aircraft: form.aircraft ? Number(form.aircraft) : null,
        };
        const method = item ? 'PUT' : 'POST';
        const url = item ? `/maintenance/${item.id}/` : '/maintenance/';
        const result = await apiFetch(url, { method, body: JSON.stringify(payload) });
        setSaving(false);
        if (result) onSaved();
    }

    return (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <h3>{item ? 'Edit Request' : 'New Maintenance Request'}</h3>

                <div className="form-group">
                    <label>Aircraft</label>
                    <select value={form.aircraft || ''} onChange={e => set('aircraft', e.target.value)}>
                        <option value="">-- Select Aircraft --</option>
                        {aircraftList.map(c => (
                            <option key={c.id} value={c.id}>{c.registration_number} ({c.aircraft_type})</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Issue Description</label>
                    <textarea rows="3" value={form.issue_description || ''} onChange={e => set('issue_description', e.target.value)}
                        style={{width:'100%',padding:'10px',border:'1px solid #ddd',borderRadius:'6px',fontSize:'0.9rem'}} />
                </div>

                <div className="form-group">
                    <label>Priority</label>
                    <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                        {['LOW','MEDIUM','HIGH'].map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>

                <div className="modal-footer">
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={save} disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function LogModal({ request, onClose, onSaved }) {
    const [actionTaken, setActionTaken] = useState('');
    const [completed, setCompleted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    async function save() {
        setSaving(true);
        setError('');
        const res = await fetch(API_BASE + '/maintenance-logs/', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                request: request.id,
                action_taken: actionTaken,
                completed_at: completed ? new Date().toISOString() : null,
            })
        });
        setSaving(false);
        if (res.ok) {
            onSaved();
        } else if (res.status === 403) {
            setError('Only admin users can log maintenance actions.');
        } else {
            setError('Failed to save log.');
        }
    }

    return (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <h3>Add Log — Request #{request.id}</h3>
                <div className="form-group">
                    <label>Action Taken</label>
                    <textarea rows="3" value={actionTaken} onChange={e => setActionTaken(e.target.value)}
                        style={{width:'100%',padding:'10px',border:'1px solid #ddd',borderRadius:'6px',fontSize:'0.9rem'}} />
                </div>
                <div className="form-group" style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <input type="checkbox" id="completed" checked={completed} onChange={e => setCompleted(e.target.checked)} style={{width:'auto'}} />
                    <label htmlFor="completed" style={{marginBottom:0}}>Mark as completed now</label>
                </div>
                {error && <p className="error-msg">{error}</p>}
                <div className="modal-footer">
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={save} disabled={saving || !actionTaken}>
                        {saving ? 'Saving...' : 'Add Log'}
                    </button>
                </div>
            </div>
        </div>
    );
}
function MaintenancePage() {
    const [items, setItems] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(null);
    const [logModal, setLogModal] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);

    async function load() {
        setLoading(true);
        const [i, l] = await Promise.all([
            apiFetch('/maintenance/'),
            apiFetch('/maintenance-logs/'),
        ]);
        setItems(i ? (i.results || i) : []);
        setLogs(l ? (l.results || l) : []);
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    function isCompleted(requestId) {
        return logs.some(l => l.request === requestId && l.completed_at);
    }

    async function deleteItem(id) {
        if (!confirm('Delete this maintenance request?')) return;
        await apiFetch(`/maintenance/${id}/`, { method: 'DELETE' });
        load();
    }

    const filtered = items.filter(i =>
        (i.issue_description || '').toLowerCase().includes(search.toLowerCase()) ||
        (i.aircraft_detail ? i.aircraft_detail.registration_number : '').toLowerCase().includes(search.toLowerCase())
    );

    const counts = {
        total:     items.length,
        open:      items.filter(i => !isCompleted(i.id)).length,
        completed: items.filter(i => isCompleted(i.id)).length,
        high:      items.filter(i => i.priority === 'HIGH').length,
    };

    return (
        <div>
            <Navbar onMenuClick={() => setMenuOpen(true)} />
            <div className="layout">
                <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
                <div className="main">
                    <p className="page-title">🔧 Maintenance</p>

                    <div className="cards">
                        <div className="card" style={{borderTop:'4px solid #3498db'}}>
                            <h3 style={{color:'#3498db'}}>{counts.total}</h3>
                            <p>Total Requests</p>
                        </div>
                        <div className="card" style={{borderTop:'4px solid #f39c12'}}>
                            <h3 style={{color:'#f39c12'}}>{counts.open}</h3>
                            <p>Open</p>
                        </div>
                        <div className="card" style={{borderTop:'4px solid #27ae60'}}>
                            <h3 style={{color:'#27ae60'}}>{counts.completed}</h3>
                            <p>Completed</p>
                        </div>
                        <div className="card" style={{borderTop:'4px solid #e74c3c'}}>
                            <h3 style={{color:'#e74c3c'}}>{counts.high}</h3>
                            <p>High Priority</p>
                        </div>
                    </div>

                    <div className="toolbar">
                        <input
                            className="search-input"
                            placeholder="Search by issue or aircraft…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={() => setModal('add')}>+ New Request</button>
                    </div>

                    <div className="table-container">
                        {loading ? <p style={{padding:'20px',color:'#888'}}>Loading…</p> : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Aircraft</th>
                                        <th>Issue</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan="6" style={{textAlign:'center',color:'#888',padding:'30px'}}>No maintenance requests found.</td></tr>
                                    ) : filtered.map(i => (
                                        <tr key={i.id}>
                                            <td><strong>{i.aircraft_detail ? i.aircraft_detail.registration_number : (i.aircraft || '—')}</strong></td>
                                            <td style={{maxWidth:'220px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{i.issue_description}</td>
                                            <td><PriorityBadge priority={i.priority} /></td>
                                            <td><StatusBadge completed={isCompleted(i.id)} /></td>
                                            <td>{i.created_at ? new Date(i.created_at).toLocaleString() : '—'}</td>
                                            <td style={{whiteSpace:'nowrap'}}>
                                                <button className="btn btn-success" style={{marginRight:'6px'}} onClick={() => setLogModal(i)}>Add Log</button>
                                                <button className="btn btn-primary" style={{marginRight:'6px'}} onClick={() => setModal(i)}>Edit</button>
                                                <button className="btn btn-danger" onClick={() => deleteItem(i.id)}>Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
            {modal && (
                <MaintenanceModal
                    item={modal === 'add' ? null : modal}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load(); }}
                />
            )}
            {logModal && (
                <LogModal
                    request={logModal}
                    onClose={() => setLogModal(null)}
                    onSaved={() => { setLogModal(null); load(); }}
                />
            )}
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<MaintenancePage />);