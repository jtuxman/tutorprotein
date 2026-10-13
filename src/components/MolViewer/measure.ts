// Medidas sobre la molécula: qué se mide según cuántos átomos se tocan.

import { angle, dihedral, distance, midpoint, type Point3 } from '../../chem/geometry'

export type MeasureKind = 'distance' | 'angle' | 'dihedral'

export const MEASURE_KINDS: Record<MeasureKind, { label: string; atoms: number }> = {
  distance: { label: 'Distancia (2 átomos)', atoms: 2 },
  angle: { label: 'Ángulo (3 átomos)', atoms: 3 },
  dihedral: { label: 'Diedro (4 átomos)', atoms: 4 },
}

export interface Measurement {
  kind: MeasureKind
  /** Índices de los átomos, en el orden en que se tocaron. */
  atoms: number[]
  text: string
  /** Dónde se coloca la etiqueta. */
  anchor: Point3
}

/** Construye la medida a partir de los puntos elegidos (2, 3 o 4 según `kind`). */
export function measure(kind: MeasureKind, atoms: number[], points: Point3[]): Measurement {
  const [a, b, c, d] = points
  switch (kind) {
    case 'distance':
      return { kind, atoms, text: `${distance(a, b).toFixed(2)} Å`, anchor: midpoint(a, b) }
    case 'angle':
      return { kind, atoms, text: `${angle(a, b, c).toFixed(1)}°`, anchor: b }
    default:
      return { kind, atoms, text: `${dihedral(a, b, c, d).toFixed(1)}°`.replace('-', '−'), anchor: midpoint(b, c) }
  }
}
