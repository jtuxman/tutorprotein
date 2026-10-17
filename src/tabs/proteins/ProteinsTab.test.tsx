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
