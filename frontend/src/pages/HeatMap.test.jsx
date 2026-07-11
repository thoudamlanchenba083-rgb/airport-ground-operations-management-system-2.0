import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import HeatMap from './HeatMap'
import axiosClient from '../api/axiosClient'

vi.mock('../api/axiosClient', () => ({
  default: {
    get: vi.fn(),
  },
}))

describe('HeatMap', () => {
  it('renders the page header with correct title and subtitle', async () => {
    axiosClient.get.mockResolvedValue({
      data: { average_score: 42, busiest_gate: 'A3', gates: [] },
    })

    render(<HeatMap />)

    expect(screen.getByRole('heading', { name: 'Airport Heat Map' })).toBeInTheDocument()
    expect(screen.getByText('Live gate congestion scoring')).toBeInTheDocument()
    await screen.findByText('42%')
  })

  it('renders gate data and summary stats from the API', async () => {
    axiosClient.get.mockResolvedValue({
      data: {
        average_score: 55,
        busiest_gate: 'B2',
        gates: [
          { gate_number: 'B2', terminal: 'Terminal 1', score: 88, level: 'high', flights_handled_today: 6, delayed_tasks_today: 2 },
        ],
      },
    })

    render(<HeatMap />)

    const matches = await screen.findAllByText('B2')
    expect(matches.length).toBeGreaterThan(0)
    expect(screen.getByText('55%')).toBeInTheDocument()
    expect(screen.getByText('88%')).toBeInTheDocument()
    await screen.findByText(/Live · updated/i)
  })

  it('shows an error message when the API call fails', async () => {
    axiosClient.get.mockRejectedValue(new Error('network error'))

    render(<HeatMap />)

    expect(await screen.findByText('Could not load heat map data.')).toBeInTheDocument()
  })
})