import { useMemo, useState } from 'react'
import { MolViewer, aminoAcidMolecule } from '../../components/MolViewer'
import { Structure2D } from '../../components/Structure2D'
import { AMINO_ACIDS, GROUPS, GROUP_ORDER, type AminoAcid, type LehningerGroup } from '../../data/aminoacids'
import { compareSideChainTraits, geometryTraitFor, sideChainFormula } from '../../data/sideChainTraits'
import { TRIVIA } from '../../data/trivia'
import { recordAttempt } from '../../progress'
import { GroupBadge } from './GroupBadge'

export interface StructureBuilder3DProps {
  initialAminoAcid?: AminoAcid
}

export function StructureBuilder3D({ initialAminoAcid }: StructureBuilder3DProps) {
  const [target, setTarget] = useState<AminoAcid>(
    () => initialAminoAcid ?? AMINO_ACIDS.find((aa) => aa.code3 === 'Asp') ?? AMINO_ACIDS[0],
  )
  // Cadena lateral acoplada actualmente sobre la base 3D (`null` = solo se ve el núcleo N–CA–C(=O)OH).
  const [attached, setAttached] = useState<AminoAcid | null>(null)
  const [groupFilter, setGroupFilter] = useState<LehningerGroup | 'all'>('all')
  const [blindMode, setBlindMode] = useState<boolean>(false)

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
  }

  const pickRandomTarget = () => {
    const candidates = AMINO_ACIDS.filter((aa) => aa.code3 !== target.code3)
    const next = candidates[Math.floor(Math.random() * candidates.length)] ?? AMINO_ACIDS[0]
    selectTarget(next)
  }

  const handleAttachSideChain = (candidate: AminoAcid) => {
    setAttached(candidate)
    recordAttempt({
      aminoAcid: target.code3,
      skill: 'structure3d',
      correct: candidate.code3 === target.code3,
      responseMs: 2200,
    })
  }

  // Mientras no se haya elegido ninguna cadena lateral, el visor carga Gly/target con `hideSideChain`
  // para mostrar únicamente la base (N, CA, C, O, OXT). Al acoplar una cadena lateral, se muestra ese aminoácido completo.
  const viewerAminoAcid = attached ?? target
  const visibleCandidates =
    groupFilter === 'all' ? AMINO_ACIDS : AMINO_ACIDS.filter((aa) => aa.group === groupFilter)

  return (
    <div className="chem-tool">
      <header className="classification__intro">
        <h2>Constructor 3D de cadenas laterales</h2>
        <p>
          El visor parte de la <strong>base común del aminoácido (<code>H₂N–CαH–COOH</code>)</strong>. Revisa el cuadro
          de <strong>características buscadas</strong> del residuo solicitado y elige entre las cadenas laterales para
          ensamblarlo en 3D: verás qué propiedades aporta tu elección con <strong>✅ acierto</strong> o{' '}
          <strong>❌ tache</strong> en las características incorrectas.
        </p>
      </header>

      <section className="panel builder-controls" aria-label="Selección del residuo objetivo 3D">
        <div className="builder-controls__row">
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

          {!blindMode && (
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

          <button type="button" className="pill-button" onClick={pickRandomTarget}>
            🎲 Nuevo residuo al azar
          </button>

          {attached && (
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
            <span className="filter-bar__label">Residuo solicitado</span>
            <h3>
              {blindMode && !isExactMatch ? (
                '🕵️ Residuo misterioso — identifica y acopla la cadena lateral que cumpla todo'
              ) : (
                <>
                  Construye en 3D: {target.name} ({target.code3} · {target.code1}){' '}
                  <GroupBadge aminoAcid={target} />
                </>
              )}
            </h3>
          </div>
          <span className="ph-badge">
            {attached === null
              ? 'Esperando cadena lateral (R)…'
              : isExactMatch
                ? '✅ ¡Ensamblaje 3D correcto!'
                : `❌ ${wrongTraitsCount} ${wrongTraitsCount === 1 ? 'característica no coincide' : 'características no coinciden'}`}
          </span>
        </div>

        <p className="panel__caption">
          {attached === null
            ? 'Estas son las características que debe proporcionar la cadena lateral (R) buscada:'
            : `Comparando las características buscadas con lo que aporta la cadena lateral elegida (${sideChainFormula(attached)}):`}
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
                        <span>✔ La cadena lateral elegida cumple esta propiedad ({trait.actual}).</span>
                      ) : (
                        <span>
                          ✖ <strong>Tache:</strong> la cadena lateral elegida proporciona{' '}
                          <del>{trait.actual}</del> en lugar de <strong>{trait.expected}</strong>.
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
            {isExactMatch ? (
              <>
                <strong>🎉 ¡Cadena lateral correcta! Has ensamblado {target.name} ({target.code3}) en 3D.</strong>
                <span>
                  Fórmula acoplada: <code>{sideChainFormula(target)}</code> · {TRIVIA[target.code3]?.mnemonic}
                </span>
              </>
            ) : (
              <>
                <strong>
                  ❌ Has acoplado la cadena lateral de {attached.name} ({attached.code3}:{' '}
                  <code>{sideChainFormula(attached)}</code>).
                </strong>
                <span>
                  Esa cadena lateral aporta: <em>{geometryTraitFor(attached)}</em>. Revisa los renglones marcados con
                  tache (❌) arriba y prueba otra cadena lateral de la bandeja.
                </span>
              </>
            )}
          </div>
        )}
      </section>

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
              Las 20 opciones están a la vista con su estructura gráfica 2D y lo que aportan, sin desplazamientos ocultos.
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
                    ariaLabel={` Diagrama de cadena lateral ${sideChainFormula(candidate)}`}
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
    </div>
  )
}
