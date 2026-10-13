// Paleta única del visor. Los colores de grupo no se duplican aquí: se leen de
// las variables CSS `--group-*` (definidas en src/index.css).

import { GROUPS, type LehningerGroup } from '../../data/aminoacids'

export const VIEWER_BACKGROUND = '#211a3d'

export const ELEMENT_COLORS: Record<string, string> = {
  C: '#c9c6d6',
  H: '#ffffff',
  N: '#5b8cff',
  O: '#ff5468',
  S: '#ffd23f',
}
export const UNKNOWN_ELEMENT_COLOR = '#ff8ad8'

/** Esqueleto (y átomos sin propiedad que mostrar) en los modos de propiedad. */
export const NEUTRAL_COLOR = '#8f8aa6'

export const HYDROPHOBIC_COLOR = '#fb923c'
export const HYDROPHILIC_COLOR = '#2dd4bf'

export const POLARITY_COLORS = {
  nonpolar: '#facc15',
  polar: '#34d399',
  positive: '#3b82f6',
  negative: '#ef4444',
}

export const NEGATIVE_COLOR = '#ef4444'
export const POSITIVE_COLOR = '#3b82f6'
export const ZERO_CHARGE_COLOR = '#f4f2fb'

const FALLBACK_GROUP_COLOR = '#a78bfa'

/** Color del grupo de Lehninger, tomado de su variable CSS. */
export function groupColor(group: LehningerGroup): string {
  if (typeof document === 'undefined') return FALLBACK_GROUP_COLOR
  const value = getComputedStyle(document.documentElement).getPropertyValue(GROUPS[group].cssVar).trim()
  return value || FALLBACK_GROUP_COLOR
}

function channels(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/** Mezcla lineal de dos colores `#rrggbb`; `t` = 0 da `from`, 1 da `to`. */
export function mixColors(from: string, to: string, t: number): string {
  const clamped = Math.min(1, Math.max(0, t))
  const a = channels(from)
  const b = channels(to)
  const mixed = a.map((channel, i) => Math.round(channel + (b[i] - channel) * clamped))
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

/** Gradiente divergente: `negative` en −1, `zero` en 0 y `positive` en +1. */
export function divergingColor(value: number, negative: string, zero: string, positive: string): string {
  return value < 0 ? mixColors(zero, negative, -value) : mixColors(zero, positive, value)
}
