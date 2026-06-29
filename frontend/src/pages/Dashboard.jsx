import { useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'

export default function Dashboard() {
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    axiosClient.get('/flights/')
      .then((res) => setFlights(res.data.results || res.data))
      .catch(() => setError('Failed to load flights'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Flights</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2">Flight No.</th>
                <th className="px-4 py-2">Airline</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {flights.length === 0 && (
                <tr><td colSpan="3" className="px-4 py-4 text-gray-500">No flights found</td></tr>
              )}
              {flights.map((f) => (
                <tr key={f.id} className="border-b">
                  <td className="px-4 py-2">{f.flight_number}</td>
                  <td className="px-4 py-2">{f.airline_name || f.airline}</td>
                  <td className="px-4 py-2">{f.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}