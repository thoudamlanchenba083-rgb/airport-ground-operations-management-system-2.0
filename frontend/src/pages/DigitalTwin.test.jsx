import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DigitalTwin from './DigitalTwin'

vi.mock('../components/digitaltwin/DigitalTwinMap', () => ({
  default: () => <div data-testid="digital-twin-map">DigitalTwinMap</div>,
}))

vi.mock('../components/digitaltwin/WhatIfSimulator', () => ({
  default: () => <div data-testid="what-if-simulator">WhatIfSimulator</div>,
}))

describe('DigitalTwin', () => {
  it('renders the page header with correct title and subtitle', () => {
    render(<DigitalTwin />)

    expect(screen.getByRole('heading', { name: 'Airport Digital Twin' })).toBeInTheDocument()
    expect(screen.getByText('Live gate occupancy and equipment positions')).toBeInTheDocument()
  })

  it('renders the DigitalTwinMap and WhatIfSimulator components', () => {
    render(<DigitalTwin />)

    expect(screen.getByTestId('digital-twin-map')).toBeInTheDocument()
    expect(screen.getByTestId('what-if-simulator')).toBeInTheDocument()
  })
})