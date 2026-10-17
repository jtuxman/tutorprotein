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
  DEFAULT_VIEWER_STATE: {},
}))

const cards = () => screen.queryAllByRole('listitem')

describe('ClassificationTab', () => {
  it('muestra los 20 aminoácidos en sus cinco grupos', () => {
    render(<ClassificationTab />)
    expect(cards()).toHaveLength(20)
    const aromatic = screen.getByRole('region', { name: /Aromáticos/ })
    expect(within(aromatic).getAllByRole('listitem')).toHaveLength(3)
    // La explicación del nombre del grupo llega plegada.
    const why = within(aromatic).getByText('¿Por qué se llaman así?').closest('details')
    expect(why).not.toHaveAttribute('open')
    expect(why).toHaveTextContent(/no habla del olor/)
    expect(screen.getByRole('region', { name: /Cargados negativamente/ })).toBeInTheDocument()
  })

  it('filtra con el buscador y los chips', () => {
    render(<ClassificationTab />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'glutamico' } })
    expect(cards()).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Comparar Ácido glutámico' })).toBeInTheDocument()

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
    fireEvent.click(screen.getByRole('button', { name: /^Estructura 2D de Lisina/ }))
    expect(screen.getByRole('heading', { name: 'Lisina' })).toBeInTheDocument()
    expect(screen.getByTestId('mol-viewer')).toHaveTextContent('Lisina')
    expect(screen.getByRole('row', { name: /Punto isoeléctrico/ })).toHaveTextContent('9.74')
    expect(screen.getByRole('row', { name: /Carga neta a pH 7/ })).toHaveTextContent('positiva')

    fireEvent.click(screen.getByRole('button', { name: /Arginina.*siguiente/ }))
    expect(screen.getByRole('heading', { name: 'Arginina' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Volver/ }))
    expect(cards()).toHaveLength(20)
  })

  it('compara dos tarjetas elegidas y resalta las diferencias', () => {
    render(<ClassificationTab />)
    fireEvent.click(screen.getByRole('button', { name: 'Comparar Leucina' }))
    expect(screen.getByRole('button', { name: 'Comparar' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Comparar Isoleucina' }))
    fireEvent.click(screen.getByRole('button', { name: 'Comparar' }))

    expect(screen.getAllByTestId('mol-viewer').map((viewer) => viewer.textContent)).toEqual(['Leucina', 'Isoleucina'])
    // Son isómeros: misma masa, distinta hidropatía.
    expect(screen.getByRole('row', { name: /Masa molecular/ })).not.toHaveClass('property-table__row--differs')
    expect(screen.getByRole('row', { name: /Hidropatía/ })).toHaveClass('property-table__row--differs')

    fireEvent.change(screen.getByRole('combobox', { name: 'Segundo aminoácido' }), { target: { value: 'Val' } })
    expect(screen.getAllByTestId('mol-viewer')[1]).toHaveTextContent('Valina')

    fireEvent.click(screen.getByRole('button', { name: /Volver/ }))
    expect(cards()).toHaveLength(20)
    expect(screen.queryByRole('button', { name: 'Comparar' })).not.toBeInTheDocument()
  })

  it('abre la comparación desde la ficha', () => {
    render(<ClassificationTab />)
    fireEvent.click(screen.getByRole('button', { name: /^Estructura 2D de Ácido aspártico/ }))
    fireEvent.change(screen.getByLabelText(/Comparar con/), { target: { value: 'Glu' } })
    expect(screen.getAllByTestId('mol-viewer').map((viewer) => viewer.textContent)).toEqual([
      'Ácido aspártico',
      'Ácido glutámico',
    ])
  })

  it('navega a las herramientas de la Fase 2 (simulador de pH, constructor y mutaciones)', () => {
    render(<ClassificationTab />)
    fireEvent.click(screen.getByRole('button', { name: /Simulador de pH y pI/ }))
    expect(screen.getByRole('heading', { name: /Simulador de pH y punto isoeléctrico/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Curva de titulación/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Constructor 2D/ }))
    expect(screen.getByRole('heading', { name: 'Constructor de estructuras' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Constructor 3D/ }))
    expect(screen.getByRole('heading', { name: /Constructor 3D y duelo de cadenas laterales/ })).toBeInTheDocument()
    // Al inicio muestra las características buscadas y al elegir una cadena lateral incorrecta marca con tache
    fireEvent.click(screen.getByRole('button', { name: /–CH₂– –CH₂– –CH₂– –CH₂– –NH₂/ }))
    expect(screen.getAllByText(/Tache:/).length).toBeGreaterThan(0)

    // También permite jugar a elegir entre 3 candidatos visualizados en 3D
    fireEvent.click(screen.getByRole('button', { name: /Juego: Elige entre 3 en 3D/ }))
    expect(screen.getAllByTestId('mol-viewer')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: 'Elegir candidato A' }))
    expect(screen.getByRole('status')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Mutaciones \(BLOSUM62\)/ }))
    expect(screen.getByRole('heading', { name: /Simulador de mutaciones/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Anemia falciforme/ })).toBeInTheDocument()
  })
})
