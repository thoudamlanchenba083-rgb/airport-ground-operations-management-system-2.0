import { useEffect, useState } from 'react'
import axiosClient from '../../api/axiosClient'
import { useAuth } from '../../context/AuthContext'

export default function AirlinesTab() {
  const { user } = useAuth()
  const isViewer = user?.role === 'VIEWER'
  const [airlines, setAirlines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [formError, setFormError] = useState('')

  const loadAirlines = () => {
    setLoading(true)
    axiosClient.get('/flights/airlines/')
      .then((res) => setAirlines(res.data.results || res.data))
      .catch(() => setError('Failed to load airlines'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAirlines()
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setFormError('')
    try {
      await axiosClient.post('/flights/airlines/', { name, code })
      setName('')
      setCode('')
      loadAirlines()
    } catch (err) {
      const data = err.response?.data
      setFormError(data ? JSON.stringify(data) : 'Failed to add airline')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this airline?')) return
    try {
      await axiosClient.delete(`/flights/airlines/${id}/`)
      loadAirlines()
    } catch {
      alert('Failed to delete airline')
    }
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="bg-gray-50 dark:bg-neutral-900 rounded-lg shadow p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 dark:text-neutral-400 mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="border border-gray-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white rounded px-3 py-2 text-sm"
            placeholder="e.g. IndiGo"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-neutral-400 mb-1">Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            className="border border-gray-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white rounded px-3 py-2 text-sm w-24"
            placeholder="e.g. 6E"
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
          Add Airline
        </button>
        {formError && <p className="text-red-600 text-xs w-full">{formError}</p>}
      </form>

      {loading && <p className="text-gray-500 dark:text-neutral-400">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && (
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {airlines.length === 0 && (
                <tr><td colSpan="3" className="px-4 py-4 text-gray-400 dark:text-neutral-400">No airlines found</td></tr>
              )}
              {airlines.map((a) => (
                <tr key={a.id} className="border-b border-gray-200 dark:border-neutral-800 text-gray-800 dark:text-neutral-200">
                  <td className="px-4 py-2">{a.name}</td>
                  <td className="px-4 py-2">{a.code}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}