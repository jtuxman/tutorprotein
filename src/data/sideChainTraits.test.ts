import { AMINO_ACIDS } from './aminoacids'
import { compareSideChainTraits, sideChainFormula } from './sideChainTraits'

describe('sideChainTraits (Constructor 3D)', () => {
  it('marca todas las características como correctas (✅) cuando se elige la cadena lateral exacta', () => {
    for (const aa of AMINO_ACIDS) {
      expect(sideChainFormula(aa).length).toBeGreaterThan(0)
      const traits = compareSideChainTraits(aa, aa)
      expect(traits.every((t) => t.matches)).toBe(true)
    }
  })

  it('marca con tache (❌) las características que no coinciden cuando se elige otra cadena lateral', () => {
    const asp = AMINO_ACIDS.find((aa) => aa.code3 === 'Asp')!
    const lys = AMINO_ACIDS.find((aa) => aa.code3 === 'Lys')!
    const glu = AMINO_ACIDS.find((aa) => aa.code3 === 'Glu')!

    // Asp vs Lys: fallan grupo, carga, puentes de H y geometría
    const aspVsLys = compareSideChainTraits(asp, lys)
    expect(aspVsLys.find((t) => t.id === 'group')?.matches).toBe(false)
    expect(aspVsLys.find((t) => t.id === 'charge')?.matches).toBe(false)
    expect(aspVsLys.find((t) => t.id === 'geometry')?.matches).toBe(false)

    // Asp vs Glu: comparten grupo, carga, hidropatía y puentes de H (✅), pero difieren en la longitud 3D (❌)
    const aspVsGlu = compareSideChainTraits(asp, glu)
    expect(aspVsGlu.find((t) => t.id === 'group')?.matches).toBe(true)
    expect(aspVsGlu.find((t) => t.id === 'charge')?.matches).toBe(true)
    expect(aspVsGlu.find((t) => t.id === 'geometry')?.matches).toBe(false)
  })
})
