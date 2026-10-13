import { AMINO_ACIDS } from '../../data/aminoacids'
import { atomColors, backboneMask, type SceneAtom } from './coloring'
import { NEUTRAL_COLOR } from './palette'

// Serina mínima: esqueleto + CB–OG, con un hidrógeno en CA y otro en CB.
const atom = (name: string, element: string, bonds: number[]): SceneAtom => ({ name, element, bonds, x: 0, y: 0, z: 0 })
const SER: SceneAtom[] = [
  atom('N', 'N', [1]),
  atom('CA', 'C', [0, 2, 4, 7]),
  atom('C', 'C', [1, 3, 6]),
  atom('O', 'O', [2]),
  atom('CB', 'C', [1, 5, 8]),
  atom('OG', 'O', [4]),
  atom('OXT', 'O', [2]),
  atom('HA', 'H', [1]),
  atom('HB2', 'H', [4]),
]
const byCode = (code3: string) => AMINO_ACIDS.find((aa) => aa.code3 === code3)!

describe('colores por átomo', () => {
  it('separa esqueleto y cadena lateral, hidrógenos incluidos', () => {
    expect(backboneMask(SER)).toEqual([true, true, true, true, false, false, true, true, false])
  })

  it('en los modos de propiedad solo colorea la cadena lateral', () => {
    const colors = atomColors('hydrophobic', SER, byCode('Ser'))
    const sideChain = colors[4]
    expect(sideChain).not.toBe(NEUTRAL_COLOR)
    expect(colors).toEqual([
      NEUTRAL_COLOR, NEUTRAL_COLOR, NEUTRAL_COLOR, NEUTRAL_COLOR, sideChain, sideChain, NEUTRAL_COLOR, NEUTRAL_COLOR, sideChain,
    ])
    // Ser es hidrofílica y Leu hidrofóbica: no comparten color.
    expect(atomColors('hydrophobic', SER, byCode('Leu'))[4]).not.toBe(sideChain)
  })

  it('en modo carga pinta solo los grupos ionizables', () => {
    const colors = atomColors('charge', SER, byCode('Ser'))
    expect(colors[0]).not.toBe(NEUTRAL_COLOR) // N
    expect(colors[3]).toBe(colors[6]) // O y OXT comparten la carga del carboxilo
    expect(colors[5]).toBe(NEUTRAL_COLOR) // el OH de Ser no se ioniza
  })
})
