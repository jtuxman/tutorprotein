// Color por átomo según el modo elegido. Funciones puras: no tocan 3Dmol.

import { PHYSIOLOGICAL_PH, groupCharge } from '../../chem/charge'
import { BACKBONE_ATOMS, HYDROPATHY_RANGE, type AminoAcid, type LehningerGroup } from '../../data/aminoacids'
import {
  ELEMENT_COLORS,
  HYDROPHILIC_COLOR,
  HYDROPHOBIC_COLOR,
  NEGATIVE_COLOR,
  NEUTRAL_COLOR,
  POLARITY_COLORS,
  POSITIVE_COLOR,
  UNKNOWN_ELEMENT_COLOR,
  ZERO_CHARGE_COLOR,
  divergingColor,
  groupColor,
} from './palette'
import type { ColorMode } from './types'

export interface SceneAtom {
  /** Nombre CCD (CA, CB, OG…); vacío si la molécula no es un aminoácido conocido. */
  name: string
  element: string
  /** Índices de los átomos enlazados. */
  bonds: number[]
  x: number
  y: number
  z: number
}

export type PolarityClass = keyof typeof POLARITY_COLORS

/** Clase de polaridad del grupo de Lehninger; los aromáticos cuentan como no polares. */
export function polarityClass(group: LehningerGroup): PolarityClass {
  if (group === 'aromatic') return 'nonpolar'
  return group
}

/** Marca los átomos del esqueleto: N, CA, C, O, OXT y los hidrógenos unidos a ellos. */
export function backboneMask(atoms: SceneAtom[]): boolean[] {
  const heavy = atoms.map((atom) => BACKBONE_ATOMS.includes(atom.name))
  return atoms.map((atom, index) =>
    atom.element === 'H' ? atom.bonds.some((neighbor) => heavy[neighbor]) : heavy[index],
  )
}

export function elementColor(element: string): string {
  return ELEMENT_COLORS[element] ?? UNKNOWN_ELEMENT_COLOR
}

/** Color de la escala de Kyte-Doolittle: hidrofílico (−4.5) → neutro (0) → hidrofóbico (+4.5). */
export function kyteDoolittleColor(hydropathy: number): string {
  return divergingColor(hydropathy / HYDROPATHY_RANGE.max, HYDROPHILIC_COLOR, ZERO_CHARGE_COLOR, HYDROPHOBIC_COLOR)
}

/** Color de una carga fraccionaria: rojo −1, casi blanco 0, azul +1. */
export function chargeColor(charge: number): string {
  return divergingColor(charge, NEGATIVE_COLOR, ZERO_CHARGE_COLOR, POSITIVE_COLOR)
}

/** Color con que se pinta la cadena lateral en los modos de propiedad. */
export function sideChainColor(mode: ColorMode, aminoAcid: AminoAcid): string {
  switch (mode) {
    case 'group':
      return groupColor(aminoAcid.group)
    case 'hydrophobic':
      return aminoAcid.hydropathy > 0 ? HYDROPHOBIC_COLOR : HYDROPHILIC_COLOR
    case 'kyte-doolittle':
      return kyteDoolittleColor(aminoAcid.hydropathy)
    case 'polarity':
      return POLARITY_COLORS[polarityClass(aminoAcid.group)]
    default:
      return NEUTRAL_COLOR
  }
}

/** Un color `#rrggbb` por átomo, en el orden de `atoms`. */
export function atomColors(
  mode: ColorMode,
  atoms: SceneAtom[],
  aminoAcid?: AminoAcid,
  pH = PHYSIOLOGICAL_PH,
): string[] {
  if (mode === 'element' || !aminoAcid) return atoms.map((atom) => elementColor(atom.element))

  if (mode === 'charge') {
    // Cada átomo de un grupo ionizable toma el color de la carga del grupo al pH indicado.
    const charges = new Map<string, number>()
    for (const group of aminoAcid.ionizableGroups) {
      const charge = groupCharge(group, pH)
      for (const atom of group.atoms) charges.set(atom, charge)
    }
    return atoms.map((atom) => {
      const charge = charges.get(atom.name)
      return charge === undefined ? NEUTRAL_COLOR : chargeColor(charge)
    })
  }

  // Modos de propiedad: esqueleto en gris, cadena lateral con el color de la propiedad.
  const backbone = backboneMask(atoms)
  const color = sideChainColor(mode, aminoAcid)
  return atoms.map((_, index) => (backbone[index] ? NEUTRAL_COLOR : color))
}

/**
 * Superficie por hidrofobicidad de un aminoácido suelto, átomo por átomo:
 * C, S y los H unidos a ellos son apolares; N, O y sus H, polares.
 */
export function apolarMask(atoms: SceneAtom[]): boolean[] {
  const apolar = (element: string) => element === 'C' || element === 'S'
  return atoms.map((atom) =>
    atom.element === 'H' ? atom.bonds.every((neighbor) => apolar(atoms[neighbor].element)) : apolar(atom.element),
  )
}
