// Características estructurales y químicas que proporciona cada cadena lateral
// para el Constructor 3D de aminoácidos.
//
// Todos los valores se derivan de `src/data/aminoacids.ts` y `src/data/blosum62.ts`.

import { PHYSIOLOGICAL_PH, chargeSign, netCharge } from '../chem/charge'
import { hasElement } from '../chem/smiles'
import { GROUPS, type AminoAcid } from './aminoacids'
import { HBOND_LABELS, hBondRole } from './blosum62'
import { FRAGMENT_BY_ID, SIDE_CHAIN_RECIPES } from './fragments'

/** Fórmula condensada legible de la cadena lateral completa de cada aminoácido. */
export function sideChainFormula(aminoAcid: AminoAcid): string {
  const recipe = SIDE_CHAIN_RECIPES[aminoAcid.code3] ?? []
  return recipe.map((id) => FRAGMENT_BY_ID[id]?.formula ?? id).join(' ')
}

/** Descripción estructural de la geometría 3D de la cadena lateral. */
const GEOMETRY_TRAIT: Record<string, string> = {
  Gly: 'Sin carbono β (solo un átomo de H sobre el Cα)',
  Ala: 'Metilo corto sin ramificación (solo Cβ)',
  Pro: 'Anillo alifático de pirrolidina que se cierra sobre el Nα',
  Val: 'Ramificación en V sobre el Cβ (isopropilo)',
  Leu: 'Ramificación isobutilo en el Cγ (tras un –CH₂–)',
  Ile: 'Ramificación en el Cβ con segundo centro quiral (sec-butilo)',
  Met: 'Cadena lineal con puente tioéter –S– y metilo terminal',
  Phe: 'Anillo aromático bencénico plano sin sustituyentes',
  Tyr: 'Anillo aromático fenol con grupo –OH en posición para',
  Trp: 'Anillo bicíclico indol (benceno + pirrol con –NH–)',
  Ser: 'Metileno corto con hidroxilo primario (–CH₂OH)',
  Thr: 'Carbono β quiral con –OH secundario y –CH₃',
  Cys: 'Metileno corto con grupo tiol terminal (–CH₂SH)',
  Asn: 'Cadena corta (un –CH₂–) rematada en carboxamida –CONH₂',
  Gln: 'Cadena de dos –CH₂– rematada en carboxamida –CONH₂',
  Lys: 'Cadena lineal de cuatro metilenos con grupo ε-amino terminal',
  Arg: 'Tres metilenos seguidos del grupo planar guanidinio (3 N)',
  His: 'Metileno unido a un anillo aromático imidazol (2 N)',
  Asp: 'Cadena corta (un –CH₂–) con grupo β-carboxilo ácido',
  Glu: 'Cadena de dos –CH₂– con grupo γ-carboxilo ácido',
}

export function geometryTraitFor(aminoAcid: AminoAcid): string {
  return GEOMETRY_TRAIT[aminoAcid.code3] ?? aminoAcid.note
}

export interface TraitCriterion {
  id: string
  label: string
  /** Valor buscado en el aminoácido objetivo. */
  expected: string
  /** Valor que aporta la cadena lateral elegida por el usuario. */
  actual: string
  /** `true` si la cadena lateral elegida cumple este requisito del aminoácido buscado. */
  matches: boolean
}

function chargeTraitText(aa: AminoAcid): string {
  const sign = chargeSign(aa, PHYSIOLOGICAL_PH)
  const q = netCharge(aa, PHYSIOLOGICAL_PH)
  if (sign === 'positive') return `Positiva (≈ +1; pKa lateral ${aa.pKa.sideChain?.toFixed(2)})`
  if (sign === 'negative') return `Negativa (≈ −1; pKa lateral ${aa.pKa.sideChain?.toFixed(2)})`
  if (aa.code3 === 'His') return `Neutra con fracción + (${(q * 100).toFixed(0)} % protonada a pH 7; pKa 6.00)`
  return 'Neutra (sin carga neta a pH 7)'
}

function hydropathyTraitText(aa: AminoAcid): string {
  if (aa.hydropathy >= 2.0) return `Fuertemente hidrofóbica (índice +${aa.hydropathy.toFixed(1)})`
  if (aa.hydropathy > 0) return `Moderadamente hidrofóbica (índice +${aa.hydropathy.toFixed(1)})`
  if (aa.hydropathy >= -1.6) return `Anfipática / ligeramente polar (índice ${aa.hydropathy.toFixed(1)})`
  return `Fuertemente hidrofílica (índice ${aa.hydropathy.toFixed(1)})`
}

function heteroTraitText(aa: AminoAcid): string {
  const hasS = hasElement(aa.smiles, 'S')
  const isAromatic = aa.group === 'aromatic' || aa.code3 === 'His'
  if (hasS) return aa.code3 === 'Cys' ? 'Contiene azufre como tiol (–SH)' : 'Contiene azufre como tioéter (–S–)'
  if (isAromatic) return 'Contiene anillo aromático planar'
  if (aa.code3 === 'Pro') return 'Ciclo alifático cerrado al Nα'
  return 'Sin anillo aromático ni átomos de azufre'
}

/**
 * Evalúa característica por característica qué proporciona la cadena lateral
 * `chosen` frente a las características buscadas del residuo `target`.
 */
export function compareSideChainTraits(target: AminoAcid, chosen: AminoAcid): TraitCriterion[] {
  const targetGroup = GROUPS[target.group].label
  const chosenGroup = GROUPS[chosen.group].label

  const targetCharge = chargeTraitText(target)
  const chosenCharge = chargeTraitText(chosen)
  const sameChargeCategory =
    chargeSign(target, PHYSIOLOGICAL_PH) === chargeSign(chosen, PHYSIOLOGICAL_PH) &&
    (target.code3 === 'His') === (chosen.code3 === 'His')

  const targetHydro = hydropathyTraitText(target)
  const chosenHydro = hydropathyTraitText(chosen)
  const sameHydroBucket =
    (target.hydropathy >= 2 && chosen.hydropathy >= 2) ||
    (target.hydropathy > 0 && target.hydropathy < 2 && chosen.hydropathy > 0 && chosen.hydropathy < 2) ||
    (target.hydropathy <= 0 && target.hydropathy >= -1.6 && chosen.hydropathy <= 0 && chosen.hydropathy >= -1.6) ||
    (target.hydropathy < -1.6 && chosen.hydropathy < -1.6)

  const targetHBond = HBOND_LABELS[hBondRole(target)]
  const chosenHBond = HBOND_LABELS[hBondRole(chosen)]

  const targetHetero = heteroTraitText(target)
  const chosenHetero = heteroTraitText(chosen)

  const targetGeom = geometryTraitFor(target)
  const chosenGeom = geometryTraitFor(chosen)

  return [
    {
      id: 'group',
      label: 'Grupo químico (Lehninger)',
      expected: targetGroup,
      actual: chosenGroup,
      matches: target.group === chosen.group,
    },
    {
      id: 'charge',
      label: 'Carga aportada a pH 7',
      expected: targetCharge,
      actual: chosenCharge,
      matches: sameChargeCategory,
    },
    {
      id: 'hydropathy',
      label: 'Carácter hidrofóbico / polar',
      expected: targetHydro,
      actual: chosenHydro,
      matches: sameHydroBucket,
    },
    {
      id: 'hbond',
      label: 'Puentes de hidrógeno',
      expected: targetHBond,
      actual: chosenHBond,
      matches: hBondRole(target) === hBondRole(chosen),
    },
    {
      id: 'hetero',
      label: 'Anillos y heteroátomos clave',
      expected: targetHetero,
      actual: chosenHetero,
      matches: targetHetero === chosenHetero,
    },
    {
      id: 'geometry',
      label: 'Arquitectura 3D específica (R)',
      expected: targetGeom,
      actual: chosenGeom,
      matches: target.code3 === chosen.code3,
    },
  ]
}
