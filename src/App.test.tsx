import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'
import { TABS } from './tabs/tabs'

describe('App', () => {
  it('muestra las seis pestañas', () => {
    render(<App />)
    expect(screen.getAllByRole('tab')).toHaveLength(6)
    expect(TABS).toHaveLength(6)
  })

  it('cambia de pestaña al hacer clic', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /Juegos/ }))
    expect(screen.getByRole('tab', { name: /Juegos/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Juegos' })).toBeInTheDocument()
    expect(screen.getByText('Próximamente')).toBeInTheDocument()
  })
})
