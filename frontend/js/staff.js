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

let allStaff = [];
let shiftsList = [];
let searchQuery = '';

const ROLE_CLASSES = {
    SUPERVISOR: 'badge-danger', GROUND: 'badge-info',
    SECURITY: 'badge-warning', MAINTENANCE: 'badge-warning',
};

function roleBadge(type) {
    return `<span class="badge ${ROLE_CLASSES[type] || 'badge-info'}">${type}</span>`;
}

async function loadStaff() {
    const tbody = document.getElementById('staffTbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:30px;">Loading…</td></tr>';

    const data = await apiFetch('/staff/');
    allStaff = data ? (data.results || data) : [];

    document.getElementById('countTotal').textContent     = allStaff.length;
    document.getElementById('countGround').textContent    = allStaff.filter(s => s.staff_type === 'GROUND').length;
    document.getElementById('countSecurity').textContent  = allStaff.filter(s => s.staff_type === 'SECURITY').length;
    document.getElementById('countSupervisor').textContent = allStaff.filter(s => s.staff_type === 'SUPERVISOR').length;

    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('staffTbody');
    const filtered = allStaff.filter(s =>
        (s.name || '').toLowerCase().includes(searchQuery) ||
        (s.employee_id || '').toLowerCase().includes(searchQuery) ||
        (s.staff_type || '').toLowerCase().includes(searchQuery)
    );

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:30px;">No staff found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(s => `
        <tr>
            <td><strong>${s.name || ''}</strong></td>
            <td>${s.employee_id || '—'}</td>
            <td>${s.email || '—'}</td>
            <td>${s.phone || '—'}</td>
            <td>${roleBadge(s.staff_type)}</td>
            <td style="white-space:nowrap;">
                <button class="btn btn-success" style="margin-right:6px" onclick='openScheduleModal(${JSON.stringify(s)})'>Assign Shift</button>
                <button class="btn btn-primary" style="margin-right:6px" onclick='openModal(${JSON.stringify(s)})'>Edit</button>
                <button class="btn btn-danger" onclick="deleteMember(${s.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

let searchTimer;
function onSearch(val) {
    searchQuery = val.toLowerCase();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderTable, 300);
}

async function deleteMember(id) {
    if (!confirm('Delete this staff member?')) return;
    await apiFetch(`/staff/${id}/`, { method: 'DELETE' });
    loadStaff();
}

function openModal(member) {
    document.getElementById('modalTitle').textContent = member ? 'Edit Staff Member' : 'Add Staff Member';
    document.getElementById('editId').value = member ? member.id : '';
    document.getElementById('f_name').value = member ? member.name || '' : '';
    document.getElementById('f_employee_id').value = member ? member.employee_id || '' : '';
    document.getElementById('f_email').value = member ? member.email || '' : '';
    document.getElementById('f_phone').value = member ? member.phone || '' : '';
    document.getElementById('f_staff_type').value = member ? member.staff_type || 'GROUND' : 'GROUND';
    document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

async function saveStaff() {
    const id = document.getElementById('editId').value;
    const payload = {
        name: document.getElementById('f_name').value,
        employee_id: document.getElementById('f_employee_id').value,
        email: document.getElementById('f_email').value,
        phone: document.getElementById('f_phone').value,
        staff_type: document.getElementById('f_staff_type').value,
    };

    const btn = document.getElementById('saveBtn');
    btn.disabled = true; btn.textContent = 'Saving…';

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/staff/${id}/` : '/staff/';
    const result = await apiFetch(url, { method, body: JSON.stringify(payload) });

    btn.disabled = false; btn.textContent = 'Save';
    if (result) { closeModal(); loadStaff(); }
}

async function openScheduleModal(member) {
    document.getElementById('scheduleTitle').textContent = `Assign Shift — ${member.name}`;
    document.getElementById('scheduleStaffId').value = member.id;
    document.getElementById('f_date').value = '';
    document.getElementById('scheduleError').style.display = 'none';

    if (!shiftsList.length) {
        const s = await apiFetch('/shifts/');
        shiftsList = s ? (s.results || s) : [];
        const sel = document.getElementById('f_shift');
        if (shiftsList.length) {
            sel.innerHTML = '<option value="">-- Select Shift --</option>' +
                shiftsList.map(s => `<option value="${s.id}">${s.shift_name} (${s.start_time} – ${s.end_time})</option>`).join('');
            document.getElementById('noShiftsMsg').style.display = 'none';
        } else {
            sel.innerHTML = '<option value="">-- No shifts available --</option>';
            document.getElementById('noShiftsMsg').style.display = 'block';
        }
    }

    document.getElementById('f_shift').value = '';
    document.getElementById('scheduleOverlay').classList.add('open');
}

function closeScheduleModal() {
    document.getElementById('scheduleOverlay').classList.remove('open');
}

async function saveSchedule() {
    const staffId = document.getElementById('scheduleStaffId').value;
    const shiftId = document.getElementById('f_shift').value;
    const date    = document.getElementById('f_date').value;
    const errEl   = document.getElementById('scheduleError');
    const btn     = document.getElementById('assignBtn');

    if (!shiftId || !date) {
        errEl.textContent = 'Please select a shift and date.';
        errEl.style.display = 'block';
        return;
    }

    btn.disabled = true; btn.textContent = 'Saving…';
    errEl.style.display = 'none';

    const result = await apiFetch('/schedules/', {
        method: 'POST',
        body: JSON.stringify({ staff: Number(staffId), shift: Number(shiftId), date }),
    });

    btn.disabled = false; btn.textContent = 'Assign';

    if (result) {
        closeScheduleModal();
    } else {
        errEl.textContent = 'Failed to assign shift. Make sure a shift and date are selected.';
        errEl.style.display = 'block';
    }
}

loadStaff();