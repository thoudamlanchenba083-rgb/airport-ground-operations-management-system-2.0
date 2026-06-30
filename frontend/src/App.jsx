import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import Flights from './pages/Flights'
import Gates from './pages/Gates'
import Baggage from './pages/Baggage'
import Maintenance from './pages/Maintenance'
import Staff from './pages/Staff'
import Notifications from './pages/Notifications'
import Reports from './pages/Reports'

function withLayout(Component) {
  return (
    <ProtectedRoute>
      <Layout>
        <Component />
      </Layout>
    </ProtectedRoute>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={withLayout(Dashboard)} />
          <Route path="/flights" element={withLayout(Flights)} />
          <Route path="/gates" element={withLayout(Gates)} />
          <Route path="/baggage" element={withLayout(Baggage)} />
          <Route path="/maintenance" element={withLayout(Maintenance)} />
          <Route path="/staff" element={withLayout(Staff)} />
          <Route path="/notifications" element={withLayout(Notifications)} />
          <Route path="/reports" element={withLayout(Reports)} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

