import type { AminoAcid } from '../../data/aminoacids'

export type Representation = 'sticks' | 'ballstick' | 'spheres' | 'lines'
export type ColorMode = 'element' | 'group' | 'hydrophobic' | 'kyte-doolittle' | 'polarity' | 'charge'
export type SurfaceMode = 'none' | 'charge-cloud' | 'hydrophobicity'
export type LabelMode = 'none' | 'atoms'

/** Molécula a mostrar. `kind: 'pdb'` llegará con las proteínas (Fase 4). */
export interface Molecule {
  kind: 'sdf'
  url: string
  /** Sin él solo están disponibles el color por elemento y ninguna superficie. */
  aminoAcid?: AminoAcid
}

export interface MolViewerState {
  representation: Representation
  colorMode: ColorMode
  surface: SurfaceMode
  surfaceOpacity: number
  showHydrogens: boolean
  labels: LabelMode
}

export interface MolViewerProps extends Partial<MolViewerState> {
  molecule: Molecule
  /** pH al que se calculan el color por carga y la nube (por defecto 7). */
  pH?: number
  /** Regla anti-spoiler: desactiva colores, superficies y etiquetas que delaten la respuesta. */
  spoilerFree?: boolean
  /** Muestra la barra de herramientas del kit (por defecto, sí). */
  toolbar?: boolean
  onStateChange?: (state: MolViewerState) => void
}

export const DEFAULT_STATE: MolViewerState = {
  representation: 'ballstick',
  colorMode: 'element',
  surface: 'none',
  surfaceOpacity: 0.85,
  showHydrogens: false,
  labels: 'atoms',
}

const STATE_KEYS = Object.keys(DEFAULT_STATE) as (keyof MolViewerState)[]

/** Modos que dependen de las propiedades del aminoácido (y por tanto lo delatan). */
export function isRevealingColorMode(mode: ColorMode): boolean {
  return mode !== 'element'
}

/**
 * Estado efectivo: las props mandan sobre el estado interno y, con `spoilerFree`
 * o sin aminoácido asociado, se fuerzan los modos que no revelan nada.
 */
export function resolveState(
  internal: MolViewerState,
  props: Partial<MolViewerState>,
  options: { spoilerFree: boolean; hasAminoAcid: boolean },
): MolViewerState {
  const state = { ...internal }
  for (const key of STATE_KEYS) {
    const value = props[key]
    if (value !== undefined) Object.assign(state, { [key]: value })
  }
  if (options.spoilerFree || !options.hasAminoAcid) {
    state.colorMode = 'element'
    state.surface = 'none'
  }
  if (options.spoilerFree) state.labels = 'none'
  return state
}
