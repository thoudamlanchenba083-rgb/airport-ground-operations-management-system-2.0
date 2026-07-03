import PublicNavbar from '../components/PublicNavbar'

export default function About() {
  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      <PublicNavbar active="about" />

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '5rem 2rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '2rem' }}>About AeroGround</h1>
        <p style={{ color: '#aaa', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '2rem' }}>
          AeroGround is a next-generation Airport Ground Operations Management System built to modernize how airports manage their day-to-day ground operations. From flight tracking to baggage handling, gate allocation to staff scheduling — everything in one unified platform.
        </p>
        <p style={{ color: '#aaa', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '2rem' }}>
          Built on a Django REST Framework backend with a React frontend, AeroGround integrates machine learning to predict flight delays, recommend optimal gate assignments, and flag maintenance issues before they become critical.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '3rem' }}>
          {[['Real-time', 'Live data across all airport systems updated continuously'],
            ['AI-Powered', 'Machine learning models for delay prediction and gate optimization'],
            ['Secure', 'Role-based access control with JWT authentication'],
            ['Scalable', 'Built to handle high-throughput airport environments']
          ].map(([title, desc]) => (
            <div key={title} style={{ background: '#141414', border: '1px solid #222', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h3>
              <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}