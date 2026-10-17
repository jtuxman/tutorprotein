import { useSyncExternalStore } from 'react'
import { loadProgress, subscribeProgress, type ProgressState } from './progress'

export {
  CORE_SKILLS,
  LEITNER_INTERVALS,
  SKILLS,
  SKILL_ORDER,
  addDays,
  aminoAcidMastery,
  applyAttempt,
  cardKey,
  cellMastery,
  currentStreak,
  dueCards,
  emptyProgress,
  exportProgressJson,
  importProgressJson,
  loadProgress,
  recordAttempt,
  resetProgress,
  saveProgress,
  skillMastery,
  subscribeProgress,
  toDateKey,
  type AttemptRecord,
  type LeitnerCard,
  type MasteryLevel,
  type MasterySummary,
  type ProgressState,
  type RecordAttemptInput,
  type SkillId,
  type SkillInfo,
} from './progress'

/** Suscribe un componente React al estado del motor de progreso. */
export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribeProgress, loadProgress, loadProgress)
}
