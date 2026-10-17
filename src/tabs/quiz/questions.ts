// Generador de preguntas y distractores plausibles para la pestaña de
// Autoevaluación (Fase 3).
//
// Todos los valores bioquímicos provienen de `src/data/aminoacids.ts`.
// Regla anti-spoiler: las preguntas visuales nunca exponen etiquetas, colores
// de grupo ni nombres en el prompt.

import { PHYSIOLOGICAL_PH, chargeSign, netCharge } from '../../chem/charge'
import { AMINO_ACIDS, ESSENTIALITY_LABELS, GROUPS, type AminoAcid } from '../../data/aminoacids'
import { formatSigned } from '../../format'
import type { SkillId } from '../../progress'

export type QuestionKind =
  | '2d-to-name'
  | '3d-to-name'
  | 'name-to-2d'
  | 'properties'
  | 'surface-profile'

export interface QuestionOption {
  id: string
  /** Código de 3 letras del aminoácido al que corresponde la opción, si aplica. */
  aminoAcidCode?: string
  label: string
  smiles?: string
  correct: boolean
}

export interface QuizQuestion {
  id: string
  kind: QuestionKind
  skill: SkillId
  aminoAcid: AminoAcid
  prompt: string
  subtitle?: string
  /** Datos del perfil cuando `kind === 'surface-profile'`. */
  profileCue?: {
    chargeAtPh7: string
    hydropathy: string
    pI: string
    hasSulfur: boolean
    ionizableSideChain: boolean
  }
  options: QuestionOption[]
  explanation: string
}

/**
 * Grupos de confusión frecuentes: al elegir distractores se priorizan los
 * miembros del mismo clúster para que las opciones sean plausibles.
 */
export const PLAUSIBLE_CLUSTERS: Record<string, string[]> = {
  Gly: ['Ala', 'Ser', 'Pro'],
  Ala: ['Gly', 'Val', 'Ser'],
  Pro: ['Val', 'Ala', 'Gly'],
  Val: ['Leu', 'Ile', 'Thr', 'Ala'],
  Leu: ['Ile', 'Val', 'Met'],
  Ile: ['Leu', 'Val', 'Thr'],
  Met: ['Cys', 'Leu', 'Ile'],
  Phe: ['Tyr', 'Trp', 'Leu'],
  Tyr: ['Phe', 'Trp', 'His'],
  Trp: ['Phe', 'Tyr', 'His'],
  Ser: ['Thr', 'Cys', 'Ala'],
  Thr: ['Ser', 'Val', 'Cys', 'Ile'],
  Cys: ['Ser', 'Thr', 'Met'],
  Asn: ['Gln', 'Asp', 'Ser'],
  Gln: ['Asn', 'Glu', 'Lys'],
  Lys: ['Arg', 'His', 'Gln'],
  Arg: ['Lys', 'His', 'Gln'],
  His: ['Lys', 'Arg', 'Tyr', 'Trp'],
  Asp: ['Glu', 'Asn', 'Ser'],
  Glu: ['Asp', 'Gln', 'Lys'],
}

/** Reordena un arreglo de forma determinista si se pasa un generador, o con `Math.random`. */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Devuelve `count` distractores plausibles para `target`, priorizando su
 * clúster de confusión y su mismo grupo de Lehninger.
 */
export function pickPlausibleDistractors(
  target: AminoAcid,
  count = 3,
  rng: () => number = Math.random,
): AminoAcid[] {
  const clusterCodes = PLAUSIBLE_CLUSTERS[target.code3] ?? []
  const clusterMembers = shuffle(
    clusterCodes
      .map((code) => AMINO_ACIDS.find((aa) => aa.code3 === code))
      .filter((aa): aa is AminoAcid => aa !== undefined && aa.code3 !== target.code3),
    rng,
  )

  const sameGroup = shuffle(
    AMINO_ACIDS.filter(
      (aa) => aa.code3 !== target.code3 && aa.group === target.group && !clusterCodes.includes(aa.code3),
    ),
    rng,
  )

  const rest = shuffle(
    AMINO_ACIDS.filter(
      (aa) => aa.code3 !== target.code3 && aa.group !== target.group && !clusterCodes.includes(aa.code3),
    ),
    rng,
  )

  return [...clusterMembers, ...sameGroup, ...rest].slice(0, count)
}

function buildOptionsFromPeers(
  target: AminoAcid,
  distractors: AminoAcid[],
  formatOption: (aa: AminoAcid) => Omit<QuestionOption, 'correct'>,
  rng: () => number,
): QuestionOption[] {
  const all = [
    { ...formatOption(target), correct: true },
    ...distractors.map((aa) => ({ ...formatOption(aa), correct: false })),
  ]
  return shuffle(all, rng)
}

function buildPropertyQuestion(target: AminoAcid, subIndex: number, rng: () => number): QuizQuestion {
  const variant = subIndex % 4
  if (variant === 0) {
    // Grupo de Lehninger
    const correctGroup = GROUPS[target.group].label
    const otherGroups = shuffle(
      Object.values(GROUPS)
        .map((g) => g.label)
        .filter((label) => label !== correctGroup),
      rng,
    ).slice(0, 3)
    const options = shuffle(
      [
        { id: target.group, label: correctGroup, correct: true },
        ...otherGroups.map((label) => ({ id: label, label, correct: false })),
      ],
      rng,
    )
    return {
      id: `${target.code3}-prop-group-${subIndex}`,
      kind: 'properties',
      skill: 'properties',
      aminoAcid: target,
      prompt: `¿A qué grupo de la clasificación de Lehninger pertenece ${target.name} (${target.code3})?`,
      options,
      explanation: `${target.name} (${target.code3} · ${target.code1}) pertenece al grupo «${correctGroup}». ${target.note}`,
    }
  }

  if (variant === 1) {
    // Código de 1 y 3 letras
    const distractors = pickPlausibleDistractors(target, 3, rng)
    return {
      id: `${target.code3}-prop-code-${subIndex}`,
      kind: 'properties',
      skill: 'properties',
      aminoAcid: target,
      prompt: `¿Cuáles son las abreviaturas de 3 y de 1 letra de ${target.name}?`,
      options: buildOptionsFromPeers(
        target,
        distractors,
        (aa) => ({ id: aa.code3, aminoAcidCode: aa.code3, label: `${aa.code3} · ${aa.code1}` }),
        rng,
      ),
      explanation: `${target.name} se abrevia ${target.code3} (tres letras) y ${target.code1} (una letra).`,
    }
  }

  if (variant === 2) {
    // Carga a pH 7 y pI (habilidad: química)
    const sign = chargeSign(target)
    const chargeVal = formatSigned(netCharge(target, PHYSIOLOGICAL_PH), 2)
    const labelFor = (s: 'positive' | 'negative' | 'neutral') =>
      s === 'positive'
        ? 'Carga neta positiva (≈ +1): cadena lateral básica protonada'
        : s === 'negative'
          ? 'Carga neta negativa (≈ −1): cadena lateral ácida desprotonada'
          : 'Carga neta cercana a 0 (predomina la forma zwitteriónica neutra)'
    const options: QuestionOption[] = shuffle(
      [
        { id: 'positive', label: labelFor('positive'), correct: sign === 'positive' },
        { id: 'negative', label: labelFor('negative'), correct: sign === 'negative' },
        { id: 'neutral', label: labelFor('neutral'), correct: sign === 'neutral' },
        {
          id: 'plus2',
          label: 'Carga neta +2 a pH fisiológico por tener dos grupos amino desprotonados',
          correct: false,
        },
      ],
      rng,
    )
    return {
      id: `${target.code3}-prop-charge-${subIndex}`,
      kind: 'properties',
      skill: 'chemistry',
      aminoAcid: target,
      prompt: `A pH fisiológico (7.0), ¿cuál es el estado de carga neta de ${target.name} (${target.code3})?`,
      options,
      explanation: `A pH 7.0, ${target.name} tiene una carga neta promedio de ${chargeVal} y un punto isoeléctrico pI = ${target.pI.toFixed(2)}.`,
    }
  }

  // Esencialidad en humanos adultos
  const currentEss = ESSENTIALITY_LABELS[target.essentiality]
  const options: QuestionOption[] = shuffle(
    [
      {
        id: 'essential',
        label: 'Esencial: debe obtenerse obligatoriamente de la dieta',
        correct: target.essentiality === 'essential',
      },
      {
        id: 'conditional',
        label: 'Condicionalmente esencial: la síntesis endógena puede ser insuficiente en crecimiento o estrés',
        correct: target.essentiality === 'conditional',
      },
      {
        id: 'nonessential',
        label: 'No esencial: el organismo humano adulto lo sintetiza en cantidad suficiente',
        correct: target.essentiality === 'nonessential',
      },
      {
        id: 'nonstandard',
        label: 'No estándar: no forma parte de los 20 codificados directamente por el código genético común',
        correct: false,
      },
    ],
    rng,
  )
  return {
    id: `${target.code3}-prop-ess-${subIndex}`,
    kind: 'properties',
    skill: 'properties',
    aminoAcid: target,
    prompt: `En humanos adultos (según Lehninger), ¿cuál es la clasificación nutricional de ${target.name} (${target.code3})?`,
    options,
    explanation: `${target.name} se clasifica como «${currentEss.toLowerCase()}» en humanos adultos.`,
  }
}

/** Construye una pregunta de un tipo dado para un aminoácido objetivo. */
export function buildQuestion(
  target: AminoAcid,
  kind: QuestionKind,
  index = 0,
  rng: () => number = Math.random,
): QuizQuestion {
  const distractors = pickPlausibleDistractors(target, 3, rng)

  if (kind === '2d-to-name') {
    return {
      id: `${target.code3}-2d-${index}`,
      kind,
      skill: 'structure2d',
      aminoAcid: target,
      prompt: '¿Qué aminoácido corresponde a esta estructura 2D en forma neutra?',
      subtitle: 'Fíjate en la longitud, ramificación y grupos funcionales de la cadena lateral.',
      options: buildOptionsFromPeers(
        target,
        distractors,
        (aa) => ({ id: aa.code3, aminoAcidCode: aa.code3, label: `${aa.name} (${aa.code3} · ${aa.code1})` }),
        rng,
      ),
      explanation: `Es ${target.name} (${target.code3} · ${target.code1}), del grupo «${GROUPS[target.group].label}». ${target.note}`,
    }
  }

  if (kind === '3d-to-name') {
    return {
      id: `${target.code3}-3d-${index}`,
      kind,
      skill: 'structure3d',
      aminoAcid: target,
      prompt: 'Rota la molécula 3D: ¿de qué aminoácido se trata?',
      subtitle: 'Modo anti-spoiler activo: colores reveladores, superficies y etiquetas están desactivados hasta responder.',
      options: buildOptionsFromPeers(
        target,
        distractors,
        (aa) => ({ id: aa.code3, aminoAcidCode: aa.code3, label: `${aa.name} (${aa.code3} · ${aa.code1})` }),
        rng,
      ),
      explanation: `La estructura 3D corresponde a ${target.name} (${target.code3} · ${target.code1}). Ahora puedes activar etiquetas, colores de grupo o nube de carga para inspeccionarla.`,
    }
  }

  if (kind === 'name-to-2d') {
    return {
      id: `${target.code3}-name2d-${index}`,
      kind,
      skill: 'structure2d',
      aminoAcid: target,
      prompt: `Selecciona la estructura 2D que corresponde a ${target.name} (${target.code3} · ${target.code1}):`,
      options: buildOptionsFromPeers(
        target,
        distractors,
        (aa) => ({
          id: aa.code3,
          aminoAcidCode: aa.code3,
          label: `Opción ${aa.code3}`,
          smiles: aa.smiles,
        }),
        rng,
      ),
      explanation: `${target.name} (${target.code3}) tiene como SMILES neutro ${target.smiles}. ${target.note}`,
    }
  }

  if (kind === 'surface-profile') {
    // Elegir distractores que no tengan exactamente el mismo par (hidropatía, pI)
    const distinctDistractors = shuffle(
      AMINO_ACIDS.filter(
        (aa) =>
          aa.code3 !== target.code3 &&
          (aa.hydropathy !== target.hydropathy || Math.abs(aa.pI - target.pI) > 0.25),
      ),
      rng,
    ).slice(0, 3)

    const chargeVal = formatSigned(netCharge(target, PHYSIOLOGICAL_PH), 2)
    return {
      id: `${target.code3}-profile-${index}`,
      kind,
      skill: 'chemistry',
      aminoAcid: target,
      prompt: 'Según este perfil de nube de carga e hidropatía a pH 7, ¿cuál de estos aminoácidos es?',
      profileCue: {
        chargeAtPh7: `${chargeVal} (${chargeSign(target) === 'positive' ? 'predominio azul +' : chargeSign(target) === 'negative' ? 'predominio rojo −' : 'nube globalmente neutra'})`,
        hydropathy: `${formatSigned(target.hydropathy, 1)} en la escala de Kyte-Doolittle`,
        pI: target.pI.toFixed(2),
        hasSulfur: target.smiles.includes('S'),
        ionizableSideChain: target.pKa.sideChain !== undefined,
      },
      options: buildOptionsFromPeers(
        target,
        distinctDistractors,
        (aa) => ({ id: aa.code3, aminoAcidCode: aa.code3, label: `${aa.name} (${aa.code3} · ${aa.code1})` }),
        rng,
      ),
      explanation: `${target.name} (${target.code3}) tiene hidropatía ${formatSigned(target.hydropathy, 1)}, pI = ${target.pI.toFixed(2)} y carga neta ${chargeVal} a pH 7.`,
    }
  }

  return buildPropertyQuestion(target, index, rng)
}

export interface QuizSessionConfig {
  count: number
  kinds: QuestionKind[]
  /** Si se especifica, restringe las preguntas a estos códigos de 3 letras. */
  focusAminoAcids?: string[]
}

const KIND_FOR_SKILL: Record<SkillId, QuestionKind> = {
  structure2d: '2d-to-name',
  structure3d: '3d-to-name',
  properties: 'properties',
  chemistry: 'surface-profile',
  protein: '3d-to-name',
  conformation: '3d-to-name',
}

/** Genera una lista de preguntas variadas a partir de la configuración de la sesión. */
export function generateSessionQuestions(
  config: QuizSessionConfig,
  rng: () => number = Math.random,
): QuizQuestion[] {
  const poolCodes = config.focusAminoAcids?.length ? config.focusAminoAcids : AMINO_ACIDS.map((aa) => aa.code3)
  const pool = poolCodes
    .map((code) => AMINO_ACIDS.find((aa) => aa.code3 === code))
    .filter((aa): aa is AminoAcid => aa !== undefined)

  const kinds: QuestionKind[] = config.kinds.length > 0 ? config.kinds : ['2d-to-name', '3d-to-name', 'name-to-2d', 'properties', 'surface-profile']
  const shuffledPool = shuffle(pool.length > 0 ? pool : AMINO_ACIDS, rng)

  const questions: QuizQuestion[] = []
  for (let i = 0; i < config.count; i++) {
    const target = shuffledPool[i % shuffledPool.length]
    const kind = kinds[i % kinds.length]
    questions.push(buildQuestion(target, kind, i, rng))
  }
  return questions
}

/** Construye una sesión de repaso espaciado a partir de las tarjetas vencidas. */
export function generateDailyReviewQuestions(
  due: { aminoAcid: string; skill: SkillId }[],
  maxCount = 8,
  rng: () => number = Math.random,
): QuizQuestion[] {
  if (due.length === 0) {
    return generateSessionQuestions({ count: Math.min(5, maxCount), kinds: ['2d-to-name', 'properties', 'surface-profile'] }, rng)
  }
  return due.slice(0, maxCount).map((item, index) => {
    const aa = AMINO_ACIDS.find((entry) => entry.code3 === item.aminoAcid) ?? AMINO_ACIDS[index % AMINO_ACIDS.length]
    const kind = KIND_FOR_SKILL[item.skill] ?? 'properties'
    return buildQuestion(aa, kind, index, rng)
  })
}
