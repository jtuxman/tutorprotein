import type { ParsedProtein } from '../../chem/pdb'
import type { AminoAcid } from '../../data/aminoacids'

export type Representation = 'cartoon' | 'sticks' | 'ballstick' | 'spheres' | 'lines'
export type ColorMode =
  | 'element'
  | 'group'
  | 'hydrophobic'
  | 'kyte-doolittle'
  | 'polarity'
  | 'charge'
  | 'ss'
  | 'rainbow'
  | 'chain'
  | 'bfactor'
export type SurfaceMode = 'none' | 'charge-cloud' | 'hydrophobicity'
export type LabelMode = 'none' | 'atoms'

export interface SdfMolecule {
  kind: 'sdf'
  url: string
  /** Sin él solo están disponibles el color por elemento y ninguna superficie. */
  aminoAcid?: AminoAcid
}

export interface PdbMolecule {
  kind: 'pdb'
  id: string
  data: string
  parsed?: ParsedProtein
}

/** Molécula a mostrar: aminoácido individual (`sdf`) o proteína completa (`pdb`). */
export type Molecule = SdfMolecule | PdbMolecule

export interface ProteinOverlayOptions {
  /** Clave `chain:resSeq` del residuo seleccionado o preguntado. */
  selectedResidueKey?: string | null
  /**
   * Si es `true`, atenúa el resto de la proteína, centra la cámara en el residuo
   * seleccionado y resalta solo su cadena lateral (o el Cα para Gly), ocultando pistas.
   */
  quizSideChainOnly?: boolean
  showDisulfides?: boolean
  showSaltBridges?: boolean
  showBurial?: boolean
  showLigandSite?: boolean
  onResidueClick?: (residueKey: string) => void
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
  /** Si es `true`, oculta los átomos de la cadena lateral y muestra únicamente el núcleo (base) del aminoácido. */
  hideSideChain?: boolean
  /** Opciones adicionales para moléculas de tipo proteína (`kind: 'pdb'`). */
  proteinOptions?: ProteinOverlayOptions
  /** Regla anti-spoiler: desactiva colores, superficies y etiquetas que delaten la respuesta. */
  spoilerFree?: boolean
  /** Muestra la barra de herramientas del kit (por defecto, sí). */
  toolbar?: boolean
  /** Posición de la barra de herramientas respecto al lienzo 3D ('top' por defecto, 'bottom' en proteínas). */
  toolbarPosition?: 'top' | 'bottom'
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

const PROTEIN_ONLY_COLORS: ColorMode[] = ['ss', 'rainbow', 'chain', 'bfactor']

export function isProteinOnlyColorMode(mode: ColorMode): boolean {
  return PROTEIN_ONLY_COLORS.includes(mode)
}

/** Modos que dependen de las propiedades del aminoácido (y por tanto lo delatan). */
export function isRevealingColorMode(mode: ColorMode): boolean {
  return mode !== 'element'
}

/**
 * Estado efectivo: las props mandan sobre el estado interno y, con `spoilerFree`
 * o sin aminoácido/proteína asociada, se fuerzan los modos que no revelan nada.
 */
export function resolveState(
  internal: MolViewerState,
  props: Partial<MolViewerState>,
  options: { spoilerFree: boolean; hasAminoAcid: boolean; isProtein?: boolean },
): MolViewerState {
  const state = { ...internal }
  for (const key of STATE_KEYS) {
    const value = props[key]
    if (value !== undefined) Object.assign(state, { [key]: value })
  }
  if (!options.isProtein && state.representation === 'cartoon') {
    state.representation = 'ballstick'
  }
  if (!options.isProtein && isProteinOnlyColorMode(state.colorMode)) {
    state.colorMode = 'element'
  }
  if (options.spoilerFree || (!options.hasAminoAcid && !options.isProtein)) {
    state.colorMode = 'element'
    state.surface = 'none'
  }
  if (options.spoilerFree) state.labels = 'none'
  return state
}
