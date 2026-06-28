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
                <a href="baggage.html">?? Baggage</a>
                <a href="maintenance.html">?? Maintenance</a>
                <a href="staff.html" className="active">?? Staff</a>
                <a href="notifications.html">?? Notifications</a>
                <a href="reports.html">?? Reports</a>
            </div>
        </>
    );
}

function RoleBadge({ staffType }) {
    const map = {
        SUPERVISOR:  'badge-danger',
        GROUND:      'badge-info',
        SECURITY:    'badge-warning',
        MAINTENANCE: 'badge-warning',
    };
    return <span className={'badge ' + (map[staffType] || 'badge-info')}>{staffType}</span>;
}
function StaffModal({ member, onClose, onSaved }) {
    const blank = { name:'', employee_id:'', staff_type:'GROUND', phone:'', email:'' };
    const [form, setForm] = useState(member || blank);
    const [saving, setSaving] = useState(false);

    function set(k, v) { setForm(f => ({...f, [k]: v})); }

    async function save() {
        setSaving(true);
        const method = member ? 'PUT' : 'POST';
        const url = member ? `/staff/${member.id}/` : '/staff/';
        const result = await apiFetch(url, { method, body: JSON.stringify(form) });
        setSaving(false);
        if (result) onSaved();
    }

    return (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <h3>{member ? 'Edit Staff Member' : 'Add Staff Member'}</h3>

                <div className="form-group">
                    <label>Name</label>
                    <input type="text" value={form.name || ''} onChange={e => set('name', e.target.value)} />
                </div>

                <div className="form-group">
                    <label>Employee ID</label>
                    <input type="text" value={form.employee_id || ''} onChange={e => set('employee_id', e.target.value)} />
                </div>

                <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
                </div>

                <div className="form-group">
                    <label>Phone</label>
                    <input type="text" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
                </div>

                <div className="form-group">
                    <label>Staff Type</label>
                    <select value={form.staff_type} onChange={e => set('staff_type', e.target.value)}>
                        {['GROUND','SECURITY','MAINTENANCE','SUPERVISOR'].map(t => (
                            <option key={t} value={t}>{t}</option>
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

function ScheduleModal({ staffMember, onClose, onSaved }) {
    const [shifts, setShifts] = useState([]);
    const [shiftId, setShiftId] = useState('');
    const [date, setDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        async function loadShifts() {
            const s = await apiFetch('/shifts/');
            setShifts(s ? (s.results || s) : []);
        }
        loadShifts();
    }, []);

    async function save() {
        setSaving(true);
        setError('');
        const result = await apiFetch('/schedules/', {
            method: 'POST',
            body: JSON.stringify({ staff: staffMember.id, shift: Number(shiftId), date })
        });
        setSaving(false);
        if (result) {
            onSaved();
        } else {
            setError('Failed to assign shift. Make sure a shift and date are selected.');
        }
    }

    return (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <h3>Assign Shift — {staffMember.name}</h3>

                <div className="form-group">
                    <label>Shift</label>
                    <select value={shiftId} onChange={e => setShiftId(e.target.value)}>
                        <option value="">-- Select Shift --</option>
                        {shifts.map(s => (
                            <option key={s.id} value={s.id}>{s.shift_name} ({s.start_time}–{s.end_time})</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>

                {shifts.length === 0 && (
                    <p style={{color:'#888', fontSize:'0.85rem'}}>No shifts exist yet. Create one in Django Admin first.</p>
                )}
                {error && <p className="error-msg">{error}</p>}

                <div className="modal-footer">
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={save} disabled={saving || !shiftId || !date}>
                        {saving ? 'Saving...' : 'Assign'}
                    </button>
                </div>
            </div>
        </div>
    );
}
function StaffPage() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(null);
    const [scheduleModal, setScheduleModal] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);

    async function load() {
        setLoading(true);
        const data = await apiFetch('/staff/');
        setStaff(data ? (data.results || data) : []);
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    async function deleteMember(id) {
        if (!confirm('Delete this staff member?')) return;
        await apiFetch(`/staff/${id}/`, { method: 'DELETE' });
        load();
    }

    const filtered = staff.filter(s =>
        (s.name        || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.employee_id || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.staff_type  || '').toLowerCase().includes(search.toLowerCase())
    );

    const counts = {
        total:       staff.length,
        ground:      staff.filter(s => s.staff_type === 'GROUND').length,
        security:    staff.filter(s => s.staff_type === 'SECURITY').length,
        maintenance: staff.filter(s => s.staff_type === 'MAINTENANCE').length,
        supervisor:  staff.filter(s => s.staff_type === 'SUPERVISOR').length,
    };

    return (
        <div>
            <Navbar onMenuClick={() => setMenuOpen(true)} />
            <div className="layout">
                <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
                <div className="main">
                    <p className="page-title">?? Staff</p>

                    <div className="cards">
                        <div className="card" style={{borderTop:'4px solid #9b59b6'}}>
                            <h3 style={{color:'#9b59b6'}}>{counts.total}</h3>
                            <p>Total Staff</p>
                        </div>
                        <div className="card" style={{borderTop:'4px solid #3498db'}}>
                            <h3 style={{color:'#3498db'}}>{counts.ground}</h3>
                            <p>Ground Staff</p>
                        </div>
                        <div className="card" style={{borderTop:'4px solid #f39c12'}}>
                            <h3 style={{color:'#f39c12'}}>{counts.security}</h3>
                            <p>Security</p>
                        </div>
                        <div className="card" style={{borderTop:'4px solid #e74c3c'}}>
                            <h3 style={{color:'#e74c3c'}}>{counts.supervisor}</h3>
                            <p>Supervisors</p>
                        </div>
                    </div>

                    <div className="toolbar">
                        <input
                            className="search-input"
                            placeholder="Search by name, employee ID or type…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={() => setModal('add')}>+ Add Staff</button>
                    </div>

                    <div className="table-container">
                        {loading ? <p style={{padding:'20px',color:'#888'}}>Loading…</p> : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Employee ID</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Type</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan="6" style={{textAlign:'center',color:'#888',padding:'30px'}}>No staff found.</td></tr>
                                    ) : filtered.map(s => (
                                        <tr key={s.id}>
                                            <td><strong>{s.name}</strong></td>
                                            <td>{s.employee_id}</td>
                                            <td>{s.email || '—'}</td>
                                            <td>{s.phone || '—'}</td>
                                            <td><RoleBadge staffType={s.staff_type} /></td>
                                            <td style={{whiteSpace:'nowrap'}}>
                                                <button className="btn btn-success" style={{marginRight:'6px'}} onClick={() => setScheduleModal(s)}>Assign Shift</button>
                                                <button className="btn btn-primary" style={{marginRight:'6px'}} onClick={() => setModal(s)}>Edit</button>
                                                <button className="btn btn-danger" onClick={() => deleteMember(s.id)}>Delete</button>
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
                <StaffModal
                    member={modal === 'add' ? null : modal}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load(); }}
                />
            )}
            {scheduleModal && (
                <ScheduleModal
                    staffMember={scheduleModal}
                    onClose={() => setScheduleModal(null)}
                    onSaved={() => setScheduleModal(null)}
                />
            )}
        </div>
    );
}
ReactDOM.createRoot(document.getElementById('root')).render(<StaffPage />);
