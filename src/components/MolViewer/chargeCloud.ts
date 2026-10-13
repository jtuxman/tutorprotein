// Nube de carga: potencial de Coulomb aproximado a pH 7. Es una aproximación
// educativa, no un cálculo de Poisson-Boltzmann (APBS).
//
// Modelo: cada grupo ionizable aporta su carga de Henderson-Hasselbalch,
// repartida a partes iguales entre sus átomos; dieléctrico dependiente de la
// distancia ε(r) = 4r, es decir φ(p) = Σ qᵢ / (4 rᵢ²), en unidades arbitrarias.

import { PHYSIOLOGICAL_PH, groupCharge } from '../../chem/charge'
import type { AminoAcid } from '../../data/aminoacids'

export interface Point {
  x: number
  y: number
  z: number
}

export interface GridSpec {
  origin: [number, number, number]
  /** Separación entre puntos (Å). */
  step: number
  /** Número de puntos por eje. */
  size: [number, number, number]
}

export const GRID_STEP = 0.5
export const GRID_MARGIN = 5
/** Distancia mínima (Å) para evitar la singularidad sobre el átomo cargado. */
export const MIN_DISTANCE = 1

/**
 * Escala fija del gradiente rojo-blanco-azul, igual para los 20 aminoácidos para
 * poder compararlos: ±0.05 es aproximadamente el potencial sobre la superficie
 * de un grupo con carga completa (p. ej. 1 / (4 · 2.2²) junto al –NH3+).
 */
export const CLOUD_SCALE = 0.05

/** Carga parcial de cada átomo (en el orden de `atomNames`) al pH dado. */
export function atomCharges(aminoAcid: AminoAcid, atomNames: string[], pH = PHYSIOLOGICAL_PH): number[] {
  const charges = atomNames.map(() => 0)
  for (const group of aminoAcid.ionizableGroups) {
    const share = groupCharge(group, pH) / group.atoms.length
    for (const name of group.atoms) {
      const index = atomNames.indexOf(name)
      if (index >= 0) charges[index] += share
    }
  }
  return charges
}

/** Rejilla que envuelve a los átomos con un margen. */
export function gridSpecFor(atoms: Point[], step = GRID_STEP, margin = GRID_MARGIN): GridSpec {
  const axes = ['x', 'y', 'z'] as const
  const min = axes.map((axis) => Math.min(...atoms.map((atom) => atom[axis])) - margin)
  const max = axes.map((axis) => Math.max(...atoms.map((atom) => atom[axis])) + margin)
  return {
    origin: [min[0], min[1], min[2]],
    step,
    size: [0, 1, 2].map((i) => Math.ceil((max[i] - min[i]) / step) + 1) as [number, number, number],
  }
}

/** Potencial en un punto. */
export function potentialAt(point: Point, atoms: Point[], charges: number[]): number {
  let potential = 0
  for (let i = 0; i < atoms.length; i++) {
    const charge = charges[i]
    if (charge === 0) continue
    const dx = point.x - atoms[i].x
    const dy = point.y - atoms[i].y
    const dz = point.z - atoms[i].z
    const r2 = Math.max(dx * dx + dy * dy + dz * dz, MIN_DISTANCE * MIN_DISTANCE)
    potential += charge / (4 * r2)
  }
  return potential
}

/** Índice plano de un punto de la rejilla; es el orden que espera `VolumeData` de 3Dmol. */
export function gridIndex(spec: GridSpec, ix: number, iy: number, iz: number): number {
  return (ix * spec.size[1] + iy) * spec.size[2] + iz
}

/** Potencial en todos los puntos de la rejilla. */
export function computePotentialGrid(atoms: Point[], charges: number[], spec: GridSpec): Float32Array {
  const [nx, ny, nz] = spec.size
  const data = new Float32Array(nx * ny * nz)
  const point = { x: 0, y: 0, z: 0 }
  for (let ix = 0; ix < nx; ix++) {
    point.x = spec.origin[0] + ix * spec.step
    for (let iy = 0; iy < ny; iy++) {
      point.y = spec.origin[1] + iy * spec.step
      for (let iz = 0; iz < nz; iz++) {
        point.z = spec.origin[2] + iz * spec.step
        data[gridIndex(spec, ix, iy, iz)] = potentialAt(point, atoms, charges)
      }
    }
  }
  return data
}

export interface CloudRequest {
  id: number
  atoms: Point[]
  charges: number[]
  spec: GridSpec
}

export interface CloudResponse {
  id: number
  data: Float32Array
}
