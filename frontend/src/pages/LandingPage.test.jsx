import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LandingPage from './LandingPage'

// jsdom does not implement IntersectionObserver; the Reveal and Counter
// helpers on this page both rely on it.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.IntersectionObserver = MockIntersectionObserver

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../components/legal/LegalModal', () => ({
  default: ({ open, initialTab }) =>
    open ? <div data-testid="legal-modal">{initialTab}</div> : null,
}))

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  )
}

describe('LandingPage', () => {
  it('renders the hero heading', () => {
    renderLanding()

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('navigates to /login when the nav Launch button is clicked', async () => {
    const user = userEvent.setup()
    renderLanding()

    await user.click(screen.getByRole('button', { name: 'Launch →', hidden: true }))

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('toggles the mobile nav menu open and closed', async () => {
    const user = userEvent.setup()
    renderLanding()

    const toggle = screen.getByRole('button', { name: /toggle menu/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Launch Dashboard →' })).toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('navigates and closes the mobile menu when a mobile nav link is clicked', async () => {
    const user = userEvent.setup()
    renderLanding()

    await user.click(screen.getByRole('button', { name: /toggle menu/i }))
    await user.click(screen.getByRole('button', { name: 'Launch Dashboard →' }))

    expect(mockNavigate).toHaveBeenCalledWith('/login')
    expect(screen.queryByRole('button', { name: 'Launch Dashboard →' })).not.toBeInTheDocument()
  })

  it('opens the legal modal on the correct tab when a footer link is clicked', async () => {
    const user = userEvent.setup()
    renderLanding()

    expect(screen.queryByTestId('legal-modal')).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Privacy Policy' }))

    expect(screen.getByTestId('legal-modal')).toHaveTextContent('privacy')
  })
})