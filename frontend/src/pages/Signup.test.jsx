import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Signup from './Signup'
import axiosClient from '../api/axiosClient'

vi.mock('../api/axiosClient')

vi.mock('../hooks/usePageMeta', () => ({
  default: () => {},
}))

function renderSignup() {
  return render(
    <MemoryRouter>
      <Signup />
    </MemoryRouter>
  )
}

// Fills in the form fields we care about via their labels, leaving room
// for each test to override specific fields (e.g. a mismatched confirm).
// Also ticks the required Terms & Privacy consent checkbox, since that's
// part of the normal signup flow.
async function fillForm(user, { username = 'newuser', password = 'password123', confirm = 'password123', agree = true } = {}) {
  await user.type(screen.getByPlaceholderText(/choose a username/i), username)
  await user.type(screen.getByPlaceholderText(/at least 8 characters/i), password)
  await user.type(screen.getByPlaceholderText(/re-enter password/i), confirm)
  if (agree) {
    await user.click(screen.getByRole('checkbox'))
  }
}

describe('Signup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a validation error when required fields are empty', async () => {
    const user = userEvent.setup()
    renderSignup()

    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/please fill in all required fields/i)).toBeInTheDocument()
    expect(axiosClient.post).not.toHaveBeenCalled()
  })

  it('shows a validation error when password is too short', async () => {
    const user = userEvent.setup()
    renderSignup()

    await fillForm(user, { password: 'short', confirm: 'short' })
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
    expect(axiosClient.post).not.toHaveBeenCalled()
  })

  it('shows a validation error when passwords do not match', async () => {
    const user = userEvent.setup()
    renderSignup()

    await fillForm(user, { password: 'password123', confirm: 'password456' })
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
    expect(axiosClient.post).not.toHaveBeenCalled()
  })

  it('shows a validation error when terms are not accepted', async () => {
    const user = userEvent.setup()
    renderSignup()

    await fillForm(user, { agree: false })
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/accept the terms/i)).toBeInTheDocument()
    expect(axiosClient.post).not.toHaveBeenCalled()
  })
})
describe('Signup — API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls the register API with form data on valid submit', async () => {
    const user = userEvent.setup()
    axiosClient.post.mockResolvedValue({ data: { id: 1 } })
    renderSignup()

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(axiosClient.post).toHaveBeenCalledWith('/accounts/register/', expect.objectContaining({
        username: 'newuser',
        password: 'password123',
      }))
    })
  })

  it('shows a success message after successful registration', async () => {
    const user = userEvent.setup()
    axiosClient.post.mockResolvedValue({ data: { id: 1 } })
    renderSignup()

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/account created/i)).toBeInTheDocument()
  })

  it('shows an error message when registration fails', async () => {
    const user = userEvent.setup()
    axiosClient.post.mockRejectedValue({
      response: { data: { username: ['This username is already taken.'] } },
    })
    renderSignup()

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/already taken/i)).toBeInTheDocument()
  })
})