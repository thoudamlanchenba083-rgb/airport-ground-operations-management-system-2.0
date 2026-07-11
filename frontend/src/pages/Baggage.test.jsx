import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Baggage from './Baggage'

vi.mock('../components/baggage/BaggageTab', () => ({
  default: () => <div data-testid="baggage-tab">BaggageTab</div>,
}))

describe('Baggage', () => {
  it('renders the page header with correct title and subtitle', () => {
    render(<Baggage />)

    expect(screen.getByRole('heading', { name: 'Baggage' })).toBeInTheDocument()
    expect(screen.getByText('Track handling status across every flight')).toBeInTheDocument()
  })

  it('renders the BaggageTab component', () => {
    render(<Baggage />)

    expect(screen.getByTestId('baggage-tab')).toBeInTheDocument()
  })
})