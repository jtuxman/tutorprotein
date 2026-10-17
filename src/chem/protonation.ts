// Estado de protonación de un aminoácido a un pH dado.
//
// Las estructuras 2D y 3D se dibujan siempre neutras en el resto de la app;
// este módulo solo se usa en el simulador de pH, que es donde se enseña la
// ionización y el zwitterión.

import { groupCharge, netCharge } from './charge'
import type { AminoAcid, IonizableGroup } from '../data/aminoacids'

export interface GroupProtonation {
  group: IonizableGroup
  label: string
  protonatedForm: string
  deprotonatedForm: string
  /** Fracción protonada (0–1) a ese pH según Henderson-Hasselbalch. */
  protonatedFraction: number
  /** Carga media que aporta el grupo a ese pH. */
  charge: number
  /** `true` cuando más del 50 % de las moléculas están protonadas (pH < pKa). */
  predominantlyProtonated: boolean
}

const SIDE_CHAIN_FORMS: Record<string, { name: string; protonated: string; deprotonated: string }> = {
  Asp: { name: 'β-carboxilo (cadena lateral)', protonated: '–COOH (0)', deprotonated: '–COO⁻ (−1)' },
  Glu: { name: 'γ-carboxilo (cadena lateral)', protonated: '–COOH (0)', deprotonated: '–COO⁻ (−1)' },
  His: { name: 'Imidazol (cadena lateral)', protonated: 'Imidazolio (+1)', deprotonated: 'Imidazol (0)' },
  Cys: { name: 'Tiol (cadena lateral)', protonated: '–SH (0)', deprotonated: '–S⁻ (−1)' },
  Tyr: { name: 'Fenol (cadena lateral)', protonated: '–OH (0)', deprotonated: '–O⁻ (−1)' },
  Lys: { name: 'ε-amino (cadena lateral)', protonated: '–NH₃⁺ (+1)', deprotonated: '–NH₂ (0)' },
  Arg: { name: 'Guanidino (cadena lateral)', protonated: 'Guanidinio (+1)', deprotonated: 'Guanidino (0)' },
}

/** Fracción protonada de un grupo a un pH dado. */
export function protonatedFraction(pKa: number, pH: number): number {
  return 1 / (1 + 10 ** (pH - pKa))
}

/** Desglose del estado de protonación de cada grupo ionizable del aminoácido. */
export function describeProtonation(aminoAcid: AminoAcid, pH: number): GroupProtonation[] {
  return aminoAcid.ionizableGroups.map((group) => {
    const fraction = protonatedFraction(group.pKa, pH)
    const charge = groupCharge(group, pH)
    const predominantlyProtonated = fraction >= 0.5
    if (group.kind === 'alpha-carboxyl') {
      return {
        group,
        label: 'α-carboxilo',
        protonatedForm: '–COOH (0)',
        deprotonatedForm: '–COO⁻ (−1)',
        protonatedFraction: fraction,
        charge,
        predominantlyProtonated,
      }
    }
    if (group.kind === 'alpha-amino') {
      const isPro = aminoAcid.code3 === 'Pro'
      return {
        group,
        label: isPro ? 'α-amino (secundario)' : 'α-amino',
        protonatedForm: isPro ? '–NH₂⁺– (+1)' : '–NH₃⁺ (+1)',
        deprotonatedForm: isPro ? '–NH– (0)' : '–NH₂ (0)',
        protonatedFraction: fraction,
        charge,
        predominantlyProtonated,
      }
    }
    const forms = SIDE_CHAIN_FORMS[aminoAcid.code3] ?? {
      name: 'Cadena lateral',
      protonated: 'Protonada',
      deprotonated: 'Desprotonada',
    }
    return {
      group,
      label: forms.name,
      protonatedForm: forms.protonated,
      deprotonatedForm: forms.deprotonated,
      protonatedFraction: fraction,
      charge,
      predominantlyProtonated,
    }
  })
}

/** Cadena lateral en SMILES según esté predominantemente protonada o desprotonada. */
function sideChainSmiles(aminoAcid: AminoAcid, protonated: boolean): string {
  switch (aminoAcid.code3) {
    case 'Asp':
      return protonated ? 'CC(=O)O' : 'CC(=O)[O-]'
    case 'Glu':
      return protonated ? 'CCC(=O)O' : 'CCC(=O)[O-]'
    case 'Cys':
      return protonated ? 'CS' : 'C[S-]'
    case 'Tyr':
      return protonated ? 'Cc1ccc(O)cc1' : 'Cc1ccc([O-])cc1'
    case 'Lys':
      return protonated ? 'CCCC[NH3+]' : 'CCCCN'
    case 'Arg':
      return protonated ? 'CCCNC(N)=[NH2+]' : 'CCCNC(N)=N'
    case 'His':
      return protonated ? 'Cc1c[nH+]c[nH]1' : 'Cc1c[nH]cn1'
    default: {
      // Resto de aminoácidos: la cadena lateral no se ioniza; se extrae de `N[C@@H](R)C(=O)O`.
      const prefix = 'N[C@@H]('
      const suffix = ')C(=O)O'
      if (aminoAcid.smiles.startsWith(prefix) && aminoAcid.smiles.endsWith(suffix)) {
        return aminoAcid.smiles.slice(prefix.length, -suffix.length)
      }
      return ''
    }
  }
}

/**
 * SMILES de la especie predominante a un pH dado (con cargas formales `+` y `-`).
 * A pH fisiológico muestra el zwitterión (`[NH3+]…C(=O)[O-]`) y la cadena lateral
 * en su estado mayoritario.
 */
export function protonatedSmiles(aminoAcid: AminoAcid, pH: number): string {
  const carboxylProtonated = pH < aminoAcid.pKa.carboxyl
  const aminoProtonated = pH < aminoAcid.pKa.amino
  const carboxyl = carboxylProtonated ? 'C(=O)O' : 'C(=O)[O-]'

  if (aminoAcid.code3 === 'Pro') {
    const ringN = aminoProtonated ? '[NH2+]1' : 'N1'
    const acid = carboxylProtonated ? 'OC(=O)' : '[O-]C(=O)'
    return `${acid}[C@@H]1CCC${ringN}`
  }

  const amino = aminoProtonated ? '[NH3+]' : 'N'
  if (aminoAcid.code3 === 'Gly') {
    return `${amino}CC(=O)${carboxylProtonated ? 'O' : '[O-]'}`
  }

  const sideProtonated = aminoAcid.pKa.sideChain === undefined ? true : pH < aminoAcid.pKa.sideChain
  const side = sideChainSmiles(aminoAcid, sideProtonated)
  return `${amino}[C@@H](${side})${carboxyl}`
}

export interface TitrationPoint {
  pH: number
  netCharge: number
  /** Equivalentes de OH⁻ añadidos desde la forma totalmente protonada (0 a N grupos). */
  equivalents: number
}

/**
 * Curva de titulación entre pH 0 y 14 con paso `step`.
 * Los equivalentes de OH⁻ son la suma de fracciones desprotonadas (1 − f_H).
 */
export function titrationCurve(aminoAcid: AminoAcid, step = 0.2): TitrationPoint[] {
  const points: TitrationPoint[] = []
  const count = Math.round(14 / step)
  for (let i = 0; i <= count; i++) {
    const pH = Number((i * step).toFixed(2))
    const equivalents = aminoAcid.ionizableGroups.reduce(
      (sum, group) => sum + (1 - protonatedFraction(group.pKa, pH)),
      0,
    )
    points.push({ pH, netCharge: netCharge(aminoAcid, pH), equivalents })
  }
  return points
}
