import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import EquipmentHealth from './EquipmentHealth'
import axiosClient from '../api/axiosClient'

vi.mock('../api/axiosClient', () => ({
  default: {
    get: vi.fn(),
  },
}))

describe('EquipmentHealth', () => {
  it('renders the page header and shows a loading state initially', async () => {
    axiosClient.get.mockResolvedValue({ data: [] })

    render(<EquipmentHealth />)

    expect(screen.getByRole('heading', { name: 'Equipment Health Score' })).toBeInTheDocument()
    expect(screen.getByText('Predictive maintenance across the fleet')).toBeInTheDocument()
    expect(screen.getByText('Loading fleet health…')).toBeInTheDocument()
    await screen.findByText('No equipment found.')
  })

  it('renders fleet summary stats and equipment cards from the API', async () => {
    axiosClient.get.mockResolvedValue({
      data: [
        { id: 1, equipment_id: 'TUG-04', equipment_type: 'Baggage Tug', risk: 'High', health_score: 40, usage_score: 80, runtime_hours: 1200, maintenance_required: true, urgency: 'Urgent' },
        { id: 2, equipment_id: 'GPU-11', equipment_type: 'Ground Power Unit', risk: 'Low', health_score: 90, usage_score: 30, runtime_hours: 300, maintenance_required: false, urgency: '' },
      ],
    })

    render(<EquipmentHealth />)

    expect(await screen.findByText('TUG-04')).toBeInTheDocument()
    expect(screen.getByText('GPU-11')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // fleet size
    expect(screen.getByText('65%')).toBeInTheDocument() // avg health (40+90)/2
    await screen.findByText(/Updated/i)
  })

  it('shows an error message when the API call fails', async () => {
    axiosClient.get.mockRejectedValue(new Error('network error'))

    render(<EquipmentHealth />)

    expect(await screen.findByText('Could not load equipment health scores.')).toBeInTheDocument()
  })
})