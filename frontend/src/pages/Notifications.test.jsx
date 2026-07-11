import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Notifications from './Notifications'
import axiosClient from '../api/axiosClient'

vi.mock('../api/axiosClient', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('Notifications', () => {
  it('renders the page header with correct title and subtitle', async () => {
    axiosClient.get.mockResolvedValue({ data: [] })

    render(<Notifications />)

    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
    expect(screen.getByText('System alerts across every operation')).toBeInTheDocument()
    await screen.findByText('No notifications found.')
  })

  it('renders notifications returned from the API', async () => {
    axiosClient.get.mockResolvedValue({
      data: [
        { id: 1, type: 'FLIGHT', message: 'Flight AG204 delayed 20 minutes', is_read: false, created_at: '2026-07-11T10:00:00Z' },
      ],
    })

    render(<Notifications />)

    expect(await screen.findByText('Flight AG204 delayed 20 minutes')).toBeInTheDocument()
    expect(screen.getByText('1 unread')).toBeInTheDocument()
  })

  it('shows an empty state when there are no notifications', async () => {
    axiosClient.get.mockResolvedValue({ data: [] })

    render(<Notifications />)

    expect(await screen.findByText('No notifications found.')).toBeInTheDocument()
  })
})