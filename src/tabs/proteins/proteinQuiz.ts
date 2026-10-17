// Generador de preguntas sobre la proteína cargada (Fase 4).
//
// Reglas:
// - Solo los 20 aminoácidos estándar.
// - Excluir residuos con átomos de cadena lateral faltantes (`completeSideChain === true`).
// - Hacer solo preguntas con respuesta válida en la proteína cargada.
// - Variar los aminoácidos preguntados.

import {
  BURIAL_LABELS,
  SECONDARY_STRUCTURE_LABELS,
  eligibleQuizResidues,
  explainBurialSense,
  type ParsedProtein,
  type ProteinResidue,
} from '../../chem/pdb'
import { GROUPS, type AminoAcid } from '../../data/aminoacids'
import { pickPlausibleDistractors, shuffle } from '../quiz/questions'

export type ProteinQuizKind = 'side-chain-id' | 'secondary-structure' | 'burial-sense' | 'interaction'

export interface ProteinQuestionOption {
  id: string
  label: string
  aminoAcidCode?: string
  correct: boolean
}

export interface ProteinQuestion {
  id: string
  kind: ProteinQuizKind
  residue: ProteinResidue
  aminoAcid: AminoAcid
  prompt: string
  subtitle: string
  /** Si es `true`, el visor oculta etiquetas/colores y enfoca solo la cadena lateral del residuo. */
  hideSpoilersIn3D: boolean
  options: ProteinQuestionOption[]
  explanation: string
}

/** Construye una pregunta principal «¿Qué cadena lateral es esta?» para un residuo con cadena lateral completa. */
export function buildSideChainQuestion(
  residue: ProteinResidue,
  index = 0,
  rng: () => number = Math.random,
): ProteinQuestion {
  const target = residue.aminoAcid
  const distractors = pickPlausibleDistractors(target, 3, rng)
  const options = shuffle(
    [
      {
        id: target.code3,
        aminoAcidCode: target.code3,
        label: `${target.name} (${target.code3} · ${target.code1})`,
        correct: true,
      },
      ...distractors.map((aa) => ({
        id: aa.code3,
        aminoAcidCode: aa.code3,
        label: `${aa.name} (${aa.code3} · ${aa.code1})`,
        correct: false,
      })),
    ],
    rng,
  )

  return {
    id: `prot-sc-${residue.key}-${index}`,
    kind: 'side-chain-id',
    residue,
    aminoAcid: target,
    prompt: `¿Qué cadena lateral es esta? (Residuo #${residue.resSeq} en cadena ${residue.chain})`,
    subtitle:
      target.code3 === 'Gly'
        ? 'Se resalta su carbono α (no tiene cadena lateral con carbono). Rota libremente la cámara.'
        : 'Solo está resaltada su cadena lateral; el resto de la proteína está atenuado y sin pistas.',
    hideSpoilersIn3D: true,
    options,
    explanation: `El residuo ${residue.chain}:${residue.resSeq} es ${target.name} (${target.code3} · ${target.code1}), del grupo «${GROUPS[target.group].label}». ${target.note}`,
  }
}

/** Construye una pregunta secundaria sobre estructura secundaria, exposición o puentes en la proteína. */
export function buildSecondaryProteinQuestion(
  residue: ProteinResidue,
  index = 0,
  rng: () => number = Math.random,
): ProteinQuestion {
  const target = residue.aminoAcid

  // Si participa en un puente disulfuro o salino, priorizar pregunta de interacción
  if (residue.disulfidePartner && index % 3 === 0) {
    return {
      id: `prot-int-ss-${residue.key}-${index}`,
      kind: 'interaction',
      residue,
      aminoAcid: target,
      prompt: `El residuo ${target.name} ${residue.resSeq} (${residue.chain}) acerca su átomo de azufre a 2 Å de ${residue.disulfidePartner}. ¿Qué interacción covalente forma?`,
      subtitle: 'Observa el enlace entre las dos cadenas laterales en el visor 3D.',
      hideSpoilersIn3D: false,
      options: shuffle(
        [
          { id: 'disulfide', label: 'Un puente disulfuro covalente (–S–S–) entre dos cisteínas', correct: true },
          { id: 'salt', label: 'Un puente salino electrostático entre cargas opuestas', correct: false },
          { id: 'peptide', label: 'Un enlace peptídico adicional entre esqueletos', correct: false },
          { id: 'pi', label: 'Un apilamiento aromático π–π', correct: false },
        ],
        rng,
      ),
      explanation: `Las dos cisteínas (${residue.key} y ${residue.disulfidePartner}) oxidan sus grupos tiol (–SH) para cerrar un puente disulfuro covalente que estabiliza el pliegue.`,
    }
  }

  if (residue.saltBridgePartners.length > 0 && index % 3 === 0) {
    const partner = residue.saltBridgePartners[0]
    return {
      id: `prot-int-salt-${residue.key}-${index}`,
      kind: 'interaction',
      residue,
      aminoAcid: target,
      prompt: `${target.name} ${residue.resSeq} (${residue.chain}) está a menos de 4.2 Å del residuo con carga opuesta ${partner}. ¿Qué interacción estabilizadora forman?`,
      subtitle: 'Combina atracción electrostática y puente de hidrógeno a pH fisiológico.',
      hideSpoilersIn3D: false,
      options: shuffle(
        [
          { id: 'salt', label: 'Un puente salino (par iónico entre cadena lateral + y cadena lateral −)', correct: true },
          { id: 'disulfide', label: 'Un puente disulfuro covalente (–S–S–)', correct: false },
          { id: 'hydrophobic', label: 'Un contacto hidrofóbico entre anillos apolares', correct: false },
          { id: 'clash', label: 'Un choque estérico prohibido', correct: false },
        ],
        rng,
      ),
      explanation: `${target.name} (${residue.key}) y ${partner} tienen cargas opuestas a pH 7 y forman un puente salino a ≤ 4.2 Å.`,
    }
  }

  if (index % 2 === 0) {
    const ss = residue.secondaryStructure
    return {
      id: `prot-ss-${residue.key}-${index}`,
      kind: 'secondary-structure',
      residue,
      aminoAcid: target,
      prompt: `¿En qué elemento de estructura secundaria se encuentra el residuo ${target.name} ${residue.resSeq} (cadena ${residue.chain})?`,
      subtitle: 'Inspecciona la cinta (cartoon) alrededor del residuo seleccionado.',
      hideSpoilersIn3D: false,
      options: [
        { id: 'helix', label: 'Hélice α (espiral dextrógira estabilizada por puentes de H i → i+4)', correct: ss === 'helix' },
        { id: 'sheet', label: 'Lámina β (hebra extendida que forma puentes de H entre cadenas vecinas)', correct: ss === 'sheet' },
        { id: 'coil', label: 'Bucle o giro (región conectiva sin periodicidad α ni β)', correct: ss === 'coil' },
        { id: 'triple', label: 'Triple hélice de poli-glicina exclusiva del colágeno', correct: false },
      ],
      explanation: `El residuo ${target.code3} ${residue.resSeq} forma parte de: ${SECONDARY_STRUCTURE_LABELS[ss]}.`,
    }
  }

  const burialSense = explainBurialSense(residue)
  return {
    id: `prot-burial-${residue.key}-${index}`,
    kind: 'burial-sense',
    residue,
    aminoAcid: target,
    prompt: `En esta proteína, ${target.name} ${residue.resSeq} (${target.code3}, hidropatía ${target.hydropathy}) está «${BURIAL_LABELS[residue.burial].toLowerCase()}». ¿Cuál es la interpretación química correcta?`,
    subtitle: `Tiene ${residue.neighborCount} residuos vecinos cercanos en un radio de 7.5 Å.`,
    hideSpoilersIn3D: false,
    options: shuffle(
      [
        {
          id: 'correct-sense',
          label: burialSense.explanation,
          correct: true,
        },
        {
          id: 'wrong-1',
          label: 'Todos los aminoácidos cargados deben situarse siempre en el centro anhidro sin pareja iónica.',
          correct: false,
        },
        {
          id: 'wrong-2',
          label: 'La hidropatía no influye nunca en el plegamiento globular en agua.',
          correct: false,
        },
        {
          id: 'wrong-3',
          label: 'Los residuos con índice Kyte-Doolittle positivo forman enlaces covalentes con el agua.',
          correct: false,
        },
      ],
      rng,
    ),
    explanation: burialSense.explanation,
  }
}

/** Genera una tanda de preguntas sobre la proteína cargada, variando los aminoácidos. */
export function generateProteinQuizSession(
  protein: ParsedProtein,
  mode: 'side-chain' | 'mixed',
  count = 6,
  focusCodes?: string[],
  rng: () => number = Math.random,
): ProteinQuestion[] {
  let pool = eligibleQuizResidues(protein)
  if (focusCodes && focusCodes.length > 0) {
    const filtered = pool.filter((r) => focusCodes.includes(r.aminoAcid.code3))
    if (filtered.length > 0) pool = filtered
  }
  if (pool.length === 0) return []

  // Priorizar variedad de aminoácidos distintos antes de repetir el mismo tipo
  const byType = new Map<string, ProteinResidue[]>()
  for (const res of shuffle(pool, rng)) {
    const list = byType.get(res.aminoAcid.code3) ?? []
    list.push(res)
    byType.set(res.aminoAcid.code3, list)
  }
  const varied: ProteinResidue[] = []
  const buckets = shuffle(Array.from(byType.values()), rng)
  let layer = 0
  while (varied.length < count) {
    let added = false
    for (const bucket of buckets) {
      if (layer < bucket.length) {
        varied.push(bucket[layer])
        added = true
        if (varied.length >= count) break
      }
    }
    if (!added) break
    layer++
  }

  return Array.from({ length: count }, (_, idx) => {
    const res = varied[idx % varied.length]
    if (mode === 'side-chain' || idx % 2 === 0) {
      return buildSideChainQuestion(res, idx, rng)
    }
    return buildSecondaryProteinQuestion(res, idx, rng)
  })
}
