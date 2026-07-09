import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import axiosClient from '../api/axiosClient'
import usePageMeta from '../hooks/usePageMeta'

export default function Signup() {
  usePageMeta('Sign Up', 'Create your AeroGround account to manage airport ground operations.')
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
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
        username, email, phone, password,
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
    <div className="dark min-h-screen bg-[#171717] flex items-center justify-center px-4 py-10 relative overflow-hidden">

      {/* Ambient blue waves - same optimized .liquid-blob used on the Login
          screen (GPU-composited, transform-only animation). */}
      <div
        className="liquid-blob"
        style={{
          top: '-8%', left: '-10%', width: '34rem', height: '34rem',
          background: 'radial-gradient(circle, rgba(120,120,118,0.28), transparent 70%)',
          animationDelay: '0s',
        }}
      />
      <div
        className="liquid-blob"
        style={{
          bottom: '-12%', right: '-10%', width: '36rem', height: '36rem',
          background: 'radial-gradient(circle, rgba(90,90,88,0.28), transparent 70%)',
          animationDelay: '-10s',
        }}
      />
      <div
        className="liquid-blob"
        style={{
          top: '35%', left: '45%', width: '26rem', height: '26rem',
          background: 'radial-gradient(circle, rgba(150,150,146,0.16), transparent 70%)',
          animationDelay: '-18s',
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="glass-hero login-card rounded-3xl p-8">

          {/* Logo / Header */}
          <div className="flex flex-col items-center mb-6">
            <img src="/brand/aeroground-logo-white.png" alt="AeroGround" className="h-16 object-contain" />
            <p className="text-neutral-400 text-xs tracking-wide mt-1">Ground Operations Management System</p>
          </div>

          <div className="h-px bg-linear-to-r from-transparent via-white/15 to-transparent mb-6" />

          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-white">Create Account</h1>
            <p className="text-neutral-400 text-sm mt-1">Join AeroGround Ops Management</p>
          </div>

          {/* Error / success banners */}
          {error && (
            <div className="flex items-center gap-2 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm rounded-xl px-4 py-3 mb-5">
              <AlertTriangle size={16} className="shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm rounded-xl px-4 py-3 mb-5">
              <CheckCircle2 size={16} className="shrink-0" />
              Account created. Redirecting to login…
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="signup-username" className="block text-sm text-neutral-300 mb-1.5 font-medium">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  id="signup-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent text-sm transition"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="block text-sm text-neutral-300 mb-1.5 font-medium">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  id="signup-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent text-sm transition"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="signup-phone" className="block text-sm text-neutral-300 mb-1.5 font-medium">Phone (Optional)</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  id="signup-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                  autoComplete="tel"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent text-sm transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-password" className="block text-sm text-neutral-300 mb-1.5 font-medium">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  id="signup-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent text-sm transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="signup-confirm-password" className="block text-sm text-neutral-300 mb-1.5 font-medium">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  id="signup-confirm-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent text-sm transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition"
                  tabIndex={-1}
                >
                  {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  Sign Up
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <p className="text-center text-neutral-400 text-sm mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
