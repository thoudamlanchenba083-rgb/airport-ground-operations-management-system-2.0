import { useState, useEffect } from 'react'
import axiosClient from '../../api/axiosClient'

const REPORT_TYPES = [
  { value: 'FLIGHT', label: 'Flight Report' },
  { value: 'BAGGAGE', label: 'Baggage Report' },
  { value: 'MAINTENANCE', label: 'Maintenance Report' },
  { value: 'STAFF', label: 'Staff Report' },
]

const TYPE_COLORS = {
  FLIGHT: 'bg-blue-100 text-blue-700',
  BAGGAGE: 'bg-purple-100 text-purple-700',
  MAINTENANCE: 'bg-yellow-100 text-yellow-700',
  STAFF: 'bg-green-100 text-green-700',
}

export default function ReportsTab() {
  const [reports, setReports] = useState([])
  const [summary, setSummary] = useState(null)
  const [summaryType, setSummaryType] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', report_type: 'FLIGHT', content: '' })

  useEffect(() => { fetchReports() }, [])

  async function fetchReports() {
    try {
      setLoading(true)
      const res = await axiosClient.get('/reports/reports/')
      setReports(res.data.results ?? res.data)
    } catch (e) {
      setError('Failed to load reports.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSummary(type) {
    setSummaryType(type)
    setLoadingSummary(true)
    setSummary(null)
    try {
      const res = await axiosClient.get(`/reports/reports/summary/${type.toLowerCase()}/`)
      setSummary(res.data)
    } catch (e) {
      setSummary({ error: 'Failed to load summary.' })
    } finally {
      setLoadingSummary(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await axiosClient.post('/reports/reports/', form)
      setShowForm(false)
      setForm({ title: '', report_type: 'FLIGHT', content: '' })
      fetchReports()
    } catch (e) {
      alert('Error creating report.')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this report?')) return
    await axiosClient.delete(`/reports/reports/${id}/`)
    fetchReports()
  }

  if (loading) return <p className="text-neutral-400 p-4">Loading reports...</p>
  if (error) return <p className="text-red-500 p-4">{error}</p>

  return (
    <div>
      {/* Summary Cards */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-neutral-100 mb-3">Live Summaries</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['FLIGHT', 'BAGGAGE', 'MAINTENANCE', 'STAFF'].map(type => (
            <button
              key={type}
              onClick={() => fetchSummary(type)}
              className={`rounded-lg border p-3 text-left hover:shadow transition-shadow ${summaryType === type ? 'border-blue-500 bg-blue-50' : 'bg-neutral-900 border-neutral-700'}`}
            >
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[type]}`}>
                {REPORT_TYPES.find(r => r.value === type)?.label}
              </span>
              <p className="text-xs text-neutral-400 mt-2">Click to load summary</p>
            </button>
          ))}
        </div>

        {loadingSummary && <p className="text-sm text-neutral-500 mt-3">Loading summary...</p>}
        {summary && !loadingSummary && (
          <div className="mt-3 bg-neutral-800 border rounded-lg p-4">
            <h4 className="text-sm font-semibold text-neutral-100 mb-2">{summaryType} Summary</h4>
            {summary.error
              ? <p className="text-red-500 text-sm">{summary.error}</p>
              : <pre className="text-xs text-neutral-300 whitespace-pre-wrap">{JSON.stringify(summary, null, 2)}</pre>
            }
          </div>
        )}
      </div>

      {/* Reports List */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold text-neutral-100">Saved Reports</h3>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">+ New Report</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-neutral-900 rounded-lg p-6 w-full max-w-lg shadow-xl">
            <h4 className="text-lg font-bold mb-4">Create Report</h4>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required placeholder="Report Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
              <select value={form.report_type} onChange={e => setForm({ ...form, report_type: e.target.value })} className="w-full border rounded px-3 py-2 text-sm">
                {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <textarea required placeholder="Report content..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={5} className="w-full border rounded px-3 py-2 text-sm resize-none" />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Save</button>
                <button type="button" onClick={() => setShowForm(false)} className="bg-neutral-700 px-4 py-2 rounded text-sm hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {reports.length === 0 && <p className="text-center text-neutral-500 py-8">No reports yet.</p>}
        {reports.map(r => (
          <div key={r.id} className="bg-neutral-900 border rounded-lg p-4 flex justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[r.report_type] ?? 'bg-neutral-800 text-neutral-300'}`}>
                  {REPORT_TYPES.find(t => t.value === r.report_type)?.label ?? r.report_type}
                </span>
                <span className="text-xs text-neutral-500">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm font-semibold text-white">{r.title}</p>
              <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{r.content}</p>
            </div>
            <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline shrink-0">Delete</button>
          </div>
        ))}
      </div>
    </div>
  )
}