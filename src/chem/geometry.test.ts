import { parseSdfAtoms, readAtomNames, readStructure } from '../test/structures'
import { angle, dihedral, distance, midpoint } from './geometry'

const p = (x: number, y: number, z: number) => ({ x, y, z })

describe('geometría', () => {
  it('mide distancias', () => {
    expect(distance(p(0, 0, 0), p(3, 4, 0))).toBeCloseTo(5)
    expect(midpoint(p(0, 0, 0), p(2, 4, 6))).toEqual(p(1, 2, 3))
  })

  it('mide ángulos con vértice en el átomo central', () => {
    expect(angle(p(1, 0, 0), p(0, 0, 0), p(0, 1, 0))).toBeCloseTo(90)
    expect(angle(p(1, 0, 0), p(0, 0, 0), p(-1, 0, 0))).toBeCloseTo(180)
    expect(angle(p(1, 0, 0), p(0, 0, 0), p(1, 1, 0))).toBeCloseTo(45)
  })

  it('mide diedros con el signo de la IUPAC', () => {
    // Mirando de b a c (eje +y), a queda a las 3 y d a las 12: giro antihorario.
    expect(dihedral(p(1, 0, 0), p(0, 0, 0), p(0, 1, 0), p(0, 1, 1))).toBeCloseTo(-90)
    expect(dihedral(p(1, 0, 0), p(0, 0, 0), p(0, 1, 0), p(0, 1, -1))).toBeCloseTo(90)
    expect(dihedral(p(1, 0, 0), p(0, 0, 0), p(0, 1, 0), p(1, 1, 0))).toBeCloseTo(0)
    expect(Math.abs(dihedral(p(1, 0, 0), p(0, 0, 0), p(0, 1, 0), p(-1, 1, 0)))).toBeCloseTo(180)
  })

  it('da valores químicamente razonables en la alanina ideal', () => {
    const atoms = parseSdfAtoms(readStructure('ALA'))
    const names = readAtomNames().ALA
    const at = (name: string) => atoms[names.indexOf(name)]
    expect(distance(at('CA'), at('CB'))).toBeCloseTo(1.53, 1)
    const tetrahedral = angle(at('N'), at('CA'), at('CB'))
    expect(tetrahedral).toBeGreaterThan(105)
    expect(tetrahedral).toBeLessThan(114)
  })
})
