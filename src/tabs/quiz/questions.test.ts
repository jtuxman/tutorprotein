import { AMINO_ACIDS } from '../../data/aminoacids'
import {
  PLAUSIBLE_CLUSTERS,
  buildQuestion,
  generateSessionQuestions,
  pickPlausibleDistractors,
} from './questions'

describe('quiz questions generator', () => {
  it('elige distractores plausibles sin repetir ni incluir la respuesta correcta', () => {
    const leu = AMINO_ACIDS.find((aa) => aa.code3 === 'Leu')!
    const distractors = pickPlausibleDistractors(leu, 3, () => 0.1)
    expect(distractors).toHaveLength(3)
    expect(distractors.map((d) => d.code3)).not.toContain('Leu')
    expect(new Set(distractors.map((d) => d.code3)).size).toBe(3)
    // El clúster de Leu es Ile, Val, Met: deben ser las 3 primeras opciones.
    for (const d of distractors) {
      expect(PLAUSIBLE_CLUSTERS.Leu).toContain(d.code3)
    }
  })

  it('crea preguntas de los 5 tipos con exactamente 4 opciones y 1 correcta', () => {
    const asp = AMINO_ACIDS.find((aa) => aa.code3 === 'Asp')!
    const kinds = ['2d-to-name', '3d-to-name', 'name-to-2d', 'properties', 'surface-profile'] as const
    for (const kind of kinds) {
      const q = buildQuestion(asp, kind, 0)
      expect(q.options).toHaveLength(4)
      expect(q.options.filter((opt) => opt.correct)).toHaveLength(1)
    }
  })

  it('respeta los aminoácidos focalizados al generar una sesión de repaso de errores', () => {
    const questions = generateSessionQuestions({
      count: 4,
      kinds: ['2d-to-name', 'properties'],
      focusAminoAcids: ['Cys', 'Met'],
    })
    expect(questions).toHaveLength(4)
    for (const q of questions) {
      expect(['Cys', 'Met']).toContain(q.aminoAcid.code3)
    }
  })
})
