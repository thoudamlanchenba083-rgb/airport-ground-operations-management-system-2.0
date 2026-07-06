import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPw, setShowPw]     = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.')
      return
    }
    setLoading(true)
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        'Invalid username or password.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">

      {/* Ambient blue waves - same optimized .liquid-blob used across the
          app (GPU-composited, transform-only animation), just tinted to
          the brand blue for this screen instead of the multi-color mix. */}
      <div
        className="liquid-blob"
        style={{
          top: '-8%', left: '-10%', width: '34rem', height: '34rem',
          background: 'radial-gradient(circle, rgba(56,189,248,0.30), transparent 70%)',
          animationDelay: '0s',
        }}
      />
      <div
        className="liquid-blob"
        style={{
          bottom: '-12%', right: '-10%', width: '36rem', height: '36rem',
          background: 'radial-gradient(circle, rgba(59,130,246,0.30), transparent 70%)',
          animationDelay: '-10s',
        }}
      />
      <div
        className="liquid-blob"
        style={{
          top: '35%', left: '45%', width: '26rem', height: '26rem',
          background: 'radial-gradient(circle, rgba(99,102,241,0.18), transparent 70%)',
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
            <h1 className="text-xl font-bold text-white">Welcome Back</h1>
            <p className="text-neutral-400 text-sm mt-1">Sign in to your AeroGround account</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm rounded-xl px-4 py-3 mb-5">
              <AlertTriangle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm text-neutral-300 mb-1.5 font-medium">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent text-sm transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-neutral-300 mb-1.5 font-medium">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-neutral-400 text-sm mt-5">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition">Sign up</Link>
          </p>

          <div className="h-px bg-linear-to-r from-transparent via-white/15 to-transparent mt-6 mb-5" />

          {/* Footer */}
          <p className="text-center text-white/30 text-xs">
            © {new Date().getFullYear()} AeroGround Ops · All rights reserved
          </p>
        </div>
      </div>
    </div>
  )
}
