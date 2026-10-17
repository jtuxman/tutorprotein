import {
  applyAttempt,
  cellMastery,
  currentStreak,
  dueCards,
  emptyProgress,
  exportProgressJson,
  importProgressJson,
  loadProgress,
  recordAttempt,
  resetProgress,
  skillMastery,
} from './progress'

beforeEach(() => {
  resetProgress()
})

describe('progress engine', () => {
  it('promueve la tarjeta en las cajas de Leitner al acertar y la devuelve a la caja 1 al fallar', () => {
    const day1 = new Date(2026, 9, 12, 10, 0)
    let state = emptyProgress()

    state = applyAttempt(state, { aminoAcid: 'Ala', skill: 'structure2d', correct: true, responseMs: 1800, now: day1 })
    expect(state.cards['Ala:structure2d']).toMatchObject({
      box: 1,
      dueDate: '2026-10-13',
      attempts: 1,
      correct: 1,
      streak: 1,
    })

    const day2 = new Date(2026, 9, 13, 10, 0)
    state = applyAttempt(state, { aminoAcid: 'Ala', skill: 'structure2d', correct: true, responseMs: 1400, now: day2 })
    expect(state.cards['Ala:structure2d']).toMatchObject({
      box: 2,
      dueDate: '2026-10-15',
      attempts: 2,
      correct: 2,
      streak: 2,
    })

    // Un fallo regresa a la caja 1 y deja la tarjeta pendiente para hoy mismo.
    state = applyAttempt(state, { aminoAcid: 'Ala', skill: 'structure2d', correct: false, responseMs: 3200, now: day2 })
    expect(state.cards['Ala:structure2d']).toMatchObject({
      box: 1,
      dueDate: '2026-10-13',
      attempts: 3,
      correct: 2,
      streak: 0,
    })
    expect(dueCards(state, '2026-10-13')).toHaveLength(1)
  })

  it('calcula dominio por celda y por habilidad y mantiene la racha de días', () => {
    let state = emptyProgress()
    const days = [new Date(2026, 9, 10, 9), new Date(2026, 9, 11, 9), new Date(2026, 9, 12, 9)]
    for (const now of days) {
      state = applyAttempt(state, { aminoAcid: 'Lys', skill: 'chemistry', correct: true, responseMs: 1000, now })
    }
    state = applyAttempt(state, {
      aminoAcid: 'Lys',
      skill: 'chemistry',
      correct: true,
      responseMs: 900,
      now: new Date(2026, 9, 12, 12),
    })

    const mastery = cellMastery(state, 'Lys', 'chemistry')
    expect(mastery.box).toBe(4)
    expect(mastery.level).toBe('mastered')
    expect(skillMastery(state, 'chemistry', ['Lys', 'Arg']).attempts).toBe(4)
    expect(currentStreak(state, '2026-10-12')).toBe(3)
    // Si hoy aún no practica pero ayer sí, la racha sigue viva.
    expect(currentStreak(state, '2026-10-13')).toBe(3)
    expect(currentStreak(state, '2026-10-14')).toBe(0)
  })

  it('guarda en localStorage y exporta/importa como JSON', () => {
    recordAttempt({
      aminoAcid: 'His',
      skill: 'properties',
      correct: true,
      responseMs: 1200,
      now: new Date(2026, 9, 12, 8),
    })
    expect(loadProgress().attempts).toHaveLength(1)
    const exported = exportProgressJson()
    resetProgress()
    expect(loadProgress().attempts).toHaveLength(0)

    const imported = importProgressJson(exported)
    expect(imported.cards['His:properties']?.correct).toBe(1)
    expect(() => importProgressJson('{"version":99}')).toThrow()
  })
})
