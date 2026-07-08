import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'

const mockLogin = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )
}

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a validation error when fields are empty', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/please enter both username and password/i)).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('calls login and redirects to dashboard on valid submit', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue({})
    renderLogin()

    await user.type(screen.getByPlaceholderText(/enter your username/i), 'testuser')
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123')
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows an error message on failed login', async () => {
    const user = userEvent.setup()
    mockLogin.mockRejectedValue({
      response: { data: { detail: 'Invalid credentials provided.' } },
    })
    renderLogin()

    await user.type(screen.getByPlaceholderText(/enter your username/i), 'testuser')
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/invalid credentials provided/i)).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})