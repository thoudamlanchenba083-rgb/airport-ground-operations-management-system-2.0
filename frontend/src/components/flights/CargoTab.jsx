import { useEffect, useState } from 'react'
import { Package, Boxes, Plus, X } from 'lucide-react'
import axiosClient from '../../api/axiosClient'
import { useAuth } from '../../context/AuthContext'

const ULD_STATUS_COLORS = {
  EMPTY:      'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300',
  LOADING:    'bg-yellow-100 text-yellow-700',
  LOADED:     'bg-purple-100 text-purple-700',
  IN_TRANSIT: 'bg-blue-100 text-blue-700',
  OFFLOADED:  'bg-green-100 text-green-700',
  DAMAGED:    'bg-red-100 text-red-700',
}

const ITEM_STATUS_COLORS = {
  PENDING:   'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300',
  WAREHOUSE: 'bg-yellow-100 text-yellow-700',
  LOADED:    'bg-purple-100 text-purple-700',
  OFFLOADED: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-green-100 text-green-700',
}

const ITEM_STATUSES = ['PENDING', 'WAREHOUSE', 'LOADED', 'OFFLOADED', 'DELIVERED']
const ULD_STATUSES = ['EMPTY', 'LOADING', 'LOADED', 'IN_TRANSIT', 'OFFLOADED', 'DAMAGED']
const ULD_TYPES = ['CONTAINER', 'PALLET']
const DG_CLASSES = [
  ['', 'Not Dangerous Goods'],
  ['CLASS_1', 'Class 1 - Explosives'],
  ['CLASS_2', 'Class 2 - Gases'],
  ['CLASS_3', 'Class 3 - Flammable Liquids'],
  ['CLASS_4', 'Class 4 - Flammable Solids'],
  ['CLASS_5', 'Class 5 - Oxidizers'],
  ['CLASS_6', 'Class 6 - Toxic Substances'],
  ['CLASS_7', 'Class 7 - Radioactive'],
  ['CLASS_8', 'Class 8 - Corrosives'],
  ['CLASS_9', 'Class 9 - Miscellaneous'],
]

const inputClass = 'bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm'

export default function CargoTab() {
  const { user } = useAuth()
  // Matches backend HasRole on ULD/CargoManifest/CargoItem viewsets.
  const canWrite = ['ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'CARGO_SUPERVISOR', 'GROUND_STAFF'].includes(user?.role)

  const [subView, setSubView] = useState('manifests') // 'manifests' | 'ulds'
  const [manifests, setManifests] = useState([])
  const [ulds, setUlds] = useState([])
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showManifestForm, setShowManifestForm] = useState(false)
  const [manifestForm, setManifestForm] = useState({ manifest_number: '', flight: '' })
  const [savingManifest, setSavingManifest] = useState(false)

  const [showUldForm, setShowUldForm] = useState(false)
  const [uldForm, setUldForm] = useState({
    uld_id: '', uld_type: 'CONTAINER', status: 'EMPTY', flight: '', position: '', weight_kg: '', max_weight_kg: ''
  })
  const [savingUld, setSavingUld] = useState(false)

  const [selectedManifest, setSelectedManifest] = useState(null)
  const [itemForm, setItemForm] = useState({
    awb_number: '', description: '', weight_kg: '', uld: '',
    is_dangerous_goods: false, dangerous_goods_class: '', status: 'PENDING'
  })
  const [savingItem, setSavingItem] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      axiosClient.get('/cargo/cargo-manifests/'),
      axiosClient.get('/cargo/ulds/'),
      axiosClient.get('/flights/flights/'),
    ])
      .then(([m, u, f]) => {
        setManifests(m.data.results ?? m.data)
        setUlds(u.data.results ?? u.data)
        setFlights(f.data.results ?? f.data)
      })
      .catch(() => setError('Failed to load cargo data.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const flightLabel = (id) => flights.find(f => f.id === id)?.flight_number ?? id

  // ---- Manifests ----
  const submitManifest = () => {
    setSavingManifest(true)
    axiosClient.post('/cargo/cargo-manifests/', manifestForm)
      .then(() => {
        load()
        setShowManifestForm(false)
        setManifestForm({ manifest_number: '', flight: '' })
      })
      .catch(() => setError('Failed to save cargo manifest.'))
      .finally(() => setSavingManifest(false))
  }

  const toggleFinalize = (manifest) => {
    axiosClient.patch(`/cargo/cargo-manifests/${manifest.id}/`, { is_finalized: !manifest.is_finalized })
      .then(() => {
        load()
        if (selectedManifest?.id === manifest.id) {
          setSelectedManifest(m => ({ ...m, is_finalized: !manifest.is_finalized }))
        }
      })
      .catch(() => setError('Failed to finalize manifest (it may have no cargo items yet).'))
  }

  const deleteManifest = (id) => {
    if (!window.confirm('Delete this cargo manifest and all its items?')) return
    axiosClient.delete(`/cargo/cargo-manifests/${id}/`)
      .then(() => { load(); if (selectedManifest?.id === id) setSelectedManifest(null) })
      .catch(() => setError('Failed to delete manifest.'))
  }

  const openManifest = (m) => {
    axiosClient.get(`/cargo/cargo-manifests/${m.id}/`)
      .then(r => setSelectedManifest(r.data))
      .catch(() => setError('Failed to load manifest detail.'))
  }

  // ---- Cargo items ----
  const submitItem = () => {
    setSavingItem(true)
    axiosClient.post('/cargo/cargo-items/', {
      ...itemForm,
      manifest: selectedManifest.id,
      weight_kg: parseFloat(itemForm.weight_kg) || 0,
      uld: itemForm.uld || null,
      dangerous_goods_class: itemForm.is_dangerous_goods ? itemForm.dangerous_goods_class : '',
    })
      .then(() => {
        openManifest(selectedManifest)
        load()
        setItemForm({ awb_number: '', description: '', weight_kg: '', uld: '', is_dangerous_goods: false, dangerous_goods_class: '', status: 'PENDING' })
      })
      .catch(err => setError(err?.response?.data?.non_field_errors?.[0] || 'Failed to save cargo item.'))
      .finally(() => setSavingItem(false))
  }

  const deleteItem = (id) => {
    if (!window.confirm('Delete this cargo item?')) return
    axiosClient.delete(`/cargo/cargo-items/${id}/`)
      .then(() => { openManifest(selectedManifest); load() })
      .catch(() => setError('Failed to delete cargo item.'))
  }

  // ---- ULDs ----
  const submitUld = () => {
    setSavingUld(true)
    axiosClient.post('/cargo/ulds/', {
      ...uldForm,
      flight: uldForm.flight || null,
      weight_kg: parseFloat(uldForm.weight_kg) || 0,
      max_weight_kg: parseFloat(uldForm.max_weight_kg) || 0,
    })
      .then(() => {
        load()
        setShowUldForm(false)
        setUldForm({ uld_id: '', uld_type: 'CONTAINER', status: 'EMPTY', flight: '', position: '', weight_kg: '', max_weight_kg: '' })
      })
      .catch(err => setError(err?.response?.data?.non_field_errors?.[0] || 'Failed to save ULD.'))
      .finally(() => setSavingUld(false))
  }

  const deleteUld = (id) => {
    if (!window.confirm('Delete this ULD?')) return
    axiosClient.delete(`/cargo/ulds/${id}/`).then(load).catch(() => setError('Failed to delete ULD.'))
  }

  if (loading) return <p className="text-neutral-500 dark:text-neutral-400 p-4">Loading cargo data...</p>

  return (
    <div>
      {error && <p className="text-red-500 mb-3 text-sm">{error}</p>}

      {/* Sub-nav */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSubView('manifests')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${subView === 'manifests' ? 'bg-blue-600 text-white' : 'bg-black/5 dark:bg-white/5 text-neutral-600 dark:text-neutral-300'}`}
        >
          <Package size={14} /> Manifests
        </button>
        <button
          onClick={() => setSubView('ulds')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${subView === 'ulds' ? 'bg-blue-600 text-white' : 'bg-black/5 dark:bg-white/5 text-neutral-600 dark:text-neutral-300'}`}
        >
          <Boxes size={14} /> ULDs
        </button>
      </div>

      {/* Manifest item drawer */}
      {selectedManifest && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="glass-strong w-full max-w-lg h-full overflow-y-auto p-5">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-neutral-900 dark:text-white">
                {selectedManifest.manifest_number} — {flightLabel(selectedManifest.flight)}
              </h3>
              <button onClick={() => setSelectedManifest(null)} className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-100">
                <X size={20} />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedManifest.is_finalized ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {selectedManifest.is_finalized ? 'Finalized' : 'Open'}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Total weight: {selectedManifest.total_weight_kg} kg · {selectedManifest.items?.length ?? 0} item(s)
              </span>
              {canWrite && (
                <button
                  onClick={() => toggleFinalize(selectedManifest)}
                  className="ml-auto text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded"
                >
                  {selectedManifest.is_finalized ? 'Reopen' : 'Finalize'}
                </button>
              )}
            </div>

            {/* Add item form */}
            {canWrite && !selectedManifest.is_finalized && (
              <div className="glass rounded-xl p-3 mb-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="AWB Number"
                    value={itemForm.awb_number}
                    onChange={e => setItemForm(f => ({ ...f, awb_number: e.target.value }))}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    placeholder="Weight (kg)"
                    value={itemForm.weight_kg}
                    onChange={e => setItemForm(f => ({ ...f, weight_kg: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <input
                  placeholder="Description"
                  value={itemForm.description}
                  onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
                  className={`${inputClass} w-full`}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select style={{ colorScheme: 'dark' }}
                    value={itemForm.uld}
                    onChange={e => setItemForm(f => ({ ...f, uld: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="" className="bg-neutral-800 text-white">No ULD</option>
                    {ulds.map(u => <option key={u.id} value={u.id} className="bg-neutral-800 text-white">{u.uld_id}</option>)}
                  </select>
                  <select style={{ colorScheme: 'dark' }}
                    value={itemForm.status}
                    onChange={e => setItemForm(f => ({ ...f, status: e.target.value }))}
                    className={inputClass}
                  >
                    {ITEM_STATUSES.map(s => <option key={s} value={s} className="bg-neutral-800 text-white">{s}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={itemForm.is_dangerous_goods}
                    onChange={e => setItemForm(f => ({ ...f, is_dangerous_goods: e.target.checked }))}
                  />
                  Dangerous Goods
                </label>
                {itemForm.is_dangerous_goods && (
                  <select style={{ colorScheme: 'dark' }}
                    value={itemForm.dangerous_goods_class}
                    onChange={e => setItemForm(f => ({ ...f, dangerous_goods_class: e.target.value }))}
                    className={`${inputClass} w-full`}
                  >
                    {DG_CLASSES.filter(([v]) => v).map(([v, label]) => (
                      <option key={v} value={v} className="bg-neutral-800 text-white">{label}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={submitItem}
                  disabled={savingItem || !itemForm.description || !itemForm.weight_kg}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm py-2 rounded-lg"
                >
                  {savingItem ? 'Saving...' : 'Add Cargo Item'}
                </button>
              </div>
            )}

            {/* Item list */}
            <div className="space-y-2">
              {(selectedManifest.items ?? []).length === 0 ? (
                <p className="text-neutral-400 dark:text-neutral-500 text-sm text-center py-4">No cargo items yet.</p>
              ) : selectedManifest.items.map(it => (
                <div key={it.id} className="glass rounded-xl p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">{it.description}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {it.awb_number || 'AWB-N/A'} · {it.weight_kg} kg {it.uld_code ? `· ULD ${it.uld_code}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ITEM_STATUS_COLORS[it.status] ?? ''}`}>{it.status}</span>
                      {canWrite && (
                        <button onClick={() => deleteItem(it.id)} className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-0.5 rounded">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  {it.is_dangerous_goods && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      ⚠ DG: {it.dangerous_goods_class}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subView === 'manifests' && (
        <>
          <div className="flex justify-end mb-4">
            {canWrite && (
              <button
                onClick={() => setShowManifestForm(v => !v)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
              >
                <Plus size={14} /> {showManifestForm ? 'Cancel' : 'New Manifest'}
              </button>
            )}
          </div>

          {showManifestForm && canWrite && (
            <div className="glass rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
              <input
                placeholder="Manifest Number (e.g. MAN-2026-001)"
                value={manifestForm.manifest_number}
                onChange={e => setManifestForm(f => ({ ...f, manifest_number: e.target.value }))}
                className={inputClass}
              />
              <select style={{ colorScheme: 'dark' }}
                value={manifestForm.flight}
                onChange={e => setManifestForm(f => ({ ...f, flight: e.target.value }))}
                className={inputClass}
              >
                <option value="" className="bg-neutral-800 text-white">Select Flight</option>
                {flights.map(fl => (
                  <option key={fl.id} value={fl.id} className="bg-neutral-800 text-white">{fl.flight_number}</option>
                ))}
              </select>
              <div className="col-span-2 flex justify-end">
                <button
                  onClick={submitManifest}
                  disabled={savingManifest || !manifestForm.manifest_number || !manifestForm.flight}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg"
                >
                  {savingManifest ? 'Saving...' : 'Save Manifest'}
                </button>
              </div>
            </div>
          )}

          <div className="glass rounded-[26px] overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-black/3 dark:bg-white/4 text-neutral-500 dark:text-neutral-400 uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Manifest #</th>
                  <th className="px-4 py-3 text-left">Flight</th>
                  <th className="px-4 py-3 text-left">Total Weight</th>
                  <th className="px-4 py-3 text-left">Items</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {manifests.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-neutral-400 dark:text-neutral-500 py-6">No cargo manifests found.</td></tr>
                ) : manifests.map(m => (
                  <tr key={m.id} className="hover:bg-black/2 dark:hover:bg-white/3 cursor-pointer" onClick={() => openManifest(m)}>
                    <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">{m.manifest_number}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{m.flight_number ?? flightLabel(m.flight)}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{m.total_weight_kg} kg</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{m.items?.length ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.is_finalized ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {m.is_finalized ? 'Finalized' : 'Open'}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {canWrite && (
                        <button onClick={() => deleteManifest(m.id)} className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded">
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {subView === 'ulds' && (
        <>
          <div className="flex justify-end mb-4">
            {canWrite && (
              <button
                onClick={() => setShowUldForm(v => !v)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
              >
                <Plus size={14} /> {showUldForm ? 'Cancel' : 'New ULD'}
              </button>
            )}
          </div>

          {showUldForm && canWrite && (
            <div className="glass rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
              <input
                placeholder="ULD ID (e.g. AKE12345)"
                value={uldForm.uld_id}
                onChange={e => setUldForm(f => ({ ...f, uld_id: e.target.value }))}
                className={inputClass}
              />
              <select style={{ colorScheme: 'dark' }}
                value={uldForm.uld_type}
                onChange={e => setUldForm(f => ({ ...f, uld_type: e.target.value }))}
                className={inputClass}
              >
                {ULD_TYPES.map(t => <option key={t} value={t} className="bg-neutral-800 text-white">{t}</option>)}
              </select>
              <select style={{ colorScheme: 'dark' }}
                value={uldForm.status}
                onChange={e => setUldForm(f => ({ ...f, status: e.target.value }))}
                className={inputClass}
              >
                {ULD_STATUSES.map(s => <option key={s} value={s} className="bg-neutral-800 text-white">{s}</option>)}
              </select>
              <select style={{ colorScheme: 'dark' }}
                value={uldForm.flight}
                onChange={e => setUldForm(f => ({ ...f, flight: e.target.value }))}
                className={inputClass}
              >
                <option value="" className="bg-neutral-800 text-white">No Flight</option>
                {flights.map(fl => (
                  <option key={fl.id} value={fl.id} className="bg-neutral-800 text-white">{fl.flight_number}</option>
                ))}
              </select>
              <input
                placeholder="Position (e.g. AKE-1)"
                value={uldForm.position}
                onChange={e => setUldForm(f => ({ ...f, position: e.target.value }))}
                className={inputClass}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Weight (kg)"
                  value={uldForm.weight_kg}
                  onChange={e => setUldForm(f => ({ ...f, weight_kg: e.target.value }))}
                  className={inputClass}
                />
                <input
                  type="number"
                  placeholder="Max Weight (kg)"
                  value={uldForm.max_weight_kg}
                  onChange={e => setUldForm(f => ({ ...f, max_weight_kg: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="col-span-2 flex justify-end">
                <button
                  onClick={submitUld}
                  disabled={savingUld || !uldForm.uld_id}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg"
                >
                  {savingUld ? 'Saving...' : 'Save ULD'}
                </button>
              </div>
            </div>
          )}

          <div className="glass rounded-[26px] overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-black/3 dark:bg-white/4 text-neutral-500 dark:text-neutral-400 uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">ULD ID</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Flight</th>
                  <th className="px-4 py-3 text-left">Position</th>
                  <th className="px-4 py-3 text-left">Weight</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {ulds.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-neutral-400 dark:text-neutral-500 py-6">No ULDs found.</td></tr>
                ) : ulds.map(u => (
                  <tr key={u.id} className="hover:bg-black/2 dark:hover:bg-white/3">
                    <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">{u.uld_id}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{u.uld_type}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{u.flight_number ?? (u.flight ? flightLabel(u.flight) : '—')}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{u.position || '—'}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{u.weight_kg} / {u.max_weight_kg} kg</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ULD_STATUS_COLORS[u.status] ?? ''}`}>{u.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {canWrite && (
                        <button onClick={() => deleteUld(u.id)} className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded">
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
