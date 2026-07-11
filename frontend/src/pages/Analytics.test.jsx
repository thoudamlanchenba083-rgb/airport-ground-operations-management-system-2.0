import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Analytics from './Analytics'
import axiosClient from '../api/axiosClient'

vi.mock('../api/axiosClient', () => ({
  default: {
    get: vi.fn(),
  },
}))

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}))

function mockEmptyResponses() {
  axiosClient.get.mockImplementation((url) => {
    if (url === '/flights/flights/') return Promise.resolve({ data: [] })
    if (url === '/gates/gates/') return Promise.resolve({ data: [] })
    if (url === '/staff/staff/') return Promise.resolve({ data: [] })
    if (url === '/maintenance/maintenance/') return Promise.resolve({ data: [] })
    return Promise.resolve({ data: [] })
  })
}

describe('Analytics', () => {
  it('renders the page header and a loading state initially', async () => {
    mockEmptyResponses()

    render(<Analytics />)

    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument()
    expect(screen.getByText('Loading analytics…')).toBeInTheDocument()
    await screen.findByText('No flight data yet.')
  })

  it('renders stat pills with counts once data loads', async () => {
    axiosClient.get.mockImplementation((url) => {
      if (url === '/flights/flights/') return Promise.resolve({ data: [{ id: 1, status: 'On Time' }, { id: 2, status: 'Delayed' }] })
      if (url === '/gates/gates/') return Promise.resolve({ data: [{ id: 1, is_available: true }] })
      if (url === '/staff/staff/') return Promise.resolve({ data: [{ id: 1, staff_type: 'Ground Crew' }] })
      if (url === '/maintenance/maintenance/') return Promise.resolve({ data: [{ id: 1, priority: 'High', status: 'Open' }] })
      return Promise.resolve({ data: [] })
    })

    render(<Analytics />)

    expect(await screen.findByText('Total Flights')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getAllByText('1').length).toBeGreaterThan(0)
  })

  it('shows empty-state messages when there is no data', async () => {
    mockEmptyResponses()

    render(<Analytics />)

    expect(await screen.findByText('No flight data yet.')).toBeInTheDocument()
    expect(screen.getByText('No gate data yet.')).toBeInTheDocument()
    expect(screen.getByText('No maintenance data yet.')).toBeInTheDocument()
    expect(screen.getByText('No staff data yet.')).toBeInTheDocument()
    expect(screen.getByText('No timeline data yet.')).toBeInTheDocument()
    expect(screen.getByText('No data yet.')).toBeInTheDocument()
  })

  it('refetches data when the Refresh button is clicked', async () => {
    mockEmptyResponses()
    const user = userEvent.setup()

    render(<Analytics />)
    await screen.findByText('No flight data yet.')

    const callsBefore = axiosClient.get.mock.calls.length
    await user.click(screen.getByRole('button', { name: /refresh/i }))

    expect(axiosClient.get.mock.calls.length).toBeGreaterThan(callsBefore)
  })
})