import { fireEvent, render, screen, within } from '@testing-library/react'
import { ClassificationTab } from './ClassificationTab'

// jsdom no tiene canvas ni WebGL: las estructuras se sustituyen por marcadores.
vi.mock('../../components/Structure2D', () => ({
  Structure2D: ({ ariaLabel }: { ariaLabel?: string }) => <div role="img" aria-label={ariaLabel} />,
}))
vi.mock('../../components/MolViewer', () => ({
  MolViewer: ({ molecule }: { molecule: { aminoAcid?: { name: string } } }) => (
    <div data-testid="mol-viewer">{molecule.aminoAcid?.name}</div>
  ),
  aminoAcidMolecule: (aminoAcid: { name: string }) => ({ kind: 'sdf', url: '', aminoAcid }),
}))

const cards = () => screen.queryAllByRole('listitem')

describe('ClassificationTab', () => {
  it('muestra los 20 aminoácidos en sus cinco grupos', () => {
    render(<ClassificationTab />)
    expect(cards()).toHaveLength(20)
    const aromatic = screen.getByRole('region', { name: /Aromáticos/ })
    expect(within(aromatic).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('region', { name: /Cargados negativamente/ })).toBeInTheDocument()
  })

  it('filtra con el buscador y los chips', () => {
    render(<ClassificationTab />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'glutamico' } })
    expect(cards()).toHaveLength(1)
    expect(screen.getByRole('button', { name: /Ácido glutámico/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cargados positivamente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Esencial' }))
    expect(cards()).toHaveLength(2)
    expect(screen.getByText('2 de 20 aminoácidos')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Con azufre' }))
    expect(cards()).toHaveLength(0)
    expect(screen.getByText(/Ningún aminoácido cumple/)).toBeInTheDocument()
  })

  it('abre la ficha al tocar una tarjeta y vuelve a la lista', () => {
    render(<ClassificationTab />)
    fireEvent.click(screen.getByRole('button', { name: /Lisina/ }))
    expect(screen.getByRole('heading', { name: 'Lisina' })).toBeInTheDocument()
    expect(screen.getByTestId('mol-viewer')).toHaveTextContent('Lisina')
    expect(screen.getByRole('row', { name: /Punto isoeléctrico/ })).toHaveTextContent('9.74')
    expect(screen.getByRole('row', { name: /Carga neta a pH 7/ })).toHaveTextContent('positiva')

    fireEvent.click(screen.getByRole('button', { name: /Arginina.*siguiente/ }))
    expect(screen.getByRole('heading', { name: 'Arginina' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Volver/ }))
    expect(cards()).toHaveLength(20)
  })
})
