const { useState, useEffect } = React;

function Navbar({ onMenuClick }) {
    const [dark, setDark] = React.useState(localStorage.getItem('theme') !== 'light');
    React.useEffect(() => {
        document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    }, [dark]);
    return (
        <div className="navbar">
            <div className="navbar-left">
                <button className="hamburger" onClick={onMenuClick}>?</button>
                <h1>? Airport Ground Operations</h1>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <button
                    onClick={() => setDark(d => !d)}
                    style={{background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', color:'white', padding:'7px 14px', borderRadius:'20px', cursor:'pointer', fontSize:'0.85rem'}}>
                    {dark ? '? Light' : '?? Dark'}
                </button>
                <button onClick={() => { localStorage.clear(); window.location.href = 'landing.html'; }}>Logout</button>
            </div>
        </div>
    );
}

function Sidebar({ open, onClose }) {
    return (
        <>
            <div className={'sidebar-overlay' + (open ? ' open' : '')} onClick={onClose} />
            <div className={'sidebar' + (open ? ' mobile-open' : '')}>
                <a href="dashboard.html">?? Dashboard</a>
                <a href="flights.html">? Flights</a>
                <a href="gates.html">?? Gates</a>
                <a href="baggage.html" className="active">?? Baggage</a>
                <a href="maintenance.html">?? Maintenance</a>
                <a href="staff.html">?? Staff</a>
                <a href="notifications.html">?? Notifications</a>
                <a href="reports.html">?? Reports</a>
            </div>
        </>
    );
}

function StatusBadge({ status }) {
    const map = {
        CHECKED_IN: 'badge-info',
        LOADED:     'badge-warning',
        IN_TRANSIT: 'badge-warning',
        ARRIVED:    'badge-success',
        CLAIMED:    'badge-success',
    };
    const label = status ? status.replace('_',' ') : 'No status';
    return <span className={'badge ' + (map[status] || 'badge-info')}>{label}</span>;
}

function BaggageModal({ item, onClose, onSaved }) {
    const blank = { baggage_tag:'', passenger_name:'', flight:'', weight:'' };
    const [form, setForm] = useState(item || blank);
    const [saving, setSaving] = useState(false);
    const [flights, setFlights] = useState([]);

    useEffect(() => {
        async function loadFlights() {
            const f = await apiFetch('/flights/');
            setFlights(f ? (f.results || f) : []);
        }
        loadFlights();
    }, []);

    function set(k, v) { setForm(f => ({...f, [k]: v})); }

    async function save() {
        setSaving(true);
        const payload = {
            ...form,
            flight: form.flight ? Number(form.flight) : null,
            weight: form.weight ? Number(form.weight) : null,
        };
        const method = item ? 'PUT' : 'POST';
        const url = item ? `/baggage/${item.id}/` : '/baggage/';
        const result = await apiFetch(url, { method, body: JSON.stringify(payload) });
        setSaving(false);
        if (result) onSaved();
    }

    return (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <h3>{item ? 'Edit Baggage' : 'Add Baggage'}</h3>

                <div className="form-group">
                    <label>Baggage Tag</label>
                    <input type="text" value={form.baggage_tag || ''} onChange={e => set('baggage_tag', e.target.value)} />
                </div>

                <div className="form-group">
                    <label>Passenger Name</label>
                    <input type="text" value={form.passenger_name || ''} onChange={e => set('passenger_name', e.target.value)} />
                </div>

                <div className="form-group">
                    <label>Flight</label>
                    <select value={form.flight || ''} onChange={e => set('flight', e.target.value)}>
                        <option value="">-- Select Flight --</option>
                        {flights.map(f => (
                            <option key={f.id} value={f.id}>{f.flight_number} ({f.origin} ? {f.destination})</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Weight (kg)</label>
                    <input type="number" step="0.01" value={form.weight || ''} onChange={e => set('weight', e.target.value)} />
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

function TrackingModal({ baggage, onClose, onSaved }) {
    const [status, setStatus] = useState('CHECKED_IN');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    async function save() {
        setSaving(true);
        setError('');
        const res = await fetch(API_BASE + '/baggage-tracking/', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ baggage: baggage.id, status })
        });
        setSaving(false);
        if (res.ok) {
            onSaved();
        } else if (res.status === 403) {
            setError('Only admin users can update tracking status.');
        } else {
            setError('Failed to update status.');
        }
    }

    return (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <h3>Update Status — {baggage.baggage_tag}</h3>
                <div className="form-group">
                    <label>New Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value)}>
                        {['CHECKED_IN','LOADED','IN_TRANSIT','ARRIVED','CLAIMED'].map(s => (
                            <option key={s} value={s}>{s.replace('_',' ')}</option>
                        ))}
                    </select>
                </div>
                {error && <p className="error-msg">{error}</p>}
                <div className="modal-footer">
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={save} disabled={saving}>
                        {saving ? 'Saving...' : 'Add Status'}
                    </button>
                </div>
            </div>
        </div>
    );
}
function BaggagePage() {
    const [baggage, setBaggage] = useState([]);
    const [tracking, setTracking] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(null);
    const [trackModal, setTrackModal] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);

    async function load() {
        setLoading(true);
        const [b, t] = await Promise.all([
            apiFetch('/baggage/'),
            apiFetch('/baggage-tracking/'),
        ]);
        setBaggage(b ? (b.results || b) : []);
        setTracking(t ? (t.results || t) : []);
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    function latestStatus(baggageId) {
        const entries = tracking.filter(t => t.baggage === baggageId);
        if (entries.length === 0) return null;
        return entries.reduce((latest, e) =>
            new Date(e.updated_at) > new Date(latest.updated_at) ? e : latest
        );
    }

    async function deleteItem(id) {
        if (!confirm('Delete this baggage record?')) return;
        await apiFetch(`/baggage/${id}/`, { method: 'DELETE' });
        load();
    }

    const filtered = baggage.filter(b =>
        (b.baggage_tag      || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.passenger_name   || '').toLowerCase().includes(search.toLowerCase())
    );

    const counts = {
        total:      baggage.length,
        in_transit: tracking.filter(t => t.status === 'IN_TRANSIT').length,
        arrived:    tracking.filter(t => t.status === 'ARRIVED').length,
        claimed:    tracking.filter(t => t.status === 'CLAIMED').length,
    };

    return (
        <div>
            <Navbar onMenuClick={() => setMenuOpen(true)} />
            <div className="layout">
                <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
                <div className="main">
                    <p className="page-title">?? Baggage</p>

                    <div className="cards">
                        <div className="card" style={{borderTop:'4px solid #3498db'}}>
                            <h3 style={{color:'#3498db'}}>{counts.total}</h3>
                            <p>Total Items</p>
                        </div>
                        <div className="card" style={{borderTop:'4px solid #f39c12'}}>
                            <h3 style={{color:'#f39c12'}}>{counts.in_transit}</h3>
                            <p>In Transit</p>
                        </div>
                        <div className="card" style={{borderTop:'4px solid #27ae60'}}>
                            <h3 style={{color:'#27ae60'}}>{counts.arrived}</h3>
                            <p>Arrived</p>
                        </div>
                        <div className="card" style={{borderTop:'4px solid #9b59b6'}}>
                            <h3 style={{color:'#9b59b6'}}>{counts.claimed}</h3>
                            <p>Claimed</p>
                        </div>
                    </div>

                    <div className="toolbar">
                        <input
                            className="search-input"
                            placeholder="Search by tag number or passenger name…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={() => setModal('add')}>+ Add Baggage</button>
                    </div>

                    <div className="table-container">
                        {loading ? <p style={{padding:'20px',color:'#888'}}>Loading…</p> : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Tag #</th>
                                        <th>Passenger</th>
                                        <th>Flight</th>
                                        <th>Weight</th>
                                        <th>Latest Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan="6" style={{textAlign:'center',color:'#888',padding:'30px'}}>No baggage records found.</td></tr>
                                    ) : filtered.map(b => {
                                        const latest = latestStatus(b.id);
                                        return (
                                            <tr key={b.id}>
                                                <td><strong>{b.baggage_tag}</strong></td>
                                                <td>{b.passenger_name || '—'}</td>
                                                <td>{b.flight_detail ? b.flight_detail.flight_number : (b.flight || '—')}</td>
                                                <td>{b.weight ? b.weight + ' kg' : '—'}</td>
                                                <td><StatusBadge status={latest ? latest.status : null} /></td>
                                                <td style={{whiteSpace:'nowrap'}}>
                                                    <button className="btn btn-success" style={{marginRight:'6px'}} onClick={() => setTrackModal(b)}>Track</button>
                                                    <button className="btn btn-primary" style={{marginRight:'6px'}} onClick={() => setModal(b)}>Edit</button>
                                                    <button className="btn btn-danger" onClick={() => deleteItem(b.id)}>Delete</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
            {modal && (
                <BaggageModal
                    item={modal === 'add' ? null : modal}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load(); }}
                />
            )}
            {trackModal && (
                <TrackingModal
                    baggage={trackModal}
                    onClose={() => setTrackModal(null)}
                    onSaved={() => { setTrackModal(null); load(); }}
                />
            )}
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<BaggagePage />);
