import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Gates from './Gates'

vi.mock('../components/gates/GatesTab', () => ({
  default: () => <div data-testid="gates-tab">GatesTab</div>,
}))

describe('Gates', () => {
  it('renders the page header with correct title and subtitle', () => {
    render(<Gates />)

    expect(screen.getByRole('heading', { name: 'Gates' })).toBeInTheDocument()
    expect(screen.getByText('Assignments and availability across all terminals')).toBeInTheDocument()
  })

  it('renders the GatesTab component', () => {
    render(<Gates />)

    expect(screen.getByTestId('gates-tab')).toBeInTheDocument()
  })
})