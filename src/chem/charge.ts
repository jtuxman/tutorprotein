import type { AminoAcid, IonizableGroup } from '../data/aminoacids'

export const PHYSIOLOGICAL_PH = 7

/** Carga fraccionaria de un grupo ionizable a un pH dado (Henderson-Hasselbalch). */
export function groupCharge(group: Pick<IonizableGroup, 'pKa' | 'type'>, pH: number): number {
  const protonated = 1 / (1 + 10 ** (pH - group.pKa))
  return group.type === 'acid' ? protonated - 1 : protonated
}

/** Carga neta fraccionaria del aminoácido libre a un pH dado. */
export function netCharge(aminoAcid: Pick<AminoAcid, 'ionizableGroups'>, pH: number): number {
  return aminoAcid.ionizableGroups.reduce((sum, group) => sum + groupCharge(group, pH), 0)
}

/**
 * pH en que la carga neta es cero, por bisección en [0, 14].
 * Solo valida el pI tabulado en las pruebas; la interfaz muestra el de la tabla.
 */
export function computePI(aminoAcid: Pick<AminoAcid, 'ionizableGroups'>): number {
  let low = 0
  let high = 14
  // La carga neta decrece de forma monótona con el pH.
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2
    if (netCharge(aminoAcid, mid) > 0) low = mid
    else high = mid
  }
  return (low + high) / 2
}

export type ChargeSign = 'positive' | 'negative' | 'neutral'

/** Signo de la carga neta redondeada al entero más cercano. */
export function chargeSign(aminoAcid: Pick<AminoAcid, 'ionizableGroups'>, pH = PHYSIOLOGICAL_PH): ChargeSign {
  const rounded = Math.round(netCharge(aminoAcid, pH))
  if (rounded > 0) return 'positive'
  if (rounded < 0) return 'negative'
  return 'neutral'
}
