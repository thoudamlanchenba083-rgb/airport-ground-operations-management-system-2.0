import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import usePageMeta from '../hooks/usePageMeta'

const ROLES = [
  { value: 'GROUND_STAFF', label: 'Ground Staff' },
  { value: 'SUPERVISOR',   label: 'Supervisor' },
  { value: 'MAINTENANCE',  label: 'Maintenance' },
]

export default function Signup() {
  usePageMeta('Sign Up', 'Create your AeroGround account to manage airport ground operations.')
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [role, setRole]         = useState('GROUND_STAFF')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all required fields.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await axiosClient.post('/accounts/register/', {
        username, email, phone, role, password,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      const data = err?.response?.data
      const msg = data
        ? Object.values(data).flat().join(' ')
        : 'Registration failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center px-4 relative overflow-hidden">

      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-neutral-600/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neutral-500/10 rounded-full blur-3xl"></div>

      <div className="relative z-10 w-full max-w-md bg-white/5 border border-white/15 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/50 p-8">

        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center mb-3 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2a1.5 1.5 0 0 0-1.5 1.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Create Account</h1>
          <p className="text-neutral-400 text-sm mt-1">Join AeroGround Ops Management</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 text-red-300 text-sm rounded-lg px-4 py-3 mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/40 text-green-300 text-sm rounded-lg px-4 py-3 mb-5">
            Account created. Redirecting to login...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1 font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              className="w-full px-4 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent text-sm transition"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent text-sm transition"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1 font-medium">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
              className="w-full px-4 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent text-sm transition"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1 font-medium">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent text-sm transition"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value} className="bg-neutral-900">{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-4 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent text-sm transition"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1 font-medium">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-4 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent text-sm transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition shadow-lg shadow-black/60 flex items-center justify-center gap-2"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-neutral-400 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-white hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
