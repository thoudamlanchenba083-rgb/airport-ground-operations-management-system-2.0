import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Services from './Services'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderServices() {
  return render(
    <MemoryRouter>
      <Services />
    </MemoryRouter>
  )
}

describe('Services', () => {
  it('renders the page heading and all 20 services by default', () => {
    renderServices()

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText('20 services')).toBeInTheDocument()
    expect(screen.getByText('Flight Management')).toBeInTheDocument()
    expect(screen.getByText('AeroGround AI')).toBeInTheDocument()
  })

  it('renders all category tabs', () => {
    renderServices()

    const tabs = ['All Services', 'Flight & Gate Ops', 'Aircraft Servicing', 'Ground & Ramp', 'Workforce', 'Safety & Intelligence']
    tabs.forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    })
  })

  it('filters services when a category tab is clicked', async () => {
    const user = userEvent.setup()
    renderServices()

    await user.click(screen.getByRole('button', { name: 'Flight & Gate Ops' }))

    expect(screen.getByText('2 services')).toBeInTheDocument()
    expect(screen.getByText('Flight Management')).toBeInTheDocument()
    expect(screen.getByText('Gate Operations')).toBeInTheDocument()
    expect(screen.queryByText('Fuel Management')).not.toBeInTheDocument()
  })

  it('resets back to all services when "All Services" is clicked again', async () => {
    const user = userEvent.setup()
    renderServices()

    await user.click(screen.getByRole('button', { name: 'Workforce' }))
    expect(screen.getByText('2 services')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'All Services' }))
    expect(screen.getByText('20 services')).toBeInTheDocument()
  })

  it('navigates to /login when the Launch Dashboard button is clicked', async () => {
    const user = userEvent.setup()
    renderServices()

    await user.click(screen.getByRole('button', { name: /launch dashboard/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})