import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import About from './About'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderAbout() {
  return render(
    <MemoryRouter>
      <About />
    </MemoryRouter>
  )
}

describe('About', () => {
  it('renders the page title and mission copy', () => {
    renderAbout()

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/modernizes how airports run day-to-day ground operations/i)).toBeInTheDocument()
  })

  it('renders all six pillar cards', () => {
    renderAbout()

    const pillarTitles = ['Real-Time', 'AI-Powered', 'Secure', 'Scalable', 'Fully Audited', 'One Platform']
    pillarTitles.forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument()
    })
  })

  it('renders the tech stack chips', () => {
    renderAbout()

    expect(screen.getByText('Django 5')).toBeInTheDocument()
    expect(screen.getByText('React 19')).toBeInTheDocument()
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument()
  })

  it('navigates to /login when the Launch Dashboard button is clicked', async () => {
    const user = userEvent.setup()
    renderAbout()

    await user.click(screen.getByRole('button', { name: /launch dashboard/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})