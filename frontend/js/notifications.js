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
                <a href="flights.html">✈ Flights</a>
                <a href="gates.html">🚪 Gates</a>
                <a href="baggage.html">🧳 Baggage</a>
                <a href="maintenance.html">🔧 Maintenance</a>
                <a href="staff.html">👷 Staff</a>
                <a href="notifications.html" className="active">🔔 Notifications</a>
                <a href="reports.html">📋 Reports</a>
            </div>
        </>
    );
}

function TypeBadge({ type }) {
    const map = {
        FLIGHT:      'badge-info',
        MAINTENANCE: 'badge-warning',
        BAGGAGE:     'badge-warning',
        GENERAL:     'badge-success',
    };
    return <span className={'badge ' + (map[type] || 'badge-info')}>{type}</span>;
}

function NotificationModal({ item, onClose, onSaved }) {
    const blank = { message:'', type:'GENERAL', is_read: false };
    const [form, setForm] = useState(item || blank);
    const [saving, setSaving] = useState(false);

    function set(k, v) { setForm(f => ({...f, [k]: v})); }

    async function save() {
        setSaving(true);
        const method = item ? 'PUT' : 'POST';
        const url = item ? `/notifications/${item.id}/` : '/notifications/';
        const result = await apiFetch(url, { method, body: JSON.stringify(form) });
        setSaving(false);
        if (result) onSaved();
    }

    return (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <h3>{item ? 'Edit Notification' : 'New Notification'}</h3>

                <div className="form-group">
                    <label>Message</label>
                    <textarea rows="4" value={form.message || ''} onChange={e => set('message', e.target.value)}
                        style={{width:'100%',padding:'10px',border:'1px solid #ddd',borderRadius:'6px',fontSize:'0.9rem'}} />
                </div>

                <div className="form-group">
                    <label>Type</label>
                    <select value={form.type} onChange={e => set('type', e.target.value)}>
                        {['FLIGHT','MAINTENANCE','BAGGAGE','GENERAL'].map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group" style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <input type="checkbox" id="is_read" checked={!!form.is_read}
                        onChange={e => set('is_read', e.target.checked)}
                        style={{width:'auto'}} />
                    <label htmlFor="is_read" style={{marginBottom:0}}>Mark as Read</label>
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

function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [modal, setModal] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);

    async function load() {
        setLoading(true);
        const data = await apiFetch('/notifications/');
        setNotifications(data ? (data.results || data) : []);
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    async function markRead(item) {
        await apiFetch(`/notifications/${item.id}/`, {
            method: 'PUT',
            body: JSON.stringify({...item, is_read: true})
        });
        load();
    }

    async function deleteItem(id) {
        if (!confirm('Delete this notification?')) return;
        await apiFetch(`/notifications/${id}/`, { method: 'DELETE' });
        load();
    }

    async function markAllRead() {
        const unread = notifications.filter(n => !n.is_read);
        await Promise.all(unread.map(n =>
            apiFetch(`/notifications/${n.id}/`, {
                method: 'PUT',
                body: JSON.stringify({...n, is_read: true})
            })
        ));
        load();
    }

    const filtered = notifications.filter(n => {
        if (filter === 'unread') return !n.is_read;
        if (filter === 'read')   return  n.is_read;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div>
            <Navbar onMenuClick={() => setMenuOpen(true)} />
            <div className="layout">
                <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
                <div className="main">
                    <p className="page-title">🔔 Notifications</p>

                    <div className="cards">
                        <div className="card" style={{borderTop:'4px solid #3498db'}}>
                            <h3 style={{color:'#3498db'}}>{notifications.length}</h3>
                            <p>Total</p>
                        </div>
                        <div className="card" style={{borderTop:'4px solid #e74c3c'}}>
                            <h3 style={{color:'#e74c3c'}}>{unreadCount}</h3>
                            <p>Unread</p>
                        </div>
                        <div className="card" style={{borderTop:'4px solid #27ae60'}}>
                            <h3 style={{color:'#27ae60'}}>{notifications.length - unreadCount}</h3>
                            <p>Read</p>
                        </div>
                    </div>

                    <div className="toolbar">
                        <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
                            {['all','unread','read'].map(f => (
                                <button key={f} className={'btn ' + (filter === f ? 'btn-primary' : '')}
                                    style={filter !== f ? {background:'#eee',color:'#333'} : {}}
                                    onClick={() => setFilter(f)}>
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div style={{display:'flex', gap:'8px', marginLeft:'auto'}}>
                            {unreadCount > 0 && (
                                <button className="btn btn-success" onClick={markAllRead}>✓ Mark All Read</button>
                            )}
                            <button className="btn btn-primary" onClick={() => setModal('add')}>+ New</button>
                        </div>
                    </div>

                    <div className="table-container">
                        {loading ? <p style={{padding:'20px',color:'#888'}}>Loading…</p> : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Message</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan="5" style={{textAlign:'center',color:'#888',padding:'30px'}}>No notifications found.</td></tr>
                                    ) : filtered.map(n => (
                                        <tr key={n.id} style={!n.is_read ? {background:'#f0f7ff'} : {}}>
                                            <td style={{maxWidth:'350px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{n.message}</td>
                                            <td><TypeBadge type={n.type} /></td>
                                            <td>
                                                {n.is_read
                                                    ? <span className="badge badge-success">Read</span>
                                                    : <span className="badge badge-warning">Unread</span>}
                                            </td>
                                            <td>{n.created_at ? new Date(n.created_at).toLocaleString() : '—'}</td>
                                            <td style={{whiteSpace:'nowrap'}}>
                                                {!n.is_read && (
                                                    <button className="btn btn-success" style={{marginRight:'6px'}} onClick={() => markRead(n)}>✓</button>
                                                )}
                                                <button className="btn btn-primary" style={{marginRight:'6px'}} onClick={() => setModal(n)}>Edit</button>
                                                <button className="btn btn-danger" onClick={() => deleteItem(n.id)}>Delete</button>
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
                <NotificationModal
                    item={modal === 'add' ? null : modal}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load(); }}
                />
            )}
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<NotificationsPage />);