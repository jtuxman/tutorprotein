// Matriz de sustitución BLOSUM62 (Henikoff & Henikoff, PNAS 89:10915–10919, 1992)
// y metadatos de mutación a nivel de aminoácido.
//
// Valores enteros en semibits: positivos = sustitución más frecuente de lo esperado
// por azar en bloques conservados; negativos = sustitución desfavorecida evolutivamente.
// Los valores de la tabla son datos fácticos de dominio público científico (el propio
// NCBI distribuye la matriz dentro del dominio público de EE. UU.).

import { PHYSIOLOGICAL_PH, chargeSign, netCharge } from '../chem/charge'
import { AMINO_ACIDS, GROUPS, findAminoAcid, type AminoAcid } from './aminoacids'

export const BLOSUM_ORDER = [
  'A', 'R', 'N', 'D', 'C', 'Q', 'E', 'G', 'H', 'I',
  'L', 'K', 'M', 'F', 'P', 'S', 'T', 'W', 'Y', 'V',
] as const

const ROWS: number[][] = [
  // A   R   N   D   C   Q   E   G   H   I   L   K   M   F   P   S   T   W   Y   V
  [  4, -1, -2, -2,  0, -1, -1,  0, -2, -1, -1, -1, -1, -2, -1,  1,  0, -3, -2,  0 ], // A
  [ -1,  5,  0, -2, -3,  1,  0, -2,  0, -3, -2,  2, -1, -3, -2, -1, -1, -3, -2, -3 ], // R
  [ -2,  0,  6,  1, -3,  0,  0,  0,  1, -3, -3,  0, -2, -3, -2,  1,  0, -4, -2, -3 ], // N
  [ -2, -2,  1,  6, -3,  0,  2, -1, -1, -3, -4, -1, -3, -3, -1,  0, -1, -4, -3, -3 ], // D
  [  0, -3, -3, -3,  9, -3, -4, -3, -3, -1, -1, -3, -1, -2, -3, -1, -1, -2, -2, -1 ], // C
  [ -1,  1,  0,  0, -3,  5,  2, -2,  0, -3, -2,  1,  0, -3, -1,  0, -1, -2, -1, -2 ], // Q
  [ -1,  0,  0,  2, -4,  2,  5, -2,  0, -3, -3,  1, -2, -3, -1,  0, -1, -3, -2, -2 ], // E
  [  0, -2,  0, -1, -3, -2, -2,  6, -2, -4, -4, -2, -3, -3, -2,  0, -2, -2, -3, -3 ], // G
  [ -2,  0,  1, -1, -3,  0,  0, -2,  8, -3, -3, -1, -2, -1, -2, -1, -2, -2,  2, -3 ], // H
  [ -1, -3, -3, -3, -1, -3, -3, -4, -3,  4,  2, -3,  1,  0, -3, -2, -1, -3, -1,  3 ], // I
  [ -1, -2, -3, -4, -1, -2, -3, -4, -3,  2,  4, -2,  2,  0, -3, -2, -1, -2, -1,  1 ], // L
  [ -1,  2,  0, -1, -3,  1,  1, -2, -1, -3, -2,  5, -1, -3, -1,  0, -1, -3, -2, -2 ], // K
  [ -1, -1, -2, -3, -1,  0, -2, -3, -2,  1,  2, -1,  5,  0, -2, -1, -1, -1, -1,  1 ], // M
  [ -2, -3, -3, -3, -2, -3, -3, -3, -1,  0,  0, -3,  0,  6, -4, -2, -2,  1,  3, -1 ], // F
  [ -1, -2, -2, -1, -3, -1, -1, -2, -2, -3, -3, -1, -2, -4,  7, -1, -1, -4, -3, -2 ], // P
  [  1, -1,  1,  0, -1,  0,  0,  0, -1, -2, -2,  0, -1, -2, -1,  4,  1, -3, -2, -2 ], // S
  [  0, -1,  0, -1, -1, -1, -1, -2, -2, -1, -1, -1, -1, -2, -1,  1,  5, -2, -2,  0 ], // T
  [ -3, -3, -4, -4, -2, -2, -3, -2, -2, -3, -2, -3, -1,  1, -4, -3, -2, 11,  2, -3 ], // W
  [ -2, -2, -2, -3, -2, -1, -2, -3,  2, -1, -1, -2, -1,  3, -3, -2, -2,  2,  7, -1 ], // Y
  [  0, -3, -3, -3, -1, -2, -2, -3, -3,  3,  1, -2,  1, -1, -2, -2,  0, -3, -1,  4 ], // V
]

/** Puntuación BLOSUM62 entre dos aminoácidos (acepta código de 1 o 3 letras). */
export function blosum62Score(fromCode: string, toCode: string): number {
  const from = findAminoAcid(fromCode)
  const to = findAminoAcid(toCode)
  if (!from || !to) throw new Error(`Aminoácido desconocido: ${fromCode} → ${toCode}`)
  const row = BLOSUM_ORDER.indexOf(from.code1 as (typeof BLOSUM_ORDER)[number])
  const col = BLOSUM_ORDER.indexOf(to.code1 as (typeof BLOSUM_ORDER)[number])
  return ROWS[row][col]
}

export type HBondRole = 'none' | 'donor' | 'acceptor' | 'both'

const HBOND_ROLE: Record<string, HBondRole> = {
  Gly: 'none',
  Ala: 'none',
  Pro: 'none',
  Val: 'none',
  Leu: 'none',
  Ile: 'none',
  Met: 'none',
  Phe: 'none',
  Trp: 'donor',
  Tyr: 'both',
  Ser: 'both',
  Thr: 'both',
  Cys: 'both',
  Asn: 'both',
  Gln: 'both',
  Lys: 'donor',
  Arg: 'donor',
  His: 'both',
  Asp: 'acceptor',
  Glu: 'acceptor',
}

export const HBOND_LABELS: Record<HBondRole, string> = {
  none: 'Sin puentes de H en la cadena lateral',
  donor: 'Donador de puentes de H',
  acceptor: 'Aceptor de puentes de H',
  both: 'Donador y aceptor de puentes de H',
}

export function hBondRole(aminoAcid: AminoAcid): HBondRole {
  return HBOND_ROLE[aminoAcid.code3] ?? 'none'
}

export interface MutationAnalysis {
  from: AminoAcid
  to: AminoAcid
  blosum62: number
  interchangeable: 'identity' | 'conservative' | 'moderate' | 'radical'
  interchangeableLabel: string
  deltaMass: number
  deltaCharge: number
  deltaHydropathy: number
  sameGroup: boolean
  fromHBond: HBondRole
  toHBond: HBondRole
  summary: string[]
}

/** Compara dos aminoácidos para explicar el efecto probable de mutar `from` → `to`. */
export function analyzeMutation(from: AminoAcid, to: AminoAcid): MutationAnalysis {
  const blosum62 = blosum62Score(from.code3, to.code3)
  const deltaMass = to.molecularWeight - from.molecularWeight
  const deltaCharge = netCharge(to, PHYSIOLOGICAL_PH) - netCharge(from, PHYSIOLOGICAL_PH)
  const deltaHydropathy = Number((to.hydropathy - from.hydropathy).toFixed(1))
  const sameGroup = from.group === to.group
  const fromHBond = hBondRole(from)
  const toHBond = hBondRole(to)

  let interchangeable: MutationAnalysis['interchangeable']
  let interchangeableLabel: string
  if (from.code3 === to.code3) {
    interchangeable = 'identity'
    interchangeableLabel = 'Sin cambio (mismo aminoácido)'
  } else if (blosum62 >= 1) {
    interchangeable = 'conservative'
    interchangeableLabel = 'Conservadora (frecuente en la evolución)'
  } else if (blosum62 === 0 || blosum62 === -1) {
    interchangeable = 'moderate'
    interchangeableLabel = 'Moderada (tolerada según el entorno)'
  } else {
    interchangeable = 'radical'
    interchangeableLabel = 'Radical (rara vez intercambiable)'
  }

  const summary: string[] = []
  if (from.code3 === to.code3) {
    summary.push('Mutación silenciosa a nivel de proteína: la cadena lateral no cambia.')
    return {
      from,
      to,
      blosum62,
      interchangeable,
      interchangeableLabel,
      deltaMass,
      deltaCharge,
      deltaHydropathy,
      sameGroup,
      fromHBond,
      toHBond,
      summary,
    }
  }

  if (sameGroup) {
    summary.push(`Ambos pertenecen al grupo «${GROUPS[from.group].label}», por lo que conservan la química general.`)
  } else {
    summary.push(
      `Cambia de grupo: pasa de «${GROUPS[from.group].label}» a «${GROUPS[to.group].label}».`,
    )
  }

  const fromSign = chargeSign(from)
  const toSign = chargeSign(to)
  if (fromSign !== toSign) {
    if ((fromSign === 'positive' && toSign === 'negative') || (fromSign === 'negative' && toSign === 'positive')) {
      summary.push('Invierte la carga eléctrica a pH 7: puede romper un puente salino y crear repulsión electrostática.')
    } else if (fromSign === 'neutral') {
      summary.push('Introduce una carga neta a pH 7: si la posición estaba enterrada en el núcleo hidrofóbico, desestabilizará el plegamiento.')
    } else {
      summary.push('Pierde la carga neta a pH 7: desaparecen las interacciones iónicas que mantenía esa cadena lateral.')
    }
  }

  if (Math.abs(deltaHydropathy) >= 3) {
    summary.push(
      deltaHydropathy > 0
        ? 'Aumenta mucho la hidrofobicidad: si el residuo está en la superficie, crea un parche apolar expuesto que favorece la agregación.'
        : 'Se vuelve mucho más hidrofílico: si estaba en el interior apolar, meter grupos polares sin pareja cuesta energía.',
    )
  }

  if (Math.abs(deltaMass) >= 40) {
    summary.push(
      deltaMass > 0
        ? `La cadena lateral gana ${deltaMass} g/mol de volumen: riesgo de choques estéricos en cavidades ajustadas.`
        : `La cadena lateral pierde ${Math.abs(deltaMass)} g/mol: puede dejar un hueco interno que afloje el empaquetamiento.`,
    )
  }

  if (from.code3 === 'Pro' || to.code3 === 'Pro') {
    summary.push('Involucra prolina: cambia la rigidez del esqueleto peptídico y puede alterar giros o romper una hélice α.')
  } else if (from.code3 === 'Gly' || to.code3 === 'Gly') {
    summary.push('Involucra glicina: se modifica la libertad conformacional del esqueleto en zonas estrechas.')
  }

  if (from.code3 === 'Cys' || to.code3 === 'Cys') {
    summary.push('Involucra cisteína: puede perderse o crearse la capacidad de formar un puente disulfuro (–S–S–).')
  }

  if (fromHBond !== toHBond) {
    summary.push(`Puentes de hidrógeno: pasa de «${HBOND_LABELS[fromHBond].toLowerCase()}» a «${HBOND_LABELS[toHBond].toLowerCase()}».`)
  }

  return {
    from,
    to,
    blosum62,
    interchangeable,
    interchangeableLabel,
    deltaMass,
    deltaCharge,
    deltaHydropathy,
    sameGroup,
    fromHBond,
    toHBond,
    summary,
  }
}

export interface RealWorldMutation {
  id: string
  title: string
  protein: string
  positionLabel: string
  from: string
  to: string
  clinicalNote: string
}

export const REAL_WORLD_MUTATIONS: RealWorldMutation[] = [
  {
    id: 'sickle-cell',
    title: 'Anemia falciforme (HbS)',
    protein: 'Hemoglobina β',
    positionLabel: 'Glu6 → Val',
    from: 'Glu',
    to: 'Val',
    clinicalNote:
      'En la superficie de la subunidad β se cambia un carboxilato cargado negativamente por una horquilla hidrofóbica. En la desoxihemoglobina ese parche apolar encaja con otra molécula y forma fibras rígidas que deforman el eritrocito en forma de hoz.',
  },
  {
    id: 'collagen-oi',
    title: 'Osteogénesis imperfecta',
    protein: 'Colágeno tipo I (α1)',
    positionLabel: 'Gly → Ser / Cys',
    from: 'Gly',
    to: 'Ser',
    clinicalNote:
      'En el eje central de la triple hélice del colágeno solo cabe un átomo de hidrógeno. Cualquier cadena lateral, incluso el pequeño –CH₂OH de la serina, estorba el cierre de las tres hebras y fragiliza el hueso.',
  },
  {
    id: 'conservative-leu-ile',
    title: 'Sustitución conservadora clásica',
    protein: 'Núcleo hidrofóbico',
    positionLabel: 'Leu → Ile',
    from: 'Leu',
    to: 'Ile',
    clinicalNote:
      'Son isómeros constitucionales con la misma masa, sin carga y con hidropatía muy alta: en la mayoría de los interiores proteicos son casi intercambiables (BLOSUM62 = +2).',
  },
  {
    id: 'phosphomimetic',
    title: 'Mutación fosfomimética',
    protein: 'Sitio regulador de cinasa',
    positionLabel: 'Ser → Asp',
    from: 'Ser',
    to: 'Asp',
    clinicalNote:
      'En el laboratorio se sustituye una serina por aspartato para imitar la carga negativa permanente de una fosfoserina y mantener una proteína «encendida».',
  },
  {
    id: 'disulfide-loss',
    title: 'Pérdida de puente disulfuro',
    protein: 'Receptor extracelular',
    positionLabel: 'Cys → Tyr',
    from: 'Cys',
    to: 'Tyr',
    clinicalNote:
      'Desaparece el tiol capaz de cerrar un enlace –S–S– y entra un anillo aromático mucho más grande, lo que suele desorganizar dominios extracelulares.',
  },
]

export function listAllAminoAcids(): AminoAcid[] {
  return AMINO_ACIDS
}
