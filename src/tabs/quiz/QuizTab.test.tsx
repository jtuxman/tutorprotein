import { fireEvent, render, screen } from '@testing-library/react'
import { recordAttempt, resetProgress } from '../../progress'
import { QuizTab } from './QuizTab'

vi.mock('../../components/Structure2D', () => ({
  Structure2D: ({ ariaLabel }: { ariaLabel?: string }) => <div role="img" aria-label={ariaLabel} />,
}))
vi.mock('../../components/MolViewer', () => ({
  MolViewer: ({ spoilerFree }: { spoilerFree?: boolean }) => (
    <div data-testid="mol-viewer" data-spoiler-free={String(Boolean(spoilerFree))} />
  ),
  aminoAcidMolecule: (aminoAcid: { name: string }) => ({ kind: 'sdf', url: '', aminoAcid }),
}))

beforeEach(() => {
  resetProgress()
})

describe('QuizTab', () => {
  it('permite iniciar una sesión, responder con retroalimentación y registrar en el motor de progreso', () => {
    render(<QuizTab />)
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: /Empezar quiz \(5 preguntas\)/ }))

    expect(screen.getByText(/Pregunta/)).toBeInTheDocument()
    const options = screen.getAllByRole('button').filter((btn) => btn.classList.contains('quiz-option'))
    expect(options).toHaveLength(4)

    fireEvent.click(options[0])
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Siguiente pregunta/ })).toBeInTheDocument()
  })

  it('muestra las tarjetas vencidas en el banner de repaso espaciado diario', () => {
    recordAttempt({
      aminoAcid: 'Trp',
      skill: 'structure2d',
      correct: false,
      responseMs: 1500,
    })
    render(<QuizTab />)
    expect(screen.getByText(/Tienes 1 tarjeta lista para repasar hoy/)).toBeInTheDocument()
  })
})
