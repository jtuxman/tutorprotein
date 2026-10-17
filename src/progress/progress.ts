// Motor de progreso compartido de AminoLab.
//
// Registra cada intento de pregunta o reto (aminoácido, habilidad, acierto y
// tiempo), calcula el dominio por aminoácido y habilidad y gestiona el repaso
// espaciado (cajas de Leitner). Persiste en `localStorage` envuelto en
// try/catch y permite exportar/importar como JSON.

export type SkillId = 'structure2d' | 'structure3d' | 'properties' | 'chemistry' | 'protein' | 'conformation'

export interface SkillInfo {
  id: SkillId
  label: string
  shortLabel: string
  description: string
}

export const SKILLS: Record<SkillId, SkillInfo> = {
  structure2d: {
    id: 'structure2d',
    label: 'Estructura 2D',
    shortLabel: '2D',
    description: 'Reconocer y construir la fórmula estructural plana del aminoácido.',
  },
  structure3d: {
    id: 'structure3d',
    label: 'Estructura 3D',
    shortLabel: '3D',
    description: 'Identificar el aminoácido por su geometría tridimensional y su superficie.',
  },
  properties: {
    id: 'properties',
    label: 'Propiedades',
    shortLabel: 'Propiedades',
    description: 'Grupo de Lehninger, códigos, masa, hidropatía, esencialidad y codones.',
  },
  chemistry: {
    id: 'chemistry',
    label: 'Química (pH y pI)',
    shortLabel: 'pH / pI',
    description: 'Protonación, carga neta, punto isoeléctrico y efecto de mutaciones.',
  },
  protein: {
    id: 'protein',
    label: 'En proteína',
    shortLabel: 'Proteína',
    description: 'Reconocer cadenas laterales e interacciones dentro de proteínas reales.',
  },
  conformation: {
    id: 'conformation',
    label: 'Conformación',
    shortLabel: 'Conformación',
    description: 'Ángulos φ/ψ, gráfico de Ramachandran, rotámeros y choques estéricos.',
  },
}

export const SKILL_ORDER: SkillId[] = [
  'structure2d',
  'structure3d',
  'properties',
  'chemistry',
  'protein',
  'conformation',
]

/** Habilidades que ya se practican en las fases 1–3. */
export const CORE_SKILLS: SkillId[] = ['structure2d', 'structure3d', 'properties', 'chemistry']

export interface AttemptRecord {
  /** Código de 3 letras ('Ala', 'Lys'…). */
  aminoAcid: string
  skill: SkillId
  correct: boolean
  /** Duración de la respuesta en milisegundos. */
  responseMs: number
  /** Momento del intento en milisegundos desde epoch. */
  timestamp: number
}

/** Tarjeta de repaso espaciado por par (aminoácido, habilidad): sistema Leitner de 5 cajas. */
export interface LeitnerCard {
  aminoAcid: string
  skill: SkillId
  /** Caja 1 (diaria) a 5 (dominada). */
  box: 1 | 2 | 3 | 4 | 5
  /** Fecha (YYYY-MM-DD, hora local) a partir de la cual toca repasar. */
  dueDate: string
  lastReviewed: string
  attempts: number
  correct: number
  streak: number
}

export interface ProgressState {
  version: 1
  attempts: AttemptRecord[]
  cards: Record<string, LeitnerCard>
  /** Fechas (YYYY-MM-DD) en las que el usuario completó al menos una práctica. */
  activeDays: string[]
}

export type MasteryLevel = 'unseen' | 'learning' | 'familiar' | 'mastered'

export interface MasterySummary {
  attempts: number
  correct: number
  accuracy: number
  /** Puntuación continua 0–1 que pondera precisión y caja de Leitner. */
  score: number
  level: MasteryLevel
  box: number
}

const STORAGE_KEY = 'aminolab.progress.v1'
const MAX_ATTEMPTS = 2000

/** Intervalo en días para cada caja de Leitner tras acertar. */
export const LEITNER_INTERVALS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: 16,
}

export function cardKey(aminoAcid: string, skill: SkillId): string {
  return `${aminoAcid}:${skill}`
}

/** Fecha local en formato YYYY-MM-DD. */
export function toDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export function emptyProgress(): ProgressState {
  return { version: 1, attempts: [], cards: {}, activeDays: [] }
}

function isValidState(value: unknown): value is ProgressState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<ProgressState>
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.attempts) &&
    typeof candidate.cards === 'object' &&
    candidate.cards !== null &&
    Array.isArray(candidate.activeDays)
  )
}

const listeners = new Set<() => void>()
let cachedState: ProgressState | null = null

export function loadProgress(): ProgressState {
  if (cachedState) return cachedState
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isValidState(parsed)) {
        cachedState = parsed
        return parsed
      }
    }
  } catch {
    // Si localStorage está bloqueado o corrupto, se trabaja en memoria.
  }
  cachedState = emptyProgress()
  return cachedState
}

export function saveProgress(state: ProgressState): void {
  cachedState = state
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  } catch {
    // Cuota llena o modo privado estricto: se conserva en memoria.
  }
  for (const listener of listeners) listener()
}

export function resetProgress(): void {
  cachedState = emptyProgress()
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Ignorar errores de almacenamiento.
  }
  for (const listener of listeners) listener()
}

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export interface RecordAttemptInput {
  aminoAcid: string
  skill: SkillId
  correct: boolean
  responseMs?: number
  now?: Date
}

/**
 * Registra una respuesta en una función pura sobre el estado: actualiza el
 * historial, la tarjeta de Leitner y los días activos.
 */
export function applyAttempt(state: ProgressState, input: RecordAttemptInput): ProgressState {
  const now = input.now ?? new Date()
  const today = toDateKey(now)
  const responseMs = Math.max(0, Math.round(input.responseMs ?? 0))
  const attempt: AttemptRecord = {
    aminoAcid: input.aminoAcid,
    skill: input.skill,
    correct: input.correct,
    responseMs,
    timestamp: now.getTime(),
  }

  const key = cardKey(input.aminoAcid, input.skill)
  const previous = state.cards[key]
  const nextBox: 1 | 2 | 3 | 4 | 5 = input.correct
    ? (Math.min(5, (previous?.box ?? 0) + 1) as 1 | 2 | 3 | 4 | 5)
    : 1
  // Si falla, queda pendiente para hoy mismo; si acierta, se programa según su caja.
  const dueDate = input.correct ? addDays(today, LEITNER_INTERVALS[nextBox]) : today

  const card: LeitnerCard = {
    aminoAcid: input.aminoAcid,
    skill: input.skill,
    box: nextBox,
    dueDate,
    lastReviewed: today,
    attempts: (previous?.attempts ?? 0) + 1,
    correct: (previous?.correct ?? 0) + (input.correct ? 1 : 0),
    streak: input.correct ? (previous?.streak ?? 0) + 1 : 0,
  }

  const activeDays = state.activeDays.includes(today) ? state.activeDays : [...state.activeDays, today].sort()
  const attempts = [...state.attempts, attempt].slice(-MAX_ATTEMPTS)

  return {
    version: 1,
    attempts,
    cards: { ...state.cards, [key]: card },
    activeDays,
  }
}

/** Registra un intento en el almacén persistente. */
export function recordAttempt(input: RecordAttemptInput): ProgressState {
  const next = applyAttempt(loadProgress(), input)
  saveProgress(next)
  return next
}

/** Dominio de un par (aminoácido, habilidad). */
export function cellMastery(state: ProgressState, aminoAcid: string, skill: SkillId): MasterySummary {
  const card = state.cards[cardKey(aminoAcid, skill)]
  if (!card || card.attempts === 0) {
    return { attempts: 0, correct: 0, accuracy: 0, score: 0, level: 'unseen', box: 0 }
  }
  const accuracy = card.correct / card.attempts
  const boxFactor = card.box / 5
  const score = Math.min(1, accuracy * 0.6 + boxFactor * 0.4)
  const level: MasteryLevel =
    card.box >= 4 && accuracy >= 0.8
      ? 'mastered'
      : card.box >= 2 && accuracy >= 0.6
        ? 'familiar'
        : 'learning'
  return { attempts: card.attempts, correct: card.correct, accuracy, score, level, box: card.box }
}

/** Dominio agregado de un aminoácido en las habilidades indicadas. */
export function aminoAcidMastery(
  state: ProgressState,
  aminoAcid: string,
  skills: SkillId[] = CORE_SKILLS,
): MasterySummary {
  const cells = skills.map((skill) => cellMastery(state, aminoAcid, skill))
  const attempts = cells.reduce((sum, cell) => sum + cell.attempts, 0)
  const correct = cells.reduce((sum, cell) => sum + cell.correct, 0)
  if (attempts === 0) return { attempts: 0, correct: 0, accuracy: 0, score: 0, level: 'unseen', box: 0 }
  const accuracy = correct / attempts
  const score = cells.reduce((sum, cell) => sum + cell.score, 0) / cells.length
  const box = Math.round(cells.reduce((sum, cell) => sum + cell.box, 0) / cells.length)
  const level: MasteryLevel = score >= 0.75 ? 'mastered' : score >= 0.45 ? 'familiar' : 'learning'
  return { attempts, correct, accuracy, score, level, box }
}

/** Dominio agregado de una habilidad en los aminoácidos dados. */
export function skillMastery(state: ProgressState, skill: SkillId, aminoAcidCodes: string[]): MasterySummary {
  const cells = aminoAcidCodes.map((code) => cellMastery(state, code, skill))
  const attempts = cells.reduce((sum, cell) => sum + cell.attempts, 0)
  const correct = cells.reduce((sum, cell) => sum + cell.correct, 0)
  if (attempts === 0) return { attempts: 0, correct: 0, accuracy: 0, score: 0, level: 'unseen', box: 0 }
  const accuracy = correct / attempts
  const score = cells.reduce((sum, cell) => sum + cell.score, 0) / Math.max(1, cells.length)
  const box = Math.round(cells.reduce((sum, cell) => sum + cell.box, 0) / Math.max(1, cells.length))
  const level: MasteryLevel = score >= 0.75 ? 'mastered' : score >= 0.45 ? 'familiar' : 'learning'
  return { attempts, correct, accuracy, score, level, box }
}

/** Tarjetas cuyo repaso vence hoy o antes, ordenadas de menor caja y fecha más antigua a más reciente. */
export function dueCards(
  state: ProgressState,
  todayKey: string = toDateKey(),
  skills: SkillId[] = CORE_SKILLS,
): LeitnerCard[] {
  const allowed = new Set(skills)
  return Object.values(state.cards)
    .filter((card) => allowed.has(card.skill) && card.dueDate <= todayKey)
    .sort((a, b) => a.box - b.box || a.dueDate.localeCompare(b.dueDate) || a.aminoAcid.localeCompare(b.aminoAcid))
}

/**
 * Racha de días consecutivos con actividad hasta hoy (o hasta ayer si hoy aún
 * no se ha practicado).
 */
export function currentStreak(state: ProgressState, todayKey: string = toDateKey()): number {
  if (state.activeDays.length === 0) return 0
  const days = new Set(state.activeDays)
  let cursor = days.has(todayKey) ? todayKey : addDays(todayKey, -1)
  if (!days.has(cursor)) return 0
  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function exportProgressJson(state: ProgressState = loadProgress()): string {
  return JSON.stringify(state, null, 2)
}

export function importProgressJson(raw: string): ProgressState {
  const parsed: unknown = JSON.parse(raw)
  if (!isValidState(parsed)) {
    throw new Error('El archivo no tiene el formato de progreso de AminoLab.')
  }
  saveProgress(parsed)
  return parsed
}
