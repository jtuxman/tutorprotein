import { useMemo, useState } from 'react'
import { MolViewer, aminoAcidMolecule } from '../../components/MolViewer'
import { Structure2D } from '../../components/Structure2D'
import { AMINO_ACIDS, GROUPS, GROUP_ORDER, type AminoAcid, type LehningerGroup } from '../../data/aminoacids'
import { compareSideChainTraits, geometryTraitFor, sideChainFormula } from '../../data/sideChainTraits'
import { TRIVIA } from '../../data/trivia'
import { recordAttempt } from '../../progress'
import { pickPlausibleDistractors, shuffle } from '../quiz/questions'
import { GroupBadge } from './GroupBadge'

type SectionMode = 'build' | 'trio-game'

export interface StructureBuilder3DProps {
  initialAminoAcid?: AminoAcid
}

/** Construye el trío de candidatos en 3D (el correcto + 2 distractores plausibles). */
function buildTrioCandidates(target: AminoAcid): AminoAcid[] {
  const distractors = pickPlausibleDistractors(target, 2)
  return shuffle([target, ...distractors])
}

export function StructureBuilder3D({ initialAminoAcid }: StructureBuilder3DProps) {
  const [sectionMode, setSectionMode] = useState<SectionMode>('build')
  const [target, setTarget] = useState<AminoAcid>(
    () => initialAminoAcid ?? AMINO_ACIDS.find((aa) => aa.code3 === 'Asp') ?? AMINO_ACIDS[0],
  )
  // Cadena lateral acoplada actualmente sobre la base 3D (`null` = solo se ve el núcleo N–CA–C(=O)OH).
  const [attached, setAttached] = useState<AminoAcid | null>(null)
  const [groupFilter, setGroupFilter] = useState<LehningerGroup | 'all'>('all')
  const [blindMode, setBlindMode] = useState<boolean>(false)

  // Estado del juego «Elige entre 3 en 3D»
  const [trioCandidates, setTrioCandidates] = useState<AminoAcid[]>(() =>
    buildTrioCandidates(initialAminoAcid ?? AMINO_ACIDS.find((aa) => aa.code3 === 'Asp') ?? AMINO_ACIDS[0]),
  )
  const [gameScore, setGameScore] = useState<{ hits: number; rounds: number; streak: number }>({
    hits: 0,
    rounds: 0,
    streak: 0,
  })

  const targetTraits = useMemo(() => compareSideChainTraits(target, target), [target])
  const comparisonTraits = useMemo(
    () => (attached ? compareSideChainTraits(target, attached) : null),
    [target, attached],
  )

  const isExactMatch = attached?.code3 === target.code3
  const wrongTraitsCount = comparisonTraits ? comparisonTraits.filter((t) => !t.matches).length : 0

  const selectTarget = (next: AminoAcid) => {
    setTarget(next)
    setAttached(null)
    setTrioCandidates(buildTrioCandidates(next))
  }

  const pickRandomTarget = () => {
    const candidates = AMINO_ACIDS.filter((aa) => aa.code3 !== target.code3)
    const next = candidates[Math.floor(Math.random() * candidates.length)] ?? AMINO_ACIDS[0]
    selectTarget(next)
  }

  const handleAttachSideChain = (candidate: AminoAcid) => {
    const correct = candidate.code3 === target.code3
    if (sectionMode === 'trio-game' && attached === null) {
      setGameScore((prev) => ({
        hits: prev.hits + (correct ? 1 : 0),
        rounds: prev.rounds + 1,
        streak: correct ? prev.streak + 1 : 0,
      }))
    }
    setAttached(candidate)
    recordAttempt({
      aminoAcid: target.code3,
      skill: 'structure3d',
      correct,
      responseMs: 2200,
    })
  }

  const switchSectionMode = (nextMode: SectionMode) => {
    setSectionMode(nextMode)
    setAttached(null)
    if (nextMode === 'trio-game') {
      setTrioCandidates(buildTrioCandidates(target))
    }
  }

  // Mientras no se haya elegido ninguna cadena lateral, el visor carga Gly/target con `hideSideChain`
  // para mostrar únicamente la base (N, CA, C, O, OXT). Al acoplar una cadena lateral, se muestra ese aminoácido completo.
  const viewerAminoAcid = attached ?? target
  const visibleCandidates =
    groupFilter === 'all' ? AMINO_ACIDS : AMINO_ACIDS.filter((aa) => aa.group === groupFilter)

  return (
    <div className="chem-tool">
      <header className="classification__intro">
        <h2>Constructor 3D y duelo de cadenas laterales</h2>
        <p>
          Practica en dos modalidades: <strong>🔮 Armar desde la base 3D</strong> (acoplando cualquiera de las 20
          cadenas laterales sobre el núcleo <code>H₂N–CαH–COOH</code>) o <strong>🎮 Juego «Elige entre 3 en 3D»</strong>{' '}
          (lee las características buscadas y descubre cuál de los 3 modelos 3D rotables es el correcto).
        </p>
      </header>

      <section className="panel builder-controls" aria-label="Selección del modo y residuo objetivo 3D">
        <div className="builder-controls__row">
          <div className="filter-bar__chips" role="group" aria-label="Actividad 3D">
            <button
              type="button"
              className="chip"
              aria-pressed={sectionMode === 'build'}
              onClick={() => switchSectionMode('build')}
            >
              🔮 Constructor 3D (20 cadenas)
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={sectionMode === 'trio-game'}
              onClick={() => switchSectionMode('trio-game')}
            >
              🎮 Juego: Elige entre 3 en 3D
            </button>
          </div>

          {sectionMode === 'build' && (
            <div className="filter-bar__chips" role="group" aria-label="Modo de visualización del objetivo">
              <button
                type="button"
                className="chip"
                aria-pressed={!blindMode}
                onClick={() => setBlindMode(false)}
              >
                🎯 Con nombre y características
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={blindMode}
                onClick={() => setBlindMode(true)}
              >
                🕵️ Solo por características buscadas
              </button>
            </div>
          )}

          {sectionMode === 'build' && !blindMode && (
            <label className="compare__select">
              <span className="filter-bar__label">Residuo solicitado</span>
              <select
                aria-label="Residuo solicitado en 3D"
                value={target.code3}
                onChange={(event) => {
                  const next = AMINO_ACIDS.find((aa) => aa.code3 === event.target.value)
                  if (next) selectTarget(next)
                }}
              >
                {AMINO_ACIDS.map((aa) => (
                  <option key={aa.code3} value={aa.code3}>
                    {aa.name} ({aa.code3} · {aa.code1}) — {GROUPS[aa.group].label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {sectionMode === 'trio-game' && (
            <div className="trio-scoreboard" aria-label="Marcador del juego 3D">
              <span className="ph-badge">
                🏆 Aciertos: {gameScore.hits}/{gameScore.rounds}
              </span>
              <span className="ph-badge">🔥 Racha: {gameScore.streak}</span>
            </div>
          )}

          <button type="button" className="pill-button pill-button--primary" onClick={pickRandomTarget}>
            🎲 {sectionMode === 'trio-game' ? 'Siguiente reto 3D →' : 'Nuevo residuo al azar'}
          </button>

          {sectionMode === 'build' && attached && (
            <button type="button" className="pill-button" onClick={() => setAttached(null)}>
              🔄 Dejar solo la base (quitar R)
            </button>
          )}
        </div>
      </section>

      {/* Cuadro de solicitud con las características buscadas y checklist ✅/❌ al elegir */}
      <section className="panel target-spec-panel" aria-label="Cuadro de características buscadas del residuo">
        <div className="target-spec-header">
          <div>
            <span className="filter-bar__label">
              {sectionMode === 'trio-game' ? 'Reto 3D: ¿Cuál de los 3 modelos tiene estas características?' : 'Residuo solicitado'}
            </span>
            <h3>
              {(sectionMode === 'trio-game' || blindMode) && !isExactMatch ? (
                <>
                  🕵️ Residuo buscado — Pista: <em>{target.note}</em>
                </>
              ) : (
                <>
                  {target.name} ({target.code3} · {target.code1}) <GroupBadge aminoAcid={target} />
                </>
              )}
            </h3>
          </div>
          <span className="ph-badge">
            {attached === null
              ? sectionMode === 'trio-game'
                ? 'Rota los 3 modelos 3D abajo y elige el correcto'
                : 'Esperando cadena lateral (R)…'
              : isExactMatch
                ? '✅ ¡Elección 3D correcta!'
                : `❌ ${wrongTraitsCount} ${wrongTraitsCount === 1 ? 'característica no coincide' : 'características no coinciden'}`}
          </span>
        </div>

        <p className="panel__caption">
          {attached === null
            ? 'Características químicas y estructurales que debe cumplir el residuo:'
            : `Comparando las características buscadas con lo que aporta tu elección (${sideChainFormula(attached)}):`}
        </p>

        <ul className="trait-checklist" aria-label="Lista de características del residuo">
          {(comparisonTraits ?? targetTraits).map((trait) => {
            const hasSelection = attached !== null
            const statusClass = !hasSelection
              ? 'trait-item--pending'
              : trait.matches
                ? 'trait-item--ok'
                : 'trait-item--wrong'
            return (
              <li key={trait.id} className={`trait-item ${statusClass}`}>
                <span className="trait-item__icon" aria-hidden="true">
                  {!hasSelection ? '🎯' : trait.matches ? '✅' : '❌'}
                </span>
                <div className="trait-item__body">
                  <div className="trait-item__title">
                    <strong>{trait.label}:</strong>{' '}
                    <span className="trait-item__expected">Buscado: {trait.expected}</span>
                  </div>
                  {hasSelection && (
                    <div className="trait-item__actual">
                      {trait.matches ? (
                        <span>✔ Cumple esta característica ({trait.actual}).</span>
                      ) : (
                        <span>
                          ✖ <strong>Tache:</strong> tu elección proporciona <del>{trait.actual}</del> en lugar de{' '}
                          <strong>{trait.expected}</strong>.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        {attached && (
          <div
            className={`quiz-feedback ${isExactMatch ? 'quiz-feedback--ok' : 'quiz-feedback--err'}`}
            role="status"
          >
            <div className="quiz-feedback__headline">
              <strong>
                {isExactMatch
                  ? `🎉 ¡Exacto! El modelo corresponde a ${target.name} (${target.code3} · ${target.code1}).`
                  : `❌ Elegiste ${attached.name} (${attached.code3}: ${sideChainFormula(attached)}). El residuo buscado es ${target.name} (${target.code3}).`}
              </strong>
              {sectionMode === 'trio-game' && (
                <button type="button" className="pill-button pill-button--primary" onClick={pickRandomTarget}>
                  Siguiente reto de 3 en 3D →
                </button>
              )}
            </div>
            <span>
              {isExactMatch ? (
                <>
                  Fórmula de la cadena lateral: <code>{sideChainFormula(target)}</code> · {TRIVIA[target.code3]?.mnemonic}
                </>
              ) : (
                <>
                  La cadena lateral de {attached.name} aporta: <em>{geometryTraitFor(attached)}</em>. Revisa los
                  renglones con tache (❌) arriba.
                </>
              )}
            </span>
          </div>
        )}
      </section>

      {sectionMode === 'trio-game' ? (
        <section className="panel" aria-label="Tres candidatos probables visualizados en 3D">
          <div className="sidechain-3d-header">
            <div>
              <h3>Elige entre los 3 candidatos probables (visualizados en 3D)</h3>
              <p className="panel__caption">
                Rota e inspecciona cada molécula 3D. Los colores de grupo y etiquetas están ocultos (modo anti-spoiler)
                hasta que elijas uno.
              </p>
            </div>
          </div>

          <div className="trio-3d-grid" role="group" aria-label="Candidatos en 3D">
            {trioCandidates.map((candidate, index) => {
              const letter = ['A', 'B', 'C'][index] ?? String(index + 1)
              const revealed = attached !== null
              const isChosen = attached?.code3 === candidate.code3
              const isWinner = candidate.code3 === target.code3
              const cardStatus = !revealed
                ? ''
                : isWinner
                  ? ' trio-3d-card--correct'
                  : isChosen
                    ? ' trio-3d-card--wrong'
                    : ''

              return (
                <article
                  key={candidate.code3}
                  className={`trio-3d-card${cardStatus}`}
                  aria-label={`Candidato 3D ${letter}`}
                >
                  <header className="trio-3d-card__header">
                    <span className="trio-3d-card__badge">Candidato {letter}</span>
                    {revealed && (
                      <span className="trio-3d-card__reveal">
                        {isWinner ? '✅ ' : isChosen ? '❌ ' : ''}
                        <strong>
                          {candidate.name} ({candidate.code3})
                        </strong>
                      </span>
                    )}
                  </header>

                  <MolViewer
                    molecule={aminoAcidMolecule(candidate)}
                    spoilerFree={!revealed}
                    toolbar={false}
                    colorMode={revealed ? 'group' : 'element'}
                  />

                  {revealed && (
                    <p className="trio-3d-card__meta">
                      <code>{sideChainFormula(candidate)}</code> · {geometryTraitFor(candidate)}
                    </p>
                  )}

                  <button
                    type="button"
                    className={`pill-button ${isChosen ? 'pill-button--primary' : ''} trio-3d-card__choose`}
                    onClick={() => handleAttachSideChain(candidate)}
                  >
                    {!revealed
                      ? `Elegir candidato ${letter}`
                      : isWinner
                        ? `✅ Era ${candidate.name} (${candidate.code3})`
                        : `Ver qué falla en ${candidate.code3}`}
                  </button>
                </article>
              )
            })}
          </div>
        </section>
      ) : (
        <>
          <section className="panel builder-3d-stage" aria-label="Visor 3D de ensamblaje">
            <h3>
              {attached === null
                ? 'Base 3D del aminoácido: H₂N–CαH–COOH (sin cadena lateral)'
                : isExactMatch
                  ? `Estructura 3D ensamblada: ${target.name} (${target.code3})`
                  : `Vista previa 3D con la cadena lateral elegida (${sideChainFormula(attached)})`}
            </h3>
            <div className="builder-3d-stage__viewer">
              <MolViewer
                molecule={aminoAcidMolecule(viewerAminoAcid)}
                hideSideChain={attached === null}
                spoilerFree={blindMode && !isExactMatch}
                colorMode={attached ? 'group' : 'element'}
              />
            </div>
            <p className="panel__caption">
              {attached === null
                ? 'Solo están visibles los átomos del esqueleto común (N, CA, C, O, OXT). Elige una tarjeta gráfica de cadena lateral abajo para injertarla sobre el Cα.'
                : 'En modo color por grupo, el esqueleto se mantiene gris y la cadena lateral acoplada resalta con el color de su familia química.'}
            </p>
          </section>

          <section className="panel" aria-label="Bandeja de cadenas laterales para acoplar en 3D">
            <div className="sidechain-3d-header">
              <div>
                <h3>Elige una cadena lateral (R) para acoplar al Cα</h3>
                <p className="panel__caption">
                  Las 20 opciones están a la vista con su estructura gráfica 2D y lo que aportan, sin desplazamientos
                  ocultos.
                </p>
              </div>
              <div className="filter-bar__chips" role="group" aria-label="Filtrar cadenas laterales por grupo">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={groupFilter === 'all'}
                  onClick={() => setGroupFilter('all')}
                >
                  Todas (20)
                </button>
                {GROUP_ORDER.map((group) => (
                  <button
                    key={group}
                    type="button"
                    className="chip"
                    aria-pressed={groupFilter === group}
                    onClick={() => setGroupFilter(group)}
                  >
                    {GROUPS[group].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sidechain-3d-palette" role="group" aria-label="Opciones de cadenas laterales">
              {visibleCandidates.map((candidate) => {
                const isSelected = attached?.code3 === candidate.code3
                const statusMod = isSelected
                  ? candidate.code3 === target.code3
                    ? ' sidechain-tile--correct'
                    : ' sidechain-tile--wrong'
                  : ''
                return (
                  <button
                    key={candidate.code3}
                    type="button"
                    className={`sidechain-tile${statusMod}`}
                    style={{ '--group-color': `var(${GROUPS[candidate.group].cssVar})` } as React.CSSProperties}
                    aria-pressed={isSelected}
                    onClick={() => handleAttachSideChain(candidate)}
                  >
                    <div className="sidechain-tile__top">
                      <code className="sidechain-tile__formula">{sideChainFormula(candidate)}</code>
                      <span className="sidechain-tile__status" aria-hidden="true">
                        {isSelected ? (candidate.code3 === target.code3 ? '✅' : '❌') : '➕'}
                      </span>
                    </div>
                    <div className="sidechain-tile__graphic">
                      <Structure2D
                        smiles={candidate.smiles}
                        size={130}
                        ariaLabel={`Diagrama de cadena lateral ${sideChainFormula(candidate)}`}
                      />
                    </div>
                    <span className="sidechain-tile__geom">{geometryTraitFor(candidate)}</span>
                    <div className="sidechain-tile__badges">
                      <span className="sidechain-tile__group-tag">{GROUPS[candidate.group].label}</span>
                      <span className="sidechain-tile__hydro-tag">
                        KD {candidate.hydropathy > 0 ? `+${candidate.hydropathy}` : candidate.hydropathy}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
