import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Staff from './Staff'

vi.mock('../components/staff/StaffTab', () => ({
  default: () => <div data-testid="staff-tab">StaffTab</div>,
}))
vi.mock('../components/staff/ShiftsTab', () => ({
  default: () => <div data-testid="shifts-tab">ShiftsTab</div>,
}))
vi.mock('../components/staff/PayrollTab', () => ({
  default: () => <div data-testid="payroll-tab">PayrollTab</div>,
}))

let mockUser = { role: 'ADMIN' }
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}))

describe('Staff', () => {
  it('renders the page header', () => {
    mockUser = { role: 'ADMIN' }
    render(<Staff />)

    expect(screen.getByRole('heading', { name: 'Staff Management' })).toBeInTheDocument()
    expect(screen.getByText('Records, roles, shifts and payroll')).toBeInTheDocument()
  })

  it('shows all three tabs and defaults to Staff for ADMIN', () => {
    mockUser = { role: 'ADMIN' }
    render(<Staff />)

    expect(screen.getByRole('button', { name: 'Staff' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Shifts' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Payroll' })).toBeInTheDocument()
    expect(screen.getByTestId('staff-tab')).toBeInTheDocument()
  })

  it('shows all three tabs and defaults to Staff for HR', () => {
    mockUser = { role: 'HR' }
    render(<Staff />)

    expect(screen.getByRole('button', { name: 'Staff' })).toBeInTheDocument()
    expect(screen.getByTestId('staff-tab')).toBeInTheDocument()
  })

  it('switches to Shifts and Payroll tabs for HR roles', async () => {
    mockUser = { role: 'HR' }
    const user = userEvent.setup()
    render(<Staff />)

    await user.click(screen.getByRole('button', { name: 'Shifts' }))
    expect(screen.getByTestId('shifts-tab')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Payroll' }))
    expect(screen.getByTestId('payroll-tab')).toBeInTheDocument()
  })

  it('only shows the Payroll tab for OPERATIONS_MANAGER', () => {
    mockUser = { role: 'OPERATIONS_MANAGER' }
    render(<Staff />)

    expect(screen.queryByRole('button', { name: 'Staff' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Shifts' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Payroll' })).toBeInTheDocument()
    expect(screen.getByTestId('payroll-tab')).toBeInTheDocument()
  })

  it('only shows the Payroll tab for SUPERVISOR', () => {
    mockUser = { role: 'SUPERVISOR' }
    render(<Staff />)

    expect(screen.queryByRole('button', { name: 'Staff' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Payroll' })).toBeInTheDocument()
    expect(screen.getByTestId('payroll-tab')).toBeInTheDocument()
  })
})