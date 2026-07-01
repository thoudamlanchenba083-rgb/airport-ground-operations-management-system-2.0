import { useNavigate } from 'react-router-dom'

const team = [
  { name: 'Operations Lead',    role: 'System Architecture & Backend',   icon: '👨‍💻' },
  { name: 'Frontend Engineer',  role: 'React UI & Dashboard Design',     icon: '🎨' },
  { name: 'ML Engineer',        role: 'AI Models & Prediction Engine',   icon: '🤖' },
  { name: 'DevOps Engineer',    role: 'Deployment & Infrastructure',     icon: '⚙️' },
]

export default function Team() {
  const navigate = useNavigate()
  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      <nav style={{ borderBottom: '1px solid #222', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <span style={{ fontSize: '1.2rem' }}>✈</span>
          <span style={{ fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.9rem' }}>AIRPORT OPS</span>
        </div>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <span style={{ cursor: 'pointer', color: '#aaa', fontSize: '0.85rem' }} onClick={() => navigate('/')}>Home</span>
          <span style={{ cursor: 'pointer', color: '#aaa', fontSize: '0.85rem' }} onClick={() => navigate('/services')}>Services</span>
          <span style={{ cursor: 'pointer', color: '#aaa', fontSize: '0.85rem' }} onClick={() => navigate('/about')}>About</span>
          <span style={{ cursor: 'pointer', color: 'white', fontSize: '0.85rem', borderBottom: '1px solid white', paddingBottom: '2px' }}>Team</span>
          <button onClick={() => navigate('/login')} style={{ background: 'white', color: 'black', border: 'none', borderRadius: '6px', padding: '0.4rem 1rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>Launch →</button>
        </div>
      </nav>

      <div style={{ textAlign: 'center', padding: '5rem 2rem 3rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem' }}>Our Team</h1>
        <p style={{ color: '#888', fontSize: '1.1rem' }}>The people behind AeroGround.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', maxWidth: '900px', margin: '0 auto', padding: '0 2rem 6rem' }}>
        {team.map((m) => (
          <div key={m.name} style={{ background: '#141414', border: '1px solid #222', borderRadius: '12px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{m.icon}</div>
            <h3 style={{ fontWeight: 700, marginBottom: '0.4rem' }}>{m.name}</h3>
            <p style={{ color: '#888', fontSize: '0.85rem' }}>{m.role}</p>
          </div>
        ))}
      </div>
    </div>
  )
}