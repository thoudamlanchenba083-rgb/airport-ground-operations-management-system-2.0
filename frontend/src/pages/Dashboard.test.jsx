import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'
import axiosClient from '../api/axiosClient'

// Mock everything Dashboard.jsx pulls in besides its own logic, so this
// test exercises Dashboard's data-fetching/rendering behavior in isolation.
vi.mock('../api/axiosClient')

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { username: 'testuser', role: 'ADMIN' } }),
}))

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}))

vi.mock('../hooks/usePageMeta', () => ({
  default: () => {},
}))

vi.mock('../components/DelayCausesCard', () => ({
  default: () => <div>DelayCausesCard</div>,
}))

const mockFlight = {
  id: 1,
  flight_number: 'AI101',
  airline_name: 'Air India',
  origin: 'DEL',
  destination: 'BOM',
  status: 'SCHEDULED',
  scheduled_departure: '2026-07-08T10:00:00Z',
  arrival_time: '2026-07-08T12:00:00Z',
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  )
}
describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading indicator while flights are being fetched', () => {
    // Never resolves during this test - simulates the "in flight" moment
    axiosClient.get.mockReturnValue(new Promise(() => {}))

    renderDashboard()

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders fetched flight data in the recent flights table', async () => {
    axiosClient.get.mockImplementation((url) => {
      if (url === '/flights/flights/') return Promise.resolve({ data: [mockFlight] })
      if (url === '/gates/gates/') return Promise.resolve({ data: [] })
      if (url === '/staff/staff/') return Promise.resolve({ data: [] })
      if (url === '/maintenance/maintenance/') return Promise.resolve({ data: [] })
      if (url === '/ai/predictions/dashboard/') return Promise.resolve({ data: {} })
      return Promise.reject(new Error(`Unhandled URL in test: ${url}`))
    })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('AI101')).toBeInTheDocument()
    })
    expect(screen.getByText('Air India')).toBeInTheDocument()
  })

  it('shows an error message when the flights request fails', async () => {
    axiosClient.get.mockImplementation((url) => {
      if (url === '/flights/flights/') return Promise.reject(new Error('Network error'))
      return Promise.resolve({ data: [] })
    })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText(/failed to load flight data/i)).toBeInTheDocument()
    })
  })

  it('shows an empty state when there are no flights', async () => {
    axiosClient.get.mockResolvedValue({ data: [] })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText(/no flights available/i)).toBeInTheDocument()
    })
  })

  it('greets the logged-in user by username', async () => {
    axiosClient.get.mockResolvedValue({ data: [] })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText(/welcome back, testuser/i)).toBeInTheDocument()
    })
  })
})