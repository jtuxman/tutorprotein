import { useMemo, useState } from 'react'
import {
  BURIAL_LABELS,
  SECONDARY_STRUCTURE_LABELS,
  explainBurialSense,
  findResidueContacts,
  parsePdb,
  type ParsedProtein,
} from '../../chem/pdb'
import { MolViewer } from '../../components/MolViewer'
import { Structure2D } from '../../components/Structure2D'
import { GROUPS, findAminoAcid } from '../../data/aminoacids'
import { TRIVIA } from '../../data/trivia'
import { recordAttempt } from '../../progress'
import { GroupBadge } from '../classification/GroupBadge'
import { generateProteinQuizSession, type ProteinQuestion } from './proteinQuiz'
import { FALLBACK_CRAMBIN_PDB, SUGGESTED_PROTEINS, fetchRcsbPdb } from './sampleProteins'
import './proteins.css'

type ProteinMode = 'explore' | 'side-chain-quiz' | 'mixed-quiz'

interface QuizAnswerRecord {
  question: ProteinQuestion
  chosenId: string
  correct: boolean
}

export function ProteinsTab() {
  const [protein, setProtein] = useState<ParsedProtein>(() => parsePdb(FALLBACK_CRAMBIN_PDB, '1CRN'))
  const [pdbInput, setPdbInput] = useState('1UBQ')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [mode, setMode] = useState<ProteinMode>('explore')
  // Al cargar la proteína empieza en `null` para que se vea toda la estructura completa;
  // solo se hace zoom al seleccionar un residuo.
  const [selectedResidueKey, setSelectedResidueKey] = useState<string | null>(null)

  // Interruptores de interacciones y cadenas laterales en el visor 3D (apagados al cargar)
  const [showAllSideChains, setShowAllSideChains] = useState(false)
  const [onlySelectedAndContacts, setOnlySelectedAndContacts] = useState(false)
  const [showAllResidueNames, setShowAllResidueNames] = useState(false)
  const [showContactNames, setShowContactNames] = useState(true)
  const [showContactDistances, setShowContactDistances] = useState(false)
  const [showDisulfides, setShowDisulfides] = useState(false)
  const [showSaltBridges, setShowSaltBridges] = useState(false)
  const [showBurial, setShowBurial] = useState(false)
  const [showLigandSite, setShowLigandSite] = useState(false)

  // Estado del quiz de proteínas
  const [questions, setQuestions] = useState<ProteinQuestion[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [chosenOptionId, setChosenOptionId] = useState<string | null>(null)
  const [quizHistory, setQuizHistory] = useState<QuizAnswerRecord[]>([])
  const [quizStreak, setQuizStreak] = useState(0)

  const applyLoadedPdb = (rawText: string, fallbackId: string) => {
    const parsed = parsePdb(rawText, fallbackId)
    if (parsed.residues.length === 0) {
      throw new Error('El archivo no contiene residuos de los 20 aminoácidos estándar.')
    }
    setProtein(parsed)
    // Al cargar una proteína se muestra entera y sin superposiciones activas
    setSelectedResidueKey(null)
    setShowAllSideChains(false)
    setOnlySelectedAndContacts(false)
    setShowAllResidueNames(false)
    setShowContactDistances(false)
    setShowDisulfides(false)
    setShowSaltBridges(false)
    setShowBurial(false)
    setShowLigandSite(false)
    setMode('explore')
    setQuestions([])
    setLoadError(null)
  }

  const handleLoadById = async (idToLoad: string) => {
    const clean = idToLoad.trim().toUpperCase()
    setLoading(true)
    setLoadError(null)
    try {
      const raw = await fetchRcsbPdb(clean)
      applyLoadedPdb(raw, clean)
    } catch (err) {
      // Si se pidió 1CRN y no hay red, usar el respaldo embebido
      if (clean === '1CRN') {
        applyLoadedPdb(FALLBACK_CRAMBIN_PDB, '1CRN')
      } else {
        setLoadError(err instanceof Error ? err.message : 'No se pudo descargar la proteína desde RCSB.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUploadFile = async (file: File | undefined) => {
    if (!file) return
    setLoading(true)
    setLoadError(null)
    try {
      const text = await file.text()
      const code = file.name.replace(/\.[^.]+$/, '').slice(0, 4).toUpperCase() || 'FILE'
      applyLoadedPdb(text, code)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'No se pudo leer el archivo PDB.')
    } finally {
      setLoading(false)
    }
  }

  const startProteinQuiz = (quizMode: 'side-chain-quiz' | 'mixed-quiz', focusCodes?: string[]) => {
    const generated = generateProteinQuizSession(
      protein,
      quizMode === 'side-chain-quiz' ? 'side-chain' : 'mixed',
      6,
      focusCodes,
    )
    setMode(quizMode)
    setQuestions(generated)
    setQIndex(0)
    setChosenOptionId(null)
    setQuizHistory([])
    setQuizStreak(0)
    if (generated[0]) {
      setSelectedResidueKey(generated[0].residue.key)
    }
  }

  const activeQuestion = mode !== 'explore' && qIndex < questions.length ? questions[qIndex] : null
  const answered = chosenOptionId !== null
  const activeResidue = useMemo(() => {
    if (activeQuestion) return activeQuestion.residue
    if (!selectedResidueKey) return null
    return protein.residues.find((r) => r.key === selectedResidueKey) ?? null
  }, [activeQuestion, protein, selectedResidueKey])

  const activeContacts = useMemo(
    () => findResidueContacts(protein, activeResidue?.key ?? null),
    [protein, activeResidue],
  )

  const handleAnswerQuiz = (optionId: string) => {
    if (!activeQuestion || answered) return
    const opt = activeQuestion.options.find((o) => o.id === optionId)
    if (!opt) return
    setChosenOptionId(optionId)
    setQuizStreak((s) => (opt.correct ? s + 1 : 0))
    setQuizHistory((prev) => [...prev, { question: activeQuestion, chosenId: optionId, correct: opt.correct }])
    recordAttempt({
      aminoAcid: activeQuestion.aminoAcid.code3,
      skill: 'protein',
      correct: opt.correct,
      responseMs: 2400,
    })
  }

  const nextQuizQuestion = () => {
    const nextIdx = qIndex + 1
    setChosenOptionId(null)
    setQIndex(nextIdx)
    if (questions[nextIdx]) {
      setSelectedResidueKey(questions[nextIdx].residue.key)
    }
  }

  const practiceMistakes = () => {
    const failed = Array.from(new Set(quizHistory.filter((h) => !h.correct).map((h) => h.question.aminoAcid.code3)))
    if (failed.length === 0) return
    startProteinQuiz(mode === 'mixed-quiz' ? 'mixed-quiz' : 'side-chain-quiz', failed)
  }

  const hideSideChainSpoilers = Boolean(activeQuestion && activeQuestion.hideSpoilersIn3D && !answered)

  return (
    <div className="proteins-tab">
      <header className="classification__intro">
        <h2>Proteínas reales en 3D</h2>
        <p>
          Carga estructuras cristalográficas desde <strong>RCSB PDB</strong> o sube un archivo <code>.pdb</code>,
          recorre su secuencia, inspecciona puentes disulfuro y salinos y pon a prueba tu ojo con{' '}
          <strong>«¿Qué cadena lateral es esta?»</strong>.
        </p>
      </header>

      {/* Panel de carga y metadatos de la proteína */}
      <section className="panel protein-loader" aria-label="Cargar proteína">
        <div className="protein-loader__row">
          <div className="filter-bar__chips" role="group" aria-label="Proteínas sugeridas">
            <span className="filter-bar__label">Sugeridas:</span>
            {SUGGESTED_PROTEINS.map((sug) => (
              <button
                key={sug.id}
                type="button"
                className="chip"
                aria-pressed={protein.id === sug.id}
                disabled={loading}
                onClick={() => handleLoadById(sug.id)}
              >
                🧬 {sug.name}
              </button>
            ))}
          </div>

          <form
            className="protein-loader__form"
            onSubmit={(event) => {
              event.preventDefault()
              handleLoadById(pdbInput)
            }}
          >
            <label>
              <span className="visually-hidden">Código PDB de 4 caracteres</span>
              <input
                type="text"
                maxLength={4}
                placeholder="ID PDB (ej. 1UBQ)"
                value={pdbInput}
                onChange={(e) => setPdbInput(e.target.value)}
              />
            </label>
            <button type="submit" className="pill-button pill-button--primary" disabled={loading}>
              {loading ? 'Cargando…' : 'Descargar de RCSB'}
            </button>
          </form>

          <label
            className="pill-button protein-loader__upload"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleUploadFile(e.dataTransfer.files?.[0])
            }}
          >
            📂 Subir .pdb
            <input
              type="file"
              accept=".pdb,.ent,text/plain"
              className="visually-hidden"
              onChange={(e) => handleUploadFile(e.target.files?.[0])}
            />
          </label>
        </div>

        {loadError && (
          <p className="quiz-feedback quiz-feedback--err" role="alert">
            {loadError}
          </p>
        )}

        <div className="protein-meta" aria-label="Resumen de la estructura cargada">
          <div>
            <strong>
              {protein.id} — {protein.title}
            </strong>
          </div>
          <div className="protein-meta__badges">
            <span className="ph-badge">Cadenas: {protein.chains.join(', ')} ({protein.chains.length})</span>
            <span className="ph-badge">Residuos estándar: {protein.residues.length}</span>
            <span className="ph-badge">Puentes disulfuro: {protein.disulfides.length}</span>
            <span className="ph-badge">Puentes salinos: {protein.saltBridges.length}</span>
            {protein.ligandNames.length > 0 && (
              <span className="ph-badge">Ligandos: {protein.ligandNames.join(', ')}</span>
            )}
          </div>
        </div>
      </section>

      {/* Selector de modo: Explorar vs Evaluación de cadenas laterales vs Retos de proteína */}
      <nav className="subtab-bar" aria-label="Modos de la pestaña Proteínas">
        <button
          type="button"
          className="chip"
          aria-pressed={mode === 'explore'}
          onClick={() => setMode('explore')}
        >
          🔍 Explorar estructura e interacciones
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={mode === 'side-chain-quiz'}
          onClick={() => startProteinQuiz('side-chain-quiz')}
        >
          🎯 Evaluación: «¿Qué cadena lateral es esta?»
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={mode === 'mixed-quiz'}
          onClick={() => startProteinQuiz('mixed-quiz')}
        >
          🧪 Retos de estructura secundaria, exposición y puentes
        </button>
      </nav>

      {/* Barra de secuencia y visor 3D juntos en un bloque amplio */}
      <section className="panel protein-stage-card" aria-label="Secuencia y visor 3D de la proteína">
        <div className="sequence-panel__header">
          <div>
            <strong>Barra de secuencia ({protein.residues.length} residuos)</strong>{' '}
            <span className="panel__caption">
              {hideSideChainSpoilers
                ? 'Modo anti-spoiler activo: las letras de secuencia se ocultan hasta responder.'
                : 'Toca un residuo para hacer zoom sobre él; al cargar la proteína se muestra completa.'}
            </span>
          </div>
          {mode === 'explore' && selectedResidueKey !== null && (
            <button type="button" className="pill-button" onClick={() => setSelectedResidueKey(null)}>
              🔭 Ver proteína completa
            </button>
          )}
        </div>

        <div className="sequence-bar" role="listbox" aria-label="Secuencia de aminoácidos">
          {protein.residues.map((res) => {
            const isSelected = activeResidue?.key === res.key
            return (
              <button
                key={res.key}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={mode !== 'explore'}
                className={`seq-residue${isSelected ? ' seq-residue--selected' : ''}`}
                style={
                  {
                    '--group-color': hideSideChainSpoilers
                      ? '#94a3b8'
                      : `var(${GROUPS[res.aminoAcid.group].cssVar})`,
                  } as React.CSSProperties
                }
                title={
                  hideSideChainSpoilers
                    ? `Posición ${res.resSeq}`
                    : `${res.aminoAcid.name} (${res.aminoAcid.code3} ${res.resSeq}, cadena ${res.chain})`
                }
                onClick={() => setSelectedResidueKey((prev) => (prev === res.key ? null : res.key))}
              >
                <span className="seq-residue__code">{hideSideChainSpoilers ? '?' : res.aminoAcid.code1}</span>
                <span className="seq-residue__num">{res.resSeq}</span>
              </button>
            )
          })}
        </div>

        <MolViewer
          molecule={{ kind: 'pdb', id: protein.id, data: protein.rawPdb, parsed: protein }}
          spoilerFree={hideSideChainSpoilers}
          toolbarPosition="bottom"
          proteinOptions={{
            selectedResidueKey: activeResidue?.key ?? null,
            quizSideChainOnly: hideSideChainSpoilers,
            showAllSideChains,
            onlySelectedAndContacts,
            showAllResidueNames,
            showContactNames,
            showContactDistances,
            showDisulfides,
            showSaltBridges,
            showBurial,
            showLigandSite,
            onResidueClick: (key) => {
              if (mode === 'explore') setSelectedResidueKey(key)
            },
          }}
        />

        <div className="protein-controls-section" role="group" aria-label="Controles de cadenas laterales y contactos">
          <div className="protein-sidechain-bar">
            <button
              type="button"
              className="chip"
              aria-pressed={showAllSideChains && !onlySelectedAndContacts}
              disabled={hideSideChainSpoilers}
              onClick={() => {
                setOnlySelectedAndContacts(false)
                setShowAllSideChains((v) => !v)
              }}
            >
              🫧 Todas las cadenas laterales (bolas y varillas)
            </button>

            <button
              type="button"
              className="chip"
              aria-pressed={showAllResidueNames}
              disabled={hideSideChainSpoilers}
              onClick={() => setShowAllResidueNames((v) => !v)}
            >
              🏷️ {showAllResidueNames ? 'Ocultar nombres de todos los residuos' : 'Mostrar nombres de todos los residuos'}
            </button>

            <button
              type="button"
              className="chip"
              aria-pressed={onlySelectedAndContacts}
              disabled={hideSideChainSpoilers || !activeResidue}
              title={!activeResidue ? 'Selecciona primero un residuo en la secuencia o en el 3D' : undefined}
              onClick={() => {
                setOnlySelectedAndContacts((v) => !v)
                if (!onlySelectedAndContacts) setShowAllSideChains(false)
              }}
            >
              🤝 Solo seleccionado y sus contactos ({activeContacts.length})
            </button>

            <label className="mol-toolbar__check">
              <input
                type="checkbox"
                checked={showContactNames}
                disabled={hideSideChainSpoilers || !activeResidue}
                onChange={(e) => setShowContactNames(e.target.checked)}
              />
              Nombres en contactos (seleccionado siempre con nombre)
            </label>

            <label className="mol-toolbar__check">
              <input
                type="checkbox"
                checked={showContactDistances}
                disabled={hideSideChainSpoilers || !activeResidue}
                onChange={(e) => setShowContactDistances(e.target.checked)}
              />
              📏 Distancias de contacto (Å)
            </label>
          </div>

          <div className="protein-interactions-bar" role="group" aria-label="Interruptores de interacciones">
            <label className="mol-toolbar__check">
              <input
                type="checkbox"
                checked={showDisulfides}
                disabled={hideSideChainSpoilers}
                onChange={(e) => setShowDisulfides(e.target.checked)}
              />
              Puentes disulfuro ({protein.disulfides.length})
            </label>
            <label className="mol-toolbar__check">
              <input
                type="checkbox"
                checked={showSaltBridges}
                disabled={hideSideChainSpoilers}
                onChange={(e) => setShowSaltBridges(e.target.checked)}
              />
              Puentes salinos ({protein.saltBridges.length})
            </label>
            <label className="mol-toolbar__check">
              <input
                type="checkbox"
                checked={showBurial}
                disabled={hideSideChainSpoilers}
                onChange={(e) => setShowBurial(e.target.checked)}
              />
              Expuestos (cian) vs. enterrados (ámbar)
            </label>
            {protein.ligandNames.length > 0 && (
              <label className="mol-toolbar__check">
                <input
                  type="checkbox"
                  checked={showLigandSite}
                  disabled={hideSideChainSpoilers}
                  onChange={(e) => setShowLigandSite(e.target.checked)}
                />
                Sitio de unión a ligando (&lt; 5 Å)
              </label>
            )}
          </div>
        </div>
      </section>

      <div className="protein-bottom-panel">
        {mode === 'explore' ? (
          <section className="panel residue-inspector" aria-label="Ficha del residuo seleccionado">
            {activeResidue ? (
              <div className="residue-inspector__grid">
                <div className="residue-inspector__left">
                  <header className="residue-inspector__header">
                    <span
                      className="aa-detail__letter"
                      style={{ '--group-color': `var(${GROUPS[activeResidue.aminoAcid.group].cssVar})` } as React.CSSProperties}
                    >
                      {activeResidue.aminoAcid.code1}
                    </span>
                    <div>
                      <h3>
                        {activeResidue.aminoAcid.name} ({activeResidue.aminoAcid.code3} {activeResidue.resSeq})
                      </h3>
                      <p className="panel__caption">
                        Cadena <strong>{activeResidue.chain}</strong> · <GroupBadge aminoAcid={activeResidue.aminoAcid} />
                      </p>
                    </div>
                  </header>

                  <Structure2D
                    smiles={activeResidue.aminoAcid.smiles}
                    size={165}
                    ariaLabel={`Estructura 2D de ${activeResidue.aminoAcid.name}`}
                  />
                </div>

                <div className="residue-inspector__right">
                  <dl className="residue-props">
                    <div>
                      <dt>Estructura secundaria</dt>
                      <dd>{SECONDARY_STRUCTURE_LABELS[activeResidue.secondaryStructure]}</dd>
                    </div>
                    <div>
                      <dt>Ángulos diedros (φ, ψ)</dt>
                      <dd>
                        φ = {activeResidue.phi !== null ? `${activeResidue.phi}°` : 'N-terminal'} · ψ ={' '}
                        {activeResidue.psi !== null ? `${activeResidue.psi}°` : 'C-terminal'}
                      </dd>
                    </div>
                    <div>
                      <dt>Exposición al solvente</dt>
                      <dd>
                        {BURIAL_LABELS[activeResidue.burial]} ({activeResidue.neighborCount} residuos vecinos)
                      </dd>
                    </div>
                    <div>
                      <dt>Hidropatía (Kyte-Doolittle)</dt>
                      <dd>
                        {activeResidue.aminoAcid.hydropathy > 0
                          ? `+${activeResidue.aminoAcid.hydropathy} (hidrofóbico)`
                          : `${activeResidue.aminoAcid.hydropathy} (hidrofílico)`}
                      </dd>
                    </div>
                    <div>
                      <dt>Puente disulfuro</dt>
                      <dd>
                        {activeResidue.disulfidePartner
                          ? `Sí, enlazado con Cys ${activeResidue.disulfidePartner}`
                          : 'No participa'}
                      </dd>
                    </div>
                    <div>
                      <dt>Puentes salinos</dt>
                      <dd>
                        {activeResidue.saltBridgePartners.length > 0
                          ? `Sí, con ${activeResidue.saltBridgePartners.join(', ')}`
                          : 'Ninguno detectado'}
                      </dd>
                    </div>
                  </dl>

                  {activeContacts.length > 0 && (
                    <div className="residue-contacts-box">
                      <strong>Residuos en contacto (≤ 4.5 Å):</strong>
                      <div className="filter-bar__chips">
                        {activeContacts.map((c) => (
                          <button
                            key={c.partnerKey}
                            type="button"
                            className="chip"
                            onClick={() => setSelectedResidueKey(c.partnerKey)}
                          >
                            {c.partner.aminoAcid.code3} {c.partner.resSeq} ({c.fromAtom.name}↔{c.toAtom.name}:{' '}
                            <strong>{c.distance} Å</strong>)
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="residue-sense-box">{explainBurialSense(activeResidue).explanation}</p>
                </div>
              </div>
            ) : (
              <p className="panel__caption">
                🔭 <strong>Vista de la proteína completa.</strong> Toca cualquier residuo en la barra de secuencia o
                directamente en el modelo 3D para hacer zoom sobre él y ver aquí su estructura 2D, ángulos φ/ψ,
                exposición e interacciones.
              </p>
            )}
          </section>
        ) : (
          <section className="panel protein-quiz-panel" aria-label="Evaluación en la proteína">
            {qIndex >= questions.length ? (
              <div className="quiz-summary">
                <h3>
                  🎉 Resumen en {protein.id}:{' '}
                  {quizHistory.filter((h) => h.correct).length}/{quizHistory.length} aciertos
                </h3>
                <div className="quiz-summary__actions">
                  {quizHistory.some((h) => !h.correct) && (
                    <button type="button" className="pill-button pill-button--primary" onClick={practiceMistakes}>
                      🔁 Practicar mis fallos ({quizHistory.filter((h) => !h.correct).length})
                    </button>
                  )}
                  <button type="button" className="pill-button" onClick={() => startProteinQuiz(mode)}>
                    🔄 Nueva tanda en {protein.id}
                  </button>
                  <button type="button" className="pill-button" onClick={() => setMode('explore')}>
                    🔍 Volver a explorar
                  </button>
                </div>
              </div>
            ) : activeQuestion ? (
              <>
                <header className="quiz-session-bar">
                  <span>
                    Pregunta <strong>{qIndex + 1}</strong> de <strong>{questions.length}</strong>
                  </span>
                  <span>
                    🔥 Racha: <strong>{quizStreak}</strong>
                  </span>
                </header>

                <h3>{activeQuestion.prompt}</h3>
                <p className="panel__caption">{activeQuestion.subtitle}</p>

                <div className="quiz-options" role="group" aria-label="Opciones de la pregunta en proteína">
                  {activeQuestion.options.map((option) => {
                    const isChosen = chosenOptionId === option.id
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
                        onClick={() => handleAnswerQuiz(option.id)}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>

                {answered && (
                  <div
                    className={`quiz-feedback ${
                      activeQuestion.options.find((o) => o.id === chosenOptionId)?.correct
                        ? 'quiz-feedback--ok'
                        : 'quiz-feedback--err'
                    }`}
                    role="status"
                  >
                    <div className="quiz-feedback__headline">
                      <strong>
                        {activeQuestion.options.find((o) => o.id === chosenOptionId)?.correct
                          ? `🎉 ¡Correcto! Es ${activeQuestion.aminoAcid.name} (${activeQuestion.aminoAcid.code3}).`
                          : `❌ La respuesta correcta es ${activeQuestion.aminoAcid.name} (${activeQuestion.aminoAcid.code3}).`}
                      </strong>
                      <button type="button" className="pill-button pill-button--primary" onClick={nextQuizQuestion}>
                        {qIndex + 1 < questions.length ? 'Siguiente residuo →' : 'Ver resumen →'}
                      </button>
                    </div>
                    <p>{activeQuestion.explanation}</p>

                    <div className="quiz-mini-sheet">
                      <div className="quiz-mini-sheet__header">
                        <strong>
                          {activeQuestion.aminoAcid.name} ({activeQuestion.aminoAcid.code3} ·{' '}
                          {activeQuestion.aminoAcid.code1})
                        </strong>
                        <GroupBadge aminoAcid={activeQuestion.aminoAcid} />
                        <span>pI {activeQuestion.aminoAcid.pI.toFixed(2)}</span>
                        <span>KD {activeQuestion.aminoAcid.hydropathy}</span>
                      </div>
                      {TRIVIA[activeQuestion.aminoAcid.code3] && (
                        <p className="quiz-mini-sheet__mnemonic">
                          🧠 {TRIVIA[activeQuestion.aminoAcid.code3].mnemonic}
                        </p>
                      )}

                      {(() => {
                        const chosenOpt = activeQuestion.options.find((o) => o.id === chosenOptionId)
                        const wrongAa =
                          chosenOpt && !chosenOpt.correct && chosenOpt.aminoAcidCode
                            ? findAminoAcid(chosenOpt.aminoAcidCode)
                            : undefined
                        if (!wrongAa) {
                          return (
                            <Structure2D
                              smiles={activeQuestion.aminoAcid.smiles}
                              size={140}
                              ariaLabel={`Estructura 2D de ${activeQuestion.aminoAcid.name}`}
                            />
                          )
                        }
                        return (
                          <div className="quiz-side-by-side" aria-label="Comparación 2D lado a lado">
                            <div>
                              <span>Tu elección: {wrongAa.name}</span>
                              <Structure2D
                                smiles={wrongAa.smiles}
                                size={135}
                                ariaLabel={`Estructura 2D de ${wrongAa.name}`}
                              />
                            </div>
                            <div>
                              <span>Correcta: {activeQuestion.aminoAcid.name}</span>
                              <Structure2D
                                smiles={activeQuestion.aminoAcid.smiles}
                                size={135}
                                ariaLabel={`Estructura 2D de ${activeQuestion.aminoAcid.name}`}
                              />
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </section>
        )}
      </div>
    </div>
  )
}
