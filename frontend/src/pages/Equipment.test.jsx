import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Equipment from './Equipment'

vi.mock('../components/equipment/EquipmentTab', () => ({
  default: () => <div data-testid="equipment-tab">EquipmentTab</div>,
}))

describe('Equipment', () => {
  it('renders the page header with correct title and subtitle', () => {
    render(<Equipment />)

    expect(screen.getByRole('heading', { name: 'Ground Equipment' })).toBeInTheDocument()
    expect(screen.getByText('Status tracking and failure-risk prediction')).toBeInTheDocument()
  })

  it('renders the EquipmentTab component', () => {
    render(<Equipment />)

    expect(screen.getByTestId('equipment-tab')).toBeInTheDocument()
  })
})