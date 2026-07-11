import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Maintenance from './Maintenance'

vi.mock('../components/maintenance/MaintenanceTab', () => ({
  default: () => <div data-testid="maintenance-tab">MaintenanceTab</div>,
}))

describe('Maintenance', () => {
  it('renders the page header with correct title and subtitle', () => {
    render(<Maintenance />)

    expect(screen.getByRole('heading', { name: 'Maintenance' })).toBeInTheDocument()
    expect(screen.getByText('Requests and status tracking across the fleet')).toBeInTheDocument()
  })

  it('renders the MaintenanceTab component', () => {
    render(<Maintenance />)

    expect(screen.getByTestId('maintenance-tab')).toBeInTheDocument()
  })
})