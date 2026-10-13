import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'
import { TABS } from './tabs/tabs'

// jsdom no tiene canvas ni WebGL: las estructuras se sustituyen por marcadores.
vi.mock('./components/Structure2D', () => ({ Structure2D: () => <div data-testid="structure-2d" /> }))
vi.mock('./components/MolViewer', () => ({
  MolViewer: () => <div data-testid="mol-viewer" />,
  aminoAcidMolecule: () => ({ kind: 'sdf', url: '' }),
}))

describe('App', () => {
  it('muestra las seis pestañas', () => {
    render(<App />)
    expect(screen.getAllByRole('tab')).toHaveLength(6)
    expect(TABS).toHaveLength(6)
  })

  it('abre en la pestaña de clasificación', () => {
    render(<App />)
    expect(screen.getByRole('tab', { name: /Clasificación/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Los 20 aminoácidos' })).toBeInTheDocument()
  })

  it('cambia de pestaña al hacer clic', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /Juegos/ }))
    expect(screen.getByRole('tab', { name: /Juegos/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Juegos' })).toBeInTheDocument()
    expect(screen.getByText('Próximamente')).toBeInTheDocument()
  })
})
