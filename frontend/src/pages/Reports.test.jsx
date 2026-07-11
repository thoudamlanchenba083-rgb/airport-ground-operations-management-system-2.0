import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Reports from './Reports'

vi.mock('../components/reports/ReportsTab', () => ({
  default: () => <div data-testid="reports-tab">ReportsTab</div>,
}))

describe('Reports', () => {
  it('renders the page header with correct title and subtitle', () => {
    render(<Reports />)

    expect(screen.getByRole('heading', { name: 'Reports' })).toBeInTheDocument()
    expect(screen.getByText('Operational reports and performance analytics')).toBeInTheDocument()
  })

  it('renders the ReportsTab component', () => {
    render(<Reports />)

    expect(screen.getByTestId('reports-tab')).toBeInTheDocument()
  })
})