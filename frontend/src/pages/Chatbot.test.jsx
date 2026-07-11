import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Chatbot from './Chatbot'
import axiosClient from '../api/axiosClient'

// jsdom does not implement scrollIntoView; Chatbot calls it whenever the
// message list changes.
window.HTMLElement.prototype.scrollIntoView = vi.fn()

vi.mock('../api/axiosClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

let mockUser = { role: 'ADMIN' }
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}))

function mockDefaultResponses() {
  axiosClient.get.mockImplementation((url) => {
    if (url === '/ai/chat/') return Promise.resolve({ data: [] })
    if (url === '/ai/schedule/') return Promise.resolve({ data: { active: false } })
    return Promise.resolve({ data: {} })
  })
}

describe('Chatbot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { role: 'ADMIN' }
    localStorage.clear()
  })

  it('renders the page header and an empty-state message once loaded', async () => {
    mockDefaultResponses()

    render(<Chatbot />)

    expect(screen.getByRole('heading', { name: 'AeroGround AI' })).toBeInTheDocument()
    expect(await screen.findByText(/No messages yet/i)).toBeInTheDocument()
  })

  it('renders chat history returned from the API', async () => {
    axiosClient.get.mockImplementation((url) => {
      if (url === '/ai/chat/') {
        return Promise.resolve({
          data: [{ id: 1, role: 'user', content: "what's the status of AI202", created_at: new Date().toISOString() }],
        })
      }
      if (url === '/ai/schedule/') return Promise.resolve({ data: { active: false } })
      return Promise.resolve({ data: {} })
    })

    render(<Chatbot />)

    expect(await screen.findByText("what's the status of AI202")).toBeInTheDocument()
  })

  it('sends a message and displays the assistant reply', async () => {
    mockDefaultResponses()
    axiosClient.post.mockResolvedValue({
      data: { id: 2, role: 'assistant', content: 'AI202 is on time.', created_at: new Date().toISOString() },
    })
    const user = userEvent.setup()

    render(<Chatbot />)
    await screen.findByText(/No messages yet/i)

    await user.type(screen.getByPlaceholderText(/ask about a flight/i), 'status of AI202')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(await screen.findByText('AI202 is on time.')).toBeInTheDocument()
    expect(axiosClient.post).toHaveBeenCalledWith('/ai/chat/send/', expect.objectContaining({ content: 'status of AI202' }))
  })

  it('hides the upload button for VIEWER role', async () => {
    mockUser = { role: 'VIEWER' }
    mockDefaultResponses()

    render(<Chatbot />)

    await screen.findByText(/No messages yet/i)
    expect(screen.queryByRole('button', { name: /upload sheet/i })).not.toBeInTheDocument()
    expect(screen.getByText(/view only/i)).toBeInTheDocument()
  })

  it('shows the upload button for non-VIEWER roles', async () => {
    mockDefaultResponses()

    render(<Chatbot />)

    await screen.findByText(/No messages yet/i)
    expect(screen.getByRole('button', { name: /upload sheet/i })).toBeInTheDocument()
  })
})