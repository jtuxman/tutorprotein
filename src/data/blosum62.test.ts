import { AMINO_ACIDS } from './aminoacids'
import { analyzeMutation, blosum62Score } from './blosum62'
import { TRIVIA } from './trivia'

describe('TRIVIA', () => {
  it('cubre los 20 aminoácidos con mnemotecnia, etimología y caso real originales', () => {
    expect(Object.keys(TRIVIA)).toHaveLength(20)
    for (const aa of AMINO_ACIDS) {
      const entry = TRIVIA[aa.code3]
      expect(entry, aa.code3).toBeDefined()
      expect(entry.mnemonic.length).toBeGreaterThan(20)
      expect(entry.etymology.length).toBeGreaterThan(20)
      expect(entry.realLife.length).toBeGreaterThan(20)
    }
  })
})

describe('BLOSUM62 y mutaciones', () => {
  it('es simétrica y tiene valores diagonales positivos para los 20 aminoácidos', () => {
    for (const a of AMINO_ACIDS) {
      expect(blosum62Score(a.code3, a.code3)).toBeGreaterThanOrEqual(4)
      for (const b of AMINO_ACIDS) {
        expect(blosum62Score(a.code3, b.code3)).toBe(blosum62Score(b.code3, a.code3))
      }
    }
  })

  it('distingue una sustitución conservadora (Leu→Ile) de la anemia falciforme (Glu→Val)', () => {
    const leu = AMINO_ACIDS.find((aa) => aa.code3 === 'Leu')!
    const ile = AMINO_ACIDS.find((aa) => aa.code3 === 'Ile')!
    const glu = AMINO_ACIDS.find((aa) => aa.code3 === 'Glu')!
    const val = AMINO_ACIDS.find((aa) => aa.code3 === 'Val')!

    const conservative = analyzeMutation(leu, ile)
    expect(conservative.blosum62).toBe(2)
    expect(conservative.interchangeable).toBe('conservative')
    expect(conservative.deltaMass).toBe(0)

    const sickle = analyzeMutation(glu, val)
    expect(sickle.blosum62).toBe(-2)
    expect(sickle.interchangeable).toBe('radical')
    expect(sickle.deltaHydropathy).toBeCloseTo(7.7, 1)
    expect(sickle.summary.some((line) => line.includes('hidrofobicidad'))).toBe(true)
  })
})
