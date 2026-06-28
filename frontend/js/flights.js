const { useState, useEffect, useCallback } = React;
function Pagination({ next, previous, onNext, onPrev, page, total }) {
    const totalPages = Math.ceil(total / 10) || 1;
    return (
        <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 0', marginTop: '8px'
        }}>
            <button
                className="btn"
                onClick={onPrev}
                disabled={!previous}
                style={{ opacity: previous ? 1 : 0.4, cursor: previous ? 'pointer' : 'not-allowed' }}>
                ← Prev
            </button>
            <span style={{ fontSize: '0.85rem', color: '#888' }}>
                Page {page} of {totalPages} · {total} total
            </span>
            <button
                className="btn"
                onClick={onNext}
                disabled={!next}
                style={{ opacity: next ? 1 : 0.4, cursor: next ? 'pointer' : 'not-allowed' }}>
                Next →
            </button>
        </div>
    );
}
function Navbar({ onMenuClick }) {
    const [dark, setDark] = React.useState(localStorage.getItem('theme') !== 'light');

    React.useEffect(() => {
        document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    }, [dark]);

    return (
        <div className="navbar">
            <div className="navbar-left">
                <button className="hamburger" onClick={onMenuClick}>☰</button>
                <h1>✈ Airport Ground Operations</h1>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <button
                    onClick={() => setDark(d => !d)}
                    style={{background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', color:'white', padding:'7px 14px', borderRadius:'20px', cursor:'pointer', fontSize:'0.85rem'}}>
                    {dark ? '☀ Light' : '🌙 Dark'}
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
                <a href="dashboard.html">📊 Dashboard</a>
                <a href="flights.html" className="active">✈ Flights</a>
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

function StatusBadge({ status }) {
    const map = {
        SCHEDULED: 'badge-info',
        BOARDING:  'badge-warning',
        DEPARTED:  'badge-success',
        ARRIVED:   'badge-success',
        CANCELLED: 'badge-danger',
    };
    return <span className={'badge ' + (map[status] || 'badge-info')}>{status}</span>;
}

function FlightModal({ flight, onClose, onSaved }) {
    const blank = { flight_number:'', airline:'', aircraft:'', origin:'', destination:'', departure_time:'', arrival_time:'', status:'SCHEDULED' };
    const [form, setForm] = useState(flight || blank);
    const [saving, setSaving] = useState(false);
    const [airlines, setAirlines] = useState([]);
    const [aircraftList, setAircraftList] = useState([]);

    useEffect(() => {
        async function loadOptions() {
            const [a, c] = await Promise.all([
                apiFetch('/airlines/'),
                apiFetch('/aircraft/'),
            ]);
            setAirlines(a ? (a.results || a) : []);
            setAircraftList(c ? (c.results || c) : []);
        }
        loadOptions();
    }, []);

    function set(k, v) { setForm(f => ({...f, [k]: v})); }

    function toDatetimeLocal(value) {
        if (!value) return '';
        return value.length >= 16 ? value.slice(0, 16) : value;
    }

    async function save() {
        setSaving(true);
        const payload = {
            ...form,
            airline: form.airline ? Number(form.airline) : null,
            aircraft: form.aircraft ? Number(form.aircraft) : null,
        };
        const method = flight ? 'PUT' : 'POST';
        const url = flight ? `/flights/${flight.id}/` : '/flights/';
        const result = await apiFetch(url, { method, body: JSON.stringify(payload) });
        setSaving(false);
        if (result) onSaved();
    }

    return (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <h3>{flight ? 'Edit Flight' : 'Add Flight'}</h3>

                <div className="form-group">
                    <label>Flight Number</label>
                    <input type="text" value={form.flight_number || ''} onChange={e => set('flight_number', e.target.value)} />
                </div>

                <div className="form-group">
                    <label>Airline</label>
                    <select value={form.airline || ''} onChange={e => set('airline', e.target.value)}>
                        <option value="">-- Select Airline --</option>
                        {airlines.map(a => (
                            <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                        ))}
                    </select>
                </div>

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
                    <label>Origin</label>
                    <input type="text" value={form.origin || ''} onChange={e => set('origin', e.target.value)} />
                </div>

                <div className="form-group">
                    <label>Destination</label>
                    <input type="text" value={form.destination || ''} onChange={e => set('destination', e.target.value)} />
                </div>

                <div className="form-group">
                    <label>Departure Time</label>
                    <input type="datetime-local" value={toDatetimeLocal(form.departure_time)} onChange={e => set('departure_time', e.target.value)} />
                </div>

                <div className="form-group">
                    <label>Arrival Time</label>
                    <input type="datetime-local" value={toDatetimeLocal(form.arrival_time)} onChange={e => set('arrival_time', e.target.value)} />
                </div>

                <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={e => set('status', e.target.value)}>
                        {['SCHEDULED','BOARDING','DEPARTED','ARRIVED','CANCELLED'].map(s => (
                            <option key={s} value={s}>{s}</option>
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

function FlightsPage() {
    const [flights, setFlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [next, setNext] = useState(null);
    const [previous, setPrevious] = useState(null);
    const [total, setTotal] = useState(0);

    async function load(url = null) {
        setLoading(true);
        const endpoint = url
            ? url.replace(API_BASE, '')
            : `/flights/?page=${page}&search=${search}`;
        const data = await apiFetch(endpoint);
        if (data) {
            setFlights(data.results || data);
            setNext(data.next || null);
            setPrevious(data.previous || null);
            setTotal(data.count || 0);
        }
        setLoading(false);
    }

    useEffect(() => { load(); }, [page, search]);

    async function deleteFlight(id) {
        if (!confirm('Delete this flight?')) return;
        await apiFetch(`/flights/${id}/`, { method: 'DELETE' });
        load();
    }

    const filtered = flights.filter(f =>
        (f.flight_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.origin || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.destination || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <Navbar onMenuClick={() => setMenuOpen(true)} />
            <div className="layout">
                <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
                <div className="main">
                    <p className="page-title">✈ Flights</p>
                    <div className="toolbar">
                        <input
                            className="search-input"
                            placeholder="Search by flight, origin, destination…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={() => setModal('add')}>+ Add Flight</button>
                    </div>
                    <div className="table-container">
                        {loading ? <p style={{padding:'20px',color:'#888'}}>Loading…</p> : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Flight #</th>
                                        <th>Origin</th>
                                        <th>Destination</th>
                                        <th>Departure</th>
                                        <th>Arrival</th>
                                        <th>Aircraft</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan="8" style={{textAlign:'center',color:'#888',padding:'30px'}}>No flights found.</td></tr>
                                    ) : filtered.map(f => (
                                        <tr key={f.id}>
                                            <td><strong>{f.flight_number}</strong></td>
                                            <td>{f.origin}</td>
                                            <td>{f.destination}</td>
                                            <td>{f.departure_time ? new Date(f.departure_time).toLocaleString() : '—'}</td>
                                            <td>{f.arrival_time ? new Date(f.arrival_time).toLocaleString() : '—'}</td>
                                            <td>{f.aircraft_detail ? f.aircraft_detail.registration_number : (f.aircraft || '—')}</td>
                                            <td><StatusBadge status={f.status} /></td>
                                            <td>
                                                <button className="btn btn-primary" style={{marginRight:'6px'}} onClick={() => setModal(f)}>Edit</button>
                                                <button className="btn btn-danger" onClick={() => deleteFlight(f.id)}>Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <Pagination
                        next={next} previous={previous}
                        page={page} total={total}
                        onNext={() => { setPage(p => p + 1); load(next); }}
                        onPrev={() => { setPage(p => p - 1); load(previous); }}
                    />
                </div>
            </div>
            {modal && (
                <FlightModal
                    flight={modal === 'add' ? null : modal}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load(); }}
                />
            )}
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<FlightsPage />);