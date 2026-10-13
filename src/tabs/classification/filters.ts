// Búsqueda y filtros de la vista de clasificación. Funciones puras.

import { chargeSign, type ChargeSign } from '../../chem/charge'
import { hasElement } from '../../chem/smiles'
import type { AminoAcid, Essentiality, LehningerGroup } from '../../data/aminoacids'

export interface Filters {
  query: string
  groups: LehningerGroup[]
  /** Signo de la carga neta a pH 7, redondeada al entero más cercano. */
  charges: ChargeSign[]
  essentiality: Essentiality[]
  /** Solo los que tienen azufre en la cadena lateral. */
  sulfur: boolean
}

export const EMPTY_FILTERS: Filters = { query: '', groups: [], charges: [], essentiality: [], sulfur: false }

export const CHARGE_LABELS: Record<ChargeSign, string> = {
  positive: 'Carga +',
  negative: 'Carga −',
  neutral: 'Neutro',
}

/** Minúsculas y sin acentos, para comparar texto escrito a mano. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Busca por nombre, alias o código. Una sola letra se interpreta como código de una letra. */
export function matchesQuery(aminoAcid: AminoAcid, query: string): boolean {
  const text = normalize(query)
  if (!text) return true
  if (text.length === 1) return aminoAcid.code1.toLowerCase() === text
  if (aminoAcid.code3.toLowerCase() === text) return true
  return [aminoAcid.name, ...aminoAcid.aliases].some((name) => normalize(name).includes(text))
}

/** El azufre de un aminoácido siempre está en su cadena lateral: basta mirar el SMILES. */
export function hasSulfur(aminoAcid: AminoAcid): boolean {
  return hasElement(aminoAcid.smiles, 'S')
}

/** Dentro de una categoría los filtros se suman (o); entre categorías se cruzan (y). */
export function applyFilters(aminoAcids: AminoAcid[], filters: Filters): AminoAcid[] {
  const allows = <T,>(selected: T[], value: T) => selected.length === 0 || selected.includes(value)
  return aminoAcids.filter(
    (aa) =>
      matchesQuery(aa, filters.query) &&
      allows(filters.groups, aa.group) &&
      allows(filters.charges, chargeSign(aa)) &&
      allows(filters.essentiality, aa.essentiality) &&
      (!filters.sulfur || hasSulfur(aa)),
  )
}

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.groups.length > 0 ||
    filters.charges.length > 0 ||
    filters.essentiality.length > 0 ||
    filters.sulfur
  )
}

/** Añade o quita un valor de una lista de filtros. */
export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}
