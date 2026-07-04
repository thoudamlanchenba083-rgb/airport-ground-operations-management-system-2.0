import { useEffect, useState } from 'react'
import axiosClient from '../../api/axiosClient'

const STATUS_COLORS = {
  available:   'bg-green-100 text-green-700',
  in_use:      'bg-blue-100 text-blue-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
  damaged:     'bg-red-100 text-red-700',
}

const URGENCY_COLORS = {
  IMMEDIATE: 'bg-red-100 text-red-700',
  SOON:      'bg-yellow-100 text-yellow-700',
  ROUTINE:   'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300',
}

export default function EquipmentTab() {
  const [equipment, setEquipment] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [search,    setSearch]    = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [predictions, setPredictions] = useState({})
  const [predicting,  setPredicting]  = useState(null)

  const load = () => {
    setLoading(true)
    axiosClient.get('/ground-equipment/equipment/')
      .then(r => setEquipment(r.data.results ?? r.data))
      .catch(() => setError('Failed to load equipment.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = equipment.filter(e => {
    const matchSearch = e.equipment_id.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus ? e.status === filterStatus : true
    return matchSearch && matchStatus
  })

  const predictFailure = (item) => {
    setPredicting(item.id)
    axiosClient.get(`/ground-equipment/equipment/${item.id}/predict_failure/`)
      .then(r => setPredictions(prev => ({ ...prev, [item.id]: r.data })))
      .catch(() => setError('Prediction failed for ' + item.equipment_id + '.'))
      .finally(() => setPredicting(null))
  }

  if (loading) return <div className="text-gray-500 dark:text-neutral-400">Loading equipment...</div>

  return (
    <div>
      {error && <div className="text-red-400 mb-3">{error}</div>}

      <div className="flex gap-3 mb-4">
        <input
          className="bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 text-gray-900 dark:text-white rounded px-3 py-2"
          placeholder="Search by equipment ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 text-gray-900 dark:text-white rounded px-3 py-2"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="available">Available</option>
          <option value="in_use">In Use</option>
          <option value="maintenance">Under Maintenance</option>
          <option value="damaged">Damaged</option>
        </select>
      </div>

      <table className="w-full text-left text-gray-800 dark:text-neutral-200">
        <thead>
          <tr className="border-b border-gray-200 dark:border-neutral-700 text-gray-500 dark:text-neutral-400 text-sm">
            <th className="py-2">Equipment ID</th>
            <th>Type</th>
            <th>Status</th>
            <th>Location</th>
            <th>Failure Risk</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(item => {
            const pred = predictions[item.id]
            return (
              <tr key={item.id} className="border-b border-gray-200 dark:border-neutral-800">
                <td className="py-2">{item.equipment_id}</td>
                <td>{item.equipment_type_display}</td>
                <td>
                  <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[item.status]}`}>
                    {item.status_display}
                  </span>
                </td>
                <td>{item.location || '?'}</td>
                <td>
                  {pred ? (
                    <span className={`px-2 py-1 rounded text-xs ${URGENCY_COLORS[pred.prediction.urgency]}`}>
                      {pred.prediction.urgency} ({pred.prediction.failure_risk_score}%)
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-neutral-500 text-xs">Not checked</span>
                  )}
                </td>
                <td>
                  <button
                    className="text-sm bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-800 dark:text-white px-3 py-1 rounded"
                    disabled={predicting === item.id}
                    onClick={() => predictFailure(item)}
                  >
                    {predicting === item.id ? 'Checking...' : 'Predict Failure'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
