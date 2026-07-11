import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Flights from './Flights'

vi.mock('../components/flights/AirlinesTab', () => ({
  default: () => <div data-testid="airlines-tab">AirlinesTab</div>,
}))
vi.mock('../components/flights/AircraftTab', () => ({
  default: () => <div data-testid="aircraft-tab">AircraftTab</div>,
}))
vi.mock('../components/flights/FlightsTab', () => ({
  default: () => <div data-testid="flights-tab">FlightsTab</div>,
}))
vi.mock('../components/flights/TurnaroundTab', () => ({
  default: () => <div data-testid="turnaround-tab">TurnaroundTab</div>,
}))
vi.mock('../components/flights/CargoTab', () => ({
  default: () => <div data-testid="cargo-tab">CargoTab</div>,
}))

describe('Flights', () => {
  it('renders the page header and the Flights tab by default', () => {
    render(<Flights />)

    expect(screen.getByRole('heading', { name: 'Flights Management' })).toBeInTheDocument()
    expect(screen.getByText('Flights, airlines and aircraft in one place')).toBeInTheDocument()
    expect(screen.getByTestId('flights-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('cargo-tab')).not.toBeInTheDocument()
  })

  it('renders all five tab buttons', () => {
    render(<Flights />)

    const labels = ['Flights', 'Turnaround', 'Cargo', 'Airlines', 'Aircraft']
    labels.forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    })
  })

  it('switches to the Turnaround tab when clicked', async () => {
    const user = userEvent.setup()
    render(<Flights />)

    await user.click(screen.getByRole('button', { name: 'Turnaround' }))

    expect(screen.getByTestId('turnaround-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('flights-tab')).not.toBeInTheDocument()
  })

  it('switches to the Cargo tab when clicked', async () => {
    const user = userEvent.setup()
    render(<Flights />)

    await user.click(screen.getByRole('button', { name: 'Cargo' }))

    expect(screen.getByTestId('cargo-tab')).toBeInTheDocument()
  })

  it('switches to the Airlines tab when clicked', async () => {
    const user = userEvent.setup()
    render(<Flights />)

    await user.click(screen.getByRole('button', { name: 'Airlines' }))

    expect(screen.getByTestId('airlines-tab')).toBeInTheDocument()
  })

  it('switches to the Aircraft tab when clicked', async () => {
    const user = userEvent.setup()
    render(<Flights />)

    await user.click(screen.getByRole('button', { name: 'Aircraft' }))

    expect(screen.getByTestId('aircraft-tab')).toBeInTheDocument()
  })
})