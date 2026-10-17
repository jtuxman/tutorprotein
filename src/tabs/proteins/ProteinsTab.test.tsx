import { fireEvent, render, screen } from '@testing-library/react'
import { resetProgress } from '../../progress'
import { ProteinsTab } from './ProteinsTab'

vi.mock('../../components/Structure2D', () => ({
  Structure2D: ({ ariaLabel }: { ariaLabel?: string }) => <div role="img" aria-label={ariaLabel} />,
}))
vi.mock('../../components/MolViewer', () => ({
  MolViewer: ({ spoilerFree }: { spoilerFree?: boolean }) => (
    <div data-testid="mol-viewer" data-spoiler-free={String(Boolean(spoilerFree))} />
  ),
}))

beforeEach(() => {
  resetProgress()
})

describe('ProteinsTab (Fase 4)', () => {
  it('muestra la proteína cargada, permite seleccionar residuos en la barra de secuencia y explorar sus interacciones', () => {
    render(<ProteinsTab />)
    expect(screen.getByText(/1CRN — Crambina/i)).toBeInTheDocument()
    expect(screen.getByText(/Puentes disulfuro: 1/)).toBeInTheDocument()
    expect(screen.getByText(/Puentes salinos: 1/)).toBeInTheDocument()

    // Seleccionar el residuo Arg 5 desde la barra de secuencia
    fireEvent.click(screen.getByRole('option', { name: 'R5' }))
    expect(screen.getByRole('heading', { name: /Arginina \(Arg 5\)/ })).toBeInTheDocument()

    // Controles de todas las cadenas laterales, nombres de todos los residuos, contactos y distancias
    expect(screen.getByRole('button', { name: /Todas las cadenas laterales \(bolas y varillas\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mostrar nombres de todos los residuos/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Solo seleccionado y sus contactos/ })).not.toBeDisabled()
    expect(screen.getByRole('checkbox', { name: /Distancias de contacto/ })).not.toBeDisabled()

    // Panel inferior de datos del PDB y cálculos globales
    expect(screen.getByRole('heading', { name: /Datos del PDB y cálculos globales de 1CRN/ })).toBeInTheDocument()
    expect(screen.getByText(/Residuos hidrofóbicos/)).toBeInTheDocument()
    expect(screen.getByText(/Residuos hidrofílicos/)).toBeInTheDocument()
    expect(screen.getByText(/Promedio de contactos por residuo/)).toBeInTheDocument()
    expect(screen.getByText(/Residuo con más contactos/)).toBeInTheDocument()
    expect(screen.getByText(/Residuo con menos contactos/)).toBeInTheDocument()
  })

  it('ejecuta el quiz "¿Qué cadena lateral es esta?" con regla anti-spoiler y retroalimentación', () => {
    render(<ProteinsTab />)
    fireEvent.click(screen.getByRole('button', { name: /Evaluación: «¿Qué cadena lateral es esta\?»/ }))

    expect(screen.getByRole('heading', { name: /¿Qué cadena lateral es esta\?/ })).toBeInTheDocument()
    expect(screen.getByTestId('mol-viewer')).toHaveAttribute('data-spoiler-free', 'true')

    const options = screen.getAllByRole('button').filter((b) => b.classList.contains('quiz-option'))
    expect(options).toHaveLength(4)

    fireEvent.click(options[0])
    expect(screen.getByRole('status')).toBeInTheDocument()
    // Tras responder se desbloquea el visor 3D
    expect(screen.getByTestId('mol-viewer')).toHaveAttribute('data-spoiler-free', 'false')
  })
})
