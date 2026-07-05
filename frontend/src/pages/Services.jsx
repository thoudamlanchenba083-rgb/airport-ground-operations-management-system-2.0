import { useNavigate } from "react-router-dom"
import PublicNavbar from "../components/PublicNavbar"

const services = [
  { icon: "Flights", title: "Flight Management", desc: "Real-time tracking of all arrivals, departures, and gate assignments across every terminal." },
  { icon: "Gates", title: "Gate Operations", desc: "Automated gate allocation, conflict detection, and live availability monitoring." },
  { icon: "Baggage", title: "Baggage Handling", desc: "End-to-end baggage tracking from check-in to carousel with live status updates." },
  { icon: "Maintenance", title: "Maintenance Control", desc: "Scheduled and unscheduled maintenance request management with priority queues." },
  { icon: "Staff", title: "Staff Management", desc: "Shift planning, role assignment, and workforce allocation across all ground zones." },
  { icon: "AI", title: "AeroGround AI", desc: "Intelligent chatbot for instant queries on flight status, delays, gates, and staffing." },
]

export default function Services() {
  const navigate = useNavigate()
  return (
    <div style={{ backgroundColor: "#0a0a0a", minHeight: "100vh", color: "white", fontFamily: "system-ui, sans-serif" }}>
      <PublicNavbar active="services" />

      <div style={{ textAlign: "center", padding: "5rem 2rem 3rem" }}>
        <h1 style={{ fontSize: "3rem", fontWeight: 800, marginBottom: "1rem" }}>Our Services</h1>
        <p style={{ color: "#888", fontSize: "1.1rem", maxWidth: "500px", margin: "0 auto" }}>
          Everything you need to run a modern airport ground operations center.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", maxWidth: "1100px", margin: "0 auto", padding: "0 2rem 6rem" }}>
        {services.map((s) => (
          <div key={s.title} style={{ background: "#141414", border: "1px solid #222", borderRadius: "12px", padding: "2rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#3b82f6", letterSpacing: "0.15em", marginBottom: "1rem" }}>{s.icon.toUpperCase()}</div>
            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", fontSize: "1.1rem" }}>{s.title}</h3>
            <p style={{ color: "#888", fontSize: "0.9rem", lineHeight: 1.6 }}>{s.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", paddingBottom: "4rem" }}>
        <button onClick={() => navigate("/login")} style={{ background: "white", color: "black", border: "none", padding: "0.8rem 2.5rem", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}>
          Launch Dashboard
        </button>
      </div>
    </div>
  )
}