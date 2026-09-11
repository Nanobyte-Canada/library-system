import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './badge'
import { scenario } from '../../test/scenario'

describe('Badge', () => {
  it(scenario('PLATFORM-ROUTES-006', 'renders its variant text'), () => {
    render(<Badge variant="success">Available</Badge>)
    expect(screen.getByText('Available')).toBeInTheDocument()
  })
})
