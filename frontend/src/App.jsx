import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import LandingPage from './pages/LandingPage'
import Services from './pages/Services'
import About from './pages/About'
import Team from './pages/Team'
import Dashboard from './pages/Dashboard'
import Flights from './pages/Flights'
import Gates from './pages/Gates'
import Baggage from './pages/Baggage'
import Maintenance from './pages/Maintenance'
import Equipment from './pages/Equipment'
import Staff from './pages/Staff'
import Notifications from './pages/Notifications'
import Reports from './pages/Reports'
import Chatbot from './pages/Chatbot'
import Analytics from './pages/Analytics'

function withLayout(Component, page) {
  return (
    <ProtectedRoute page={page}>
      <Layout>
        <Component />
      </Layout>
    </ProtectedRoute>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/services" element={<Services />} />
            <Route path="/about" element={<About />} />
            <Route path="/team" element={<Team />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={withLayout(Dashboard, 'dashboard')} />
            <Route path="/flights" element={withLayout(Flights, 'flights')} />
            <Route path="/gates" element={withLayout(Gates, 'gates')} />
            <Route path="/baggage" element={withLayout(Baggage, 'baggage')} />
            <Route path="/maintenance" element={withLayout(Maintenance, 'maintenance')} />
            <Route path="/equipment" element={withLayout(Equipment, 'equipment')} />
            <Route path="/staff" element={withLayout(Staff, 'staff')} />
            <Route path="/notifications" element={withLayout(Notifications, 'notifications')} />
            <Route path="/reports" element={withLayout(Reports, 'reports')} />
            <Route path="/chatbot" element={withLayout(Chatbot, 'chatbot')} />
            <Route path="/analytics" element={withLayout(Analytics, 'analytics')} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
