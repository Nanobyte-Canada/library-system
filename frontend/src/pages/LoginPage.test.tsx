import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { authService } from '../services/authService'
import { useAuthStore } from '../stores/authStore'
import { scenario } from '../test/scenario'

vi.mock('../services/authService', () => ({
  authService: { login: vi.fn(), logout: vi.fn() },
}))

const mockedLogin = vi.mocked(authService.login)

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>Dashboard destination</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    localStorage.clear()
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it(scenario('PLATFORM-ROUTES-005', 'renders username, password, and submit controls'), () => {
    renderLogin()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled()
  })

  it(scenario('AUTH-LOGIN-011', 'pending state disables submit'), async () => {
    mockedLogin.mockImplementation(() => new Promise(() => {}))
    renderLogin()
    await userEvent.type(screen.getByLabelText('Username'), 'pw-user')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled()
  })

  it(scenario('AUTH-LOGIN-012', 'API failure renders the generic error'), async () => {
    mockedLogin.mockRejectedValue(new Error('unauthorized'))
    renderLogin()
    await userEvent.type(screen.getByLabelText('Username'), 'pw-user')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(await screen.findByText('Login failed. Please check your credentials.')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard destination')).not.toBeInTheDocument()
  })

  it(scenario('AUTH-LOGIN-013', 'successful login stores the token and navigates'), async () => {
    mockedLogin.mockResolvedValue({
      token: 'test-token',
      user: {
        id: 'user-1',
        firstName: 'PW',
        lastName: 'User',
        role: 'MEMBER',
        email: 'pw-user@library.test',
      },
    })
    renderLogin()
    await userEvent.type(screen.getByLabelText('Username'), 'pw-user')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(await screen.findByText('Dashboard destination')).toBeInTheDocument()
    await waitFor(() => expect(window.localStorage.getItem('token')).toBe('test-token'))
  })
})
