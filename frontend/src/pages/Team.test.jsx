import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Team from './Team'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderTeam() {
  return render(
    <MemoryRouter>
      <Team />
    </MemoryRouter>
  )
}

describe('Team', () => {
  it('renders the page heading', () => {
    renderTeam()

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('renders all five crew members with name, role, and channel', () => {
    renderTeam()

    const crew = [
      { name: 'Thoudam Lanchenba', role: 'Backend Developer', channel: 'BACKEND' },
      { name: 'Lakshya', role: 'Frontend Developer', channel: 'FRONTEND' },
      { name: 'Kowshika', role: 'Database Developer', channel: 'DATABASE' },
      { name: 'Shreepriyan', role: 'UI/UX Designer', channel: 'DESIGN' },
      { name: 'Naren', role: 'QA Engineer', channel: 'QA' },
    ]

    crew.forEach(({ name, role, channel }) => {
      expect(screen.getByText(name)).toBeInTheDocument()
      expect(screen.getByText(role)).toBeInTheDocument()
      expect(screen.getByText(channel)).toBeInTheDocument()
    })
  })

  it('renders a photo for each crew member with correct alt text', () => {
    renderTeam()

    expect(screen.getByAltText('Thoudam Lanchenba')).toBeInTheDocument()
    expect(screen.getByAltText('Naren')).toBeInTheDocument()
  })

  it('navigates to /login when the Launch Dashboard button is clicked', async () => {
    const user = userEvent.setup()
    renderTeam()

    await user.click(screen.getByRole('button', { name: /launch dashboard/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})