export default function AmbientBackground() {
  return (
    <>
      <div
        className="liquid-blob"
        style={{
          top: '-10%', left: '-6%', width: '38rem', height: '38rem',
          background: 'radial-gradient(circle, rgba(59,130,246,0.35), transparent 70%)',
          animationDelay: '0s',
        }}
      />
      <div
        className="liquid-blob"
        style={{
          top: '5%', right: '-10%', width: '34rem', height: '34rem',
          background: 'radial-gradient(circle, rgba(168,85,247,0.28), transparent 70%)',
          animationDelay: '-8s',
        }}
      />
      <div
        className="liquid-blob"
        style={{
          bottom: '-15%', left: '30%', width: '40rem', height: '40rem',
          background: 'radial-gradient(circle, rgba(16,185,129,0.22), transparent 70%)',
          animationDelay: '-14s',
        }}
      />
    </>
  )
}
