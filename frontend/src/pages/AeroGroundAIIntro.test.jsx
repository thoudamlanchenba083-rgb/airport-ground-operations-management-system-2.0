import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AeroGroundAIIntro from './AeroGroundAIIntro'

function renderIntro() {
  return render(
    <MemoryRouter>
      <AeroGroundAIIntro />
    </MemoryRouter>
  )
}

describe('AeroGroundAIIntro', () => {
  it('renders the hero heading', () => {
    renderIntro()

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('renders all eight capability cards', () => {
    renderIntro()

    const titles = [
      'Delay Forecast', 'Weather Alerts', 'Maintenance Alerts', 'Passenger Rush Prediction',
      'Staff Shortage Forecast', 'Resource Forecast', 'Gate Recommendation', 'AeroGround AI Assistant',
    ]
    titles.forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument()
    })
  })

  it('renders all four design principle cards', () => {
    renderIntro()

    const titles = ['Real data first', 'Built for a live dashboard', 'Confidence, not certainty', 'One shared flight window']
    titles.forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument()
    })
  })

  it('links back to the dashboard and to the chatbot', () => {
    renderIntro()

    expect(screen.getByRole('link', { name: /ask the assistant/i })).toHaveAttribute('href', '/chatbot')
    expect(screen.getByRole('link', { name: /back to dashboard/i })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
  })
})