import { useMemo, useState } from 'react'
import { MolViewer, aminoAcidMolecule } from '../../components/MolViewer'
import { Structure2D } from '../../components/Structure2D'
import { AMINO_ACIDS, findAminoAcid } from '../../data/aminoacids'
import { TRIVIA } from '../../data/trivia'
import {
  CORE_SKILLS,
  SKILLS,
  currentStreak,
  dueCards,
  exportProgressJson,
  importProgressJson,
  recordAttempt,
  skillMastery,
  useProgress,
} from '../../progress'
import { GroupBadge } from '../classification/GroupBadge'
import {
  generateDailyReviewQuestions,
  generateSessionQuestions,
  type QuestionKind,
  type QuizQuestion,
} from './questions'
import './quiz.css'

const QUESTION_KINDS: { id: QuestionKind; label: string; description: string }[] = [
  { id: '2d-to-name', label: '2D → Nombre', description: 'Identifica el aminoácido a partir de su estructura 2D neutra.' },
  { id: '3d-to-name', label: '3D rotable → Nombre', description: 'Rota el modelo 3D (modo anti-spoiler) y descubre cuál es.' },
  { id: 'name-to-2d', label: 'Nombre → Elegir 2D', description: 'Elige cuál de las 4 estructuras 2D corresponde al nombre.' },
  { id: 'properties', label: 'Propiedades y química', description: 'Grupo de Lehninger, códigos, carga a pH 7 y esencialidad.' },
  { id: 'surface-profile', label: 'Nube de carga / hidropatía', description: 'Deduce el aminoácido por su carga, pI e hidropatía.' },
]

interface SessionResult {
  question: QuizQuestion
  chosenOptionId: string
  correct: boolean
  responseMs: number
}

export interface QuizTabProps {
  /** Si se pasa en el primer render, arranca directamente el repaso diario. */
  startDailyReview?: boolean
}

export function QuizTab({ startDailyReview = false }: QuizTabProps) {
  const progress = useProgress()
  const due = useMemo(() => dueCards(progress), [progress])
  const streak = useMemo(() => currentStreak(progress), [progress])
  const allCodes = useMemo(() => AMINO_ACIDS.map((aa) => aa.code3), [])

  const [selectedKinds, setSelectedKinds] = useState<QuestionKind[]>([
    '2d-to-name',
    '3d-to-name',
    'name-to-2d',
    'properties',
    'surface-profile',
  ])
  const [questionCount, setQuestionCount] = useState<number>(8)
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(() =>
    startDailyReview ? generateDailyReviewQuestions(dueCards(progress), 8) : null,
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [chosenId, setChosenId] = useState<string | null>(null)
  const [results, setResults] = useState<SessionResult[]>([])
  const [sessionStreak, setSessionStreak] = useState(0)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)

  const toggleKind = (kind: QuestionKind) => {
    setSelectedKinds((prev) => {
      if (prev.includes(kind)) {
        return prev.length > 1 ? prev.filter((k) => k !== kind) : prev
      }
      return [...prev, kind]
    })
  }

  const startSession = (list: QuizQuestion[]) => {
    setQuestions(list)
    setCurrentIndex(0)
    setChosenId(null)
    setResults([])
    setSessionStreak(0)
  }

  const handleStartConfigured = () => {
    startSession(generateSessionQuestions({ count: questionCount, kinds: selectedKinds }))
  }

  const handleStartDaily = () => {
    startSession(generateDailyReviewQuestions(due, 8))
  }

  const handleRetryMistakes = () => {
    const failedCodes = Array.from(new Set(results.filter((r) => !r.correct).map((r) => r.question.aminoAcid.code3)))
    if (failedCodes.length === 0) return
    startSession(
      generateSessionQuestions({
        count: Math.max(failedCodes.length, 4),
        kinds: selectedKinds,
        focusAminoAcids: failedCodes,
      }),
    )
  }

  const handleExport = () => {
    const json = exportProgressJson(progress)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'aminolab-progreso.json'
    link.click()
    URL.revokeObjectURL(url)
    setBackupMessage('Progreso exportado como JSON.')
  }

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    file
      .text()
      .then((text) => {
        importProgressJson(text)
        setBackupMessage('Progreso importado correctamente.')
      })
      .catch(() => {
        setBackupMessage('No se pudo importar el archivo: formato inválido.')
      })
  }

  // Vista de sesión en curso o resumen final
  if (questions !== null) {
    if (currentIndex >= questions.length) {
      const correctCount = results.filter((r) => r.correct).length
      const accuracy = Math.round((correctCount / Math.max(1, results.length)) * 100)
      const failedCount = results.length - correctCount
      return (
        <article className="quiz-tab">
          <section className="panel quiz-summary" aria-label="Resumen de la sesión">
            <h2>
              {accuracy >= 80 ? '🎉 ¡Excelente sesión!' : accuracy >= 50 ? '👏 ¡Buen progreso!' : '💪 Sesión completada'}
            </h2>
            <p className="quiz-summary__score">
              Acertaste <strong>{correctCount}</strong> de <strong>{results.length}</strong> preguntas ({accuracy} %).
            </p>
            <div className="quiz-summary__actions">
              {failedCount > 0 && (
                <button type="button" className="pill-button pill-button--primary" onClick={handleRetryMistakes}>
                  🔁 Repasar mis errores ({failedCount})
                </button>
              )}
              <button type="button" className="pill-button" onClick={handleStartConfigured}>
                🔄 Nueva tanda igual
              </button>
              <button type="button" className="pill-button" onClick={() => setQuestions(null)}>
                ← Volver a configurar
              </button>
            </div>

            <ul className="quiz-review-list">
              {results.map((item, idx) => (
                <li
                  key={item.question.id + idx}
                  className={`quiz-review-item ${item.correct ? 'quiz-review-item--ok' : 'quiz-review-item--err'}`}
                >
                  <div>
                    <strong>
                      {idx + 1}. {item.question.aminoAcid.name} ({item.question.aminoAcid.code3})
                    </strong>{' '}
                    — <span>{item.correct ? '✅ Acierto' : '❌ Fallo'}</span>
                  </div>
                  <p>{item.question.explanation}</p>
                </li>
              ))}
            </ul>
          </section>
        </article>
      )
    }

    const question = questions[currentIndex]
    const answered = chosenId !== null
    const chosenOption = question.options.find((opt) => opt.id === chosenId)
    const targetAa = question.aminoAcid
    const wrongChosenAa =
      chosenOption && !chosenOption.correct && chosenOption.aminoAcidCode
        ? findAminoAcid(chosenOption.aminoAcidCode)
        : undefined
    const trivia = TRIVIA[targetAa.code3]

    const chooseOption = (optionId: string) => {
      if (answered) return
      const responseMs = 1500
      const option = question.options.find((opt) => opt.id === optionId)
      if (!option) return
      setChosenId(optionId)
      setSessionStreak((s) => (option.correct ? s + 1 : 0))
      setResults((prev) => [...prev, { question, chosenOptionId: optionId, correct: option.correct, responseMs }])
      recordAttempt({
        aminoAcid: targetAa.code3,
        skill: question.skill,
        correct: option.correct,
        responseMs,
      })
    }

    const goNext = () => {
      setChosenId(null)
      setCurrentIndex((idx) => idx + 1)
    }

    return (
      <article className="quiz-tab">
        <header className="quiz-session-bar" aria-label="Estado de la sesión">
          <button type="button" className="pill-button" onClick={() => setQuestions(null)}>
            ← Salir
          </button>
          <span className="quiz-session-bar__progress">
            Pregunta <strong>{currentIndex + 1}</strong> de <strong>{questions.length}</strong>
          </span>
          <span className="quiz-session-bar__streak" aria-label="Racha de aciertos en la sesión">
            🔥 Racha: <strong>{sessionStreak}</strong>
          </span>
        </header>

        <section className="panel quiz-card" aria-label="Pregunta actual">
          <span className="filter-bar__label">{SKILLS[question.skill].label}</span>
          <h2 className="quiz-card__prompt">{question.prompt}</h2>
          {question.subtitle && <p className="panel__caption">{question.subtitle}</p>}

          {question.kind === '2d-to-name' && (
            <div className="quiz-visual-stage">
              {/* Sin ariaLabel con el nombre para cumplir la regla anti-spoiler */}
              <Structure2D smiles={targetAa.smiles} size={230} ariaLabel="Estructura 2D del aminoácido pregunta" />
            </div>
          )}

          {question.kind === '3d-to-name' && (
            <div className="quiz-visual-stage quiz-visual-stage--3d">
              <MolViewer
                molecule={aminoAcidMolecule(targetAa)}
                spoilerFree={!answered}
                colorMode={answered ? 'group' : 'element'}
              />
            </div>
          )}

          {question.kind === 'surface-profile' && question.profileCue && (
            <div className="quiz-profile-cue" aria-label="Pistas de superficie y carga">
              <div className="quiz-profile-cue__item">
                <span>Carga neta y nube a pH 7</span>
                <strong>{question.profileCue.chargeAtPh7}</strong>
              </div>
              <div className="quiz-profile-cue__item">
                <span>Hidropatía (Kyte-Doolittle)</span>
                <strong>{question.profileCue.hydropathy}</strong>
              </div>
              <div className="quiz-profile-cue__item">
                <span>Punto isoeléctrico (pI)</span>
                <strong>{question.profileCue.pI}</strong>
              </div>
              <div className="quiz-profile-cue__item">
                <span>Cadena lateral</span>
                <strong>
                  {question.profileCue.ionizableSideChain ? 'Ionizable' : 'No ionizable'} ·{' '}
                  {question.profileCue.hasSulfur ? 'Con azufre (S)' : 'Sin azufre'}
                </strong>
              </div>
            </div>
          )}

          <div
            className={question.kind === 'name-to-2d' ? 'quiz-options quiz-options--2d' : 'quiz-options'}
            role="group"
            aria-label="Opciones de respuesta"
          >
            {question.options.map((option, idx) => {
              const isChosen = chosenId === option.id
              const stateClass = !answered
                ? ''
                : option.correct
                  ? ' quiz-option--correct'
                  : isChosen
                    ? ' quiz-option--wrong'
                    : ''
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`quiz-option${stateClass}`}
                  disabled={answered}
                  onClick={() => chooseOption(option.id)}
                >
                  {option.smiles ? (
                    <div className="quiz-option__2d">
                      <span className="quiz-option__badge">Opción {idx + 1}</span>
                      <Structure2D smiles={option.smiles} size={150} ariaLabel={`Estructura 2D opción ${idx + 1}`} />
                      {answered && <span className="quiz-option__reveal">{option.aminoAcidCode}</span>}
                    </div>
                  ) : (
                    option.label
                  )}
                </button>
              )
            })}
          </div>

          {answered && chosenOption && (
            <div
              className={`quiz-feedback ${chosenOption.correct ? 'quiz-feedback--ok' : 'quiz-feedback--err'}`}
              role="status"
            >
              <div className="quiz-feedback__headline">
                <strong>
                  {chosenOption.correct ? '🎉 ¡Correcto!' : `❌ Elegiste ${chosenOption.label}. La respuesta es ${targetAa.name}.`}
                </strong>
                <button type="button" className="pill-button pill-button--primary" onClick={goNext}>
                  {currentIndex + 1 < questions.length ? 'Siguiente pregunta →' : 'Ver resumen →'}
                </button>
              </div>
              <p>{question.explanation}</p>

              {/* Ficha de retroalimentación inmediata */}
              <div className="quiz-mini-sheet">
                <div className="quiz-mini-sheet__header">
                  <strong>
                    {targetAa.name} ({targetAa.code3} · {targetAa.code1})
                  </strong>
                  <GroupBadge aminoAcid={targetAa} />
                  <span>pI {targetAa.pI.toFixed(2)}</span>
                  <span>Hidropatía {targetAa.hydropathy}</span>
                </div>
                {trivia && <p className="quiz-mini-sheet__mnemonic">🧠 {trivia.mnemonic}</p>}

                {wrongChosenAa && (
                  <div className="quiz-side-by-side" aria-label="Comparación 2D entre tu elección y la correcta">
                    <div>
                      <span>Tu respuesta: {wrongChosenAa.name}</span>
                      <Structure2D
                        smiles={wrongChosenAa.smiles}
                        size={140}
                        ariaLabel={`Estructura 2D de ${wrongChosenAa.name}`}
                      />
                    </div>
                    <div>
                      <span>Correcta: {targetAa.name}</span>
                      <Structure2D
                        smiles={targetAa.smiles}
                        size={140}
                        ariaLabel={`Estructura 2D de ${targetAa.name}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </article>
    )
  }

  return (
    <div className="quiz-tab">
      <header className="classification__intro">
        <h2>Autoevaluación y repaso espaciado</h2>
        <p>
          Pon a prueba tu reconocimiento de estructuras 2D y 3D, propiedades y química ácido-base. Cada respuesta se
          guarda en tu motor de progreso y programa el repaso espaciado (sistema Leitner).
        </p>
      </header>

      <section className="panel quiz-daily-banner" aria-label="Repaso espaciado diario">
        <div>
          <span className="filter-bar__label">Repaso espaciado diario (Leitner)</span>
          <h3>
            {due.length > 0
              ? `Tienes ${due.length} ${due.length === 1 ? 'tarjeta lista' : 'tarjetas listas'} para repasar hoy`
              : '¡Estás al día! Puedes hacer una sesión corta de mantenimiento'}
          </h3>
          <p className="panel__caption">
            🔥 Racha actual: <strong>{streak}</strong> {streak === 1 ? 'día' : 'días'} · Total de respuestas
            registradas: <strong>{progress.attempts.length}</strong>
          </p>
        </div>
        <button type="button" className="pill-button pill-button--primary" onClick={handleStartDaily}>
          ⚡ Iniciar repaso diario ({due.length > 0 ? Math.min(8, due.length) : 5} preguntas)
        </button>
      </section>

      <section className="panel" aria-label="Configurar sesión de práctica">
        <h3>Configura tu sesión a medida</h3>
        <div className="quiz-config-grid">
          {QUESTION_KINDS.map((kind) => {
            const active = selectedKinds.includes(kind.id)
            return (
              <button
                key={kind.id}
                type="button"
                className={`quiz-kind-tile${active ? ' quiz-kind-tile--active' : ''}`}
                aria-pressed={active}
                onClick={() => toggleKind(kind.id)}
              >
                <strong>{kind.label}</strong>
                <span>{kind.description}</span>
              </button>
            )
          })}
        </div>

        <div className="quiz-config-footer">
          <div className="filter-bar__chips" role="group" aria-label="Número de preguntas">
            <span className="filter-bar__label">Número de preguntas:</span>
            {[5, 8, 12, 20].map((n) => (
              <button
                key={n}
                type="button"
                className="chip"
                aria-pressed={questionCount === n}
                onClick={() => setQuestionCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <button type="button" className="pill-button pill-button--primary" onClick={handleStartConfigured}>
            🎯 Empezar quiz ({questionCount} preguntas)
          </button>
        </div>
      </section>

      <section className="panel" aria-label="Dominio por habilidad">
        <h3>Tu dominio actual (Fases 1–3)</h3>
        <div className="skill-mastery-grid">
          {CORE_SKILLS.map((skillId) => {
            const summary = skillMastery(progress, skillId, allCodes)
            const pct = Math.round(summary.score * 100)
            return (
              <div key={skillId} className="skill-mastery-card">
                <div className="skill-mastery-card__header">
                  <strong>{SKILLS[skillId].label}</strong>
                  <span>{pct} %</span>
                </div>
                <div className="skill-mastery-bar" aria-hidden="true">
                  <div className="skill-mastery-bar__fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="panel__caption">
                  {summary.attempts === 0
                    ? 'Aún sin intentos'
                    : `${summary.correct}/${summary.attempts} aciertos · Caja media ${summary.box}/5`}
                </span>
              </div>
            )
          })}
        </div>

        <div className="quiz-backup-row">
          <button type="button" className="pill-button" onClick={handleExport}>
            💾 Exportar progreso (JSON)
          </button>
          <label className="pill-button">
            📂 Importar progreso
            <input type="file" accept="application/json" className="visually-hidden" onChange={handleImportFile} />
          </label>
          {backupMessage && <span role="status">{backupMessage}</span>}
        </div>
      </section>
    </div>
  )
}
