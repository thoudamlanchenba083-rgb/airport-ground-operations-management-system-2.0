path = "frontend/src/components/flights/TurnaroundTab.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

count_before = content.count("<select")

# 1. Flight selector
content = content.replace(
    '''          <select
            value={selectedFlightId}
            onChange={(e) => setSelectedFlightId(e.target.value)}
            className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm min-w-[220px]"
          >
            <option value="">Select a flight...</option>
            {flights.map((f) => (
              <option key={f.id} value={f.id}>{f.flight_number} — {f.status}</option>
            ))}
          </select>''',
    '''          <select
            value={selectedFlightId}
            onChange={(e) => setSelectedFlightId(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="bg-neutral-100 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm min-w-[220px]"
          >
            <option value="" className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">Select a flight...</option>
            {flights.map((f) => (
              <option key={f.id} value={f.id} className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">{f.flight_number} — {f.status}</option>
            ))}
          </select>'''
)

# 2. Status select (has dynamic STATUS_STYLES background, keep that but add colorScheme + option colors)
content = content.replace(
    '''                    <select
                      value={t.status}
                      disabled={!canWrite}
                      onChange={(e) => updateTask(t.id, { status: e.target.value })}
                      className={`rounded px-2 py-1 text-xs border-0 ${STATUS_STYLES[t.status]}`}
                    >
                      {STATUS_CHOICES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>''',
    '''                    <select
                      value={t.status}
                      disabled={!canWrite}
                      onChange={(e) => updateTask(t.id, { status: e.target.value })}
                      style={{ colorScheme: 'dark' }}
                      className={`rounded px-2 py-1 text-xs border-0 ${STATUS_STYLES[t.status]}`}
                    >
                      {STATUS_CHOICES.map(s => <option key={s} value={s} className="bg-neutral-800 text-white">{s}</option>)}
                    </select>'''
)

# 3. Staff select
content = content.replace(
    '''                    <select
                      value={t.assigned_staff || ''}
                      disabled={!canWrite}
                      onChange={(e) => updateTask(t.id, { assigned_staff: e.target.value || null })}
                      className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-2 py-1 text-xs"
                    >
                      <option value="">Unassigned</option>
                      {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>''',
    '''                    <select
                      value={t.assigned_staff || ''}
                      disabled={!canWrite}
                      onChange={(e) => updateTask(t.id, { assigned_staff: e.target.value || null })}
                      style={{ colorScheme: 'dark' }}
                      className="bg-neutral-100 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded px-2 py-1 text-xs"
                    >
                      <option value="" className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">Unassigned</option>
                      {staffList.map(s => <option key={s.id} value={s.id} className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">{s.name}</option>)}
                    </select>'''
)

# 4. Equipment select
content = content.replace(
    '''                    <select
                      value={t.assigned_equipment || ''}
                      disabled={!canWrite}
                      onChange={(e) => updateTask(t.id, { assigned_equipment: e.target.value || null })}
                      className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-2 py-1 text-xs"
                    >
                      <option value="">None</option>
                      {equipmentList.map(eq => <option key={eq.id} value={eq.id}>{eq.equipment_id}</option>)}
                    </select>''',
    '''                    <select
                      value={t.assigned_equipment || ''}
                      disabled={!canWrite}
                      onChange={(e) => updateTask(t.id, { assigned_equipment: e.target.value || null })}
                      style={{ colorScheme: 'dark' }}
                      className="bg-neutral-100 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded px-2 py-1 text-xs"
                    >
                      <option value="" className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">None</option>
                      {equipmentList.map(eq => <option key={eq.id} value={eq.id} className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">{eq.equipment_id}</option>)}
                    </select>'''
)

# 5. Delay reason select
content = content.replace(
    '''                    <select
                      value={t.delay_reason || 'NONE'}
                      disabled={!canWrite}
                      onChange={(e) => updateTask(t.id, { delay_reason: e.target.value })}
                      className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-2 py-1 text-xs"
                    >
                      {DELAY_REASONS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>''',
    '''                    <select
                      value={t.delay_reason || 'NONE'}
                      disabled={!canWrite}
                      onChange={(e) => updateTask(t.id, { delay_reason: e.target.value })}
                      style={{ colorScheme: 'dark' }}
                      className="bg-neutral-100 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded px-2 py-1 text-xs"
                    >
                      {DELAY_REASONS.map(([val, label]) => <option key={val} value={val} className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">{label}</option>)}
                    </select>'''
)

count_after_style_tag = content.count("colorScheme: 'dark'")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Selects found before: {count_before}")
print(f"Selects patched with colorScheme fix: {count_after_style_tag} (expected 5)")
print("Done. TurnaroundTab.jsx updated.")
