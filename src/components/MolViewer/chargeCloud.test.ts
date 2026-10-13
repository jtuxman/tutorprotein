import { AMINO_ACIDS } from '../../data/aminoacids'
import { parseSdfAtoms, readAtomNames, readStructure } from '../../test/structures'
import { atomCharges, computePotentialGrid, gridIndex, gridSpecFor, type GridSpec, type Point } from './chargeCloud'

const atomNames = readAtomNames()

function cloud(code3: string) {
  const aminoAcid = AMINO_ACIDS.find((aa) => aa.code3 === code3)!
  const ccd = code3.toUpperCase()
  const atoms = parseSdfAtoms(readStructure(ccd))
  const names = atomNames[ccd]
  const spec = gridSpecFor(atoms)
  const grid = computePotentialGrid(atoms, atomCharges(aminoAcid, names), spec)
  /** Potencial en el punto de la rejilla más cercano. */
  const near = (point: Point) => {
    const [ix, iy, iz] = (['x', 'y', 'z'] as const).map((axis, i) => Math.round((point[axis] - spec.origin[i]) / spec.step))
    return grid[gridIndex(spec, ix, iy, iz)]
  }
  /** Punto a 2 Å del átomo, alejándose del carbono α. */
  const beyond = (name: string): Point => {
    const atom = atoms[names.indexOf(name)]
    const alpha = atoms[names.indexOf('CA')]
    const length = Math.hypot(atom.x - alpha.x, atom.y - alpha.y, atom.z - alpha.z)
    return {
      x: atom.x + (2 * (atom.x - alpha.x)) / length,
      y: atom.y + (2 * (atom.y - alpha.y)) / length,
      z: atom.z + (2 * (atom.z - alpha.z)) / length,
    }
  }
  return { atoms, names, spec, grid, near, beyond }
}

describe('nube de carga', () => {
  it('reparte la carga de cada grupo entre sus átomos', () => {
    const asp = AMINO_ACIDS.find((aa) => aa.code3 === 'Asp')!
    const charges = atomCharges(asp, atomNames.ASP)
    const of = (name: string) => charges[atomNames.ASP.indexOf(name)]
    expect(of('OD1')).toBeCloseTo(-0.5, 2)
    expect(of('OD2')).toBeCloseTo(-0.5, 2)
    expect(of('CB')).toBe(0)
    expect(charges.reduce((sum, charge) => sum + charge, 0)).toBeCloseTo(-1, 1)
  })

  it('la rejilla cubre la molécula con su margen', () => {
    const { atoms, spec, grid } = cloud('Gly')
    const [nx, ny, nz] = spec.size
    expect(grid).toHaveLength(nx * ny * nz)
    const maxX = Math.max(...atoms.map((atom) => atom.x))
    expect(spec.origin[0] + (nx - 1) * spec.step).toBeGreaterThanOrEqual(maxX + 5)
  })

  it('es negativa junto a los oxígenos de la cadena lateral de Asp', () => {
    const { near, beyond } = cloud('Asp')
    expect(near(beyond('OD1'))).toBeLessThan(0)
    expect(near(beyond('OD2'))).toBeLessThan(0)
  })

  it('es positiva junto al NZ de Lys', () => {
    const { near, beyond } = cloud('Lys')
    expect(near(beyond('NZ'))).toBeGreaterThan(0)
  })

  it('usa el orden de índices x, y, z', () => {
    const spec: GridSpec = { origin: [0, 0, 0], step: 1, size: [2, 3, 4] }
    expect(gridIndex(spec, 0, 0, 1)).toBe(1)
    expect(gridIndex(spec, 0, 1, 0)).toBe(4)
    expect(gridIndex(spec, 1, 0, 0)).toBe(12)
  })
})
