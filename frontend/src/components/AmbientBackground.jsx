export default function AmbientBackground() {
  return (
    <>
      <div
        className="liquid-blob"
        style={{
          top: '-16%', left: '-8%', width: '42rem', height: '26rem',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.75), transparent 72%)',
          animationDelay: '0s',
        }}
      />
      <div
        className="liquid-blob"
        style={{
          top: '-4%', left: '30%', width: '30rem', height: '18rem',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.55), transparent 72%)',
          animationDelay: '-5s',
        }}
      />
      <div
        className="liquid-blob"
        style={{
          top: '2%', right: '-14%', width: '36rem', height: '24rem',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.62), transparent 72%)',
          animationDelay: '-8s',
        }}
      />
      <div
        className="liquid-blob"
        style={{
          bottom: '-16%', left: '28%', width: '40rem', height: '26rem',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.6), transparent 72%)',
          animationDelay: '-14s',
        }}
      />
      <div
        className="liquid-blob"
        style={{
          bottom: '10%', right: '4%', width: '28rem', height: '20rem',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.5), transparent 72%)',
          animationDelay: '-19s',
        }}
      />
      <div
        className="liquid-blob"
        style={{
          top: '38%', left: '48%', width: '26rem', height: '16rem',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.35), transparent 72%)',
          animationDelay: '-25s',
        }}
      />
    </>
  )
}
