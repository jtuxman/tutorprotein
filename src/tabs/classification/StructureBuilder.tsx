import { useCallback, useEffect, useRef, useState } from 'react'
import { Structure2D } from '../../components/Structure2D'
import { AMINO_ACIDS, GROUPS, type AminoAcid } from '../../data/aminoacids'
import {
  FRAGMENT_BY_ID,
  SIDE_CHAIN_FRAGMENTS,
  SIDE_CHAIN_RECIPES,
  validateBuiltStructure,
} from '../../data/fragments'
import { recordAttempt } from '../../progress'

type BuilderMode = 'assemble' | 'draw'

export interface StructureBuilderProps {
  initialAminoAcid?: AminoAcid
}

export function StructureBuilder({ initialAminoAcid }: StructureBuilderProps) {
  const [mode, setMode] = useState<BuilderMode>('assemble')
  const [target, setTarget] = useState<AminoAcid>(
    () => initialAminoAcid ?? AMINO_ACIDS.find((aa) => aa.code3 === 'Ser') ?? AMINO_ACIDS[0],
  )
  const [placed, setPlaced] = useState<string[]>([])
  const [showHint, setShowHint] = useState(false)
  const [checkedMessage, setCheckedMessage] = useState<{ matches: boolean; text: string } | null>(null)
  const startTimeRef = useRef<number>(0)

  // Estado del lienzo de dibujo de memoria
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [selfGraded, setSelfGraded] = useState<'correct' | 'wrong' | null>(null)

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }, [])

  const changeTarget = (next: AminoAcid) => {
    setTarget(next)
    setPlaced([])
    setShowHint(false)
    setCheckedMessage(null)
    setRevealed(false)
    setSelfGraded(null)
    startTimeRef.current = Date.now()
    clearCanvas()
  }

  const pickRandomTarget = () => {
    const candidates = AMINO_ACIDS.filter((aa) => aa.code3 !== target.code3)
    const next = candidates[Math.floor(Math.random() * candidates.length)] ?? AMINO_ACIDS[0]
    changeTarget(next)
  }

  const addFragment = (fragmentId: string) => {
    setPlaced((prev) => [...prev, fragmentId])
    setCheckedMessage(null)
  }

  const removeFragmentAt = (index: number) => {
    setPlaced((prev) => prev.filter((_, idx) => idx !== index))
    setCheckedMessage(null)
  }

  const handleCheckAssemble = () => {
    const validation = validateBuiltStructure(target, placed)
    setCheckedMessage({ matches: validation.matches, text: validation.feedback })
    const elapsed = startTimeRef.current > 0 ? Date.now() - startTimeRef.current : 2000
    recordAttempt({
      aminoAcid: target.code3,
      skill: 'structure2d',
      correct: validation.matches,
      responseMs: elapsed,
    })
  }

  // Inicializa el lienzo en blanco
  useEffect(() => {
    if (mode !== 'draw') return
    clearCanvas()
  }, [mode, clearCanvas])

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / Math.max(1, rect.width)
    const scaleY = canvas.height / Math.max(1, rect.height)
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    drawingRef.current = true
    const { x, y } = pointFromEvent(event)
    ctx.strokeStyle = '#2b2147'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
    setHasStrokes(true)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const { x, y } = pointFromEvent(event)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const onPointerUp = () => {
    drawingRef.current = false
  }

  const handleSelfGrade = (correct: boolean) => {
    if (selfGraded !== null) return
    setSelfGraded(correct ? 'correct' : 'wrong')
    const elapsed = startTimeRef.current > 0 ? Date.now() - startTimeRef.current : 2500
    recordAttempt({
      aminoAcid: target.code3,
      skill: 'structure2d',
      correct,
      responseMs: elapsed,
    })
  }

  const liveValidation = validateBuiltStructure(target, placed)
  const recipe = SIDE_CHAIN_RECIPES[target.code3] ?? []

  return (
    <div className="chem-tool">
      <header className="classification__intro">
        <h2>Constructor de estructuras</h2>
        <p>
          Practica las cadenas laterales en dos modos: <strong>armar con fragmentos</strong> sobre el núcleo fijo (la app
          valida comparando con el SMILES neutro) o <strong>dibujar de memoria</strong> y comparar lado a lado.
        </p>
      </header>

      <section className="panel builder-controls" aria-label="Modo y aminoácido objetivo">
        <div className="builder-controls__row">
          <div className="filter-bar__chips" role="group" aria-label="Modo del constructor">
            <button
              type="button"
              className="chip"
              aria-pressed={mode === 'assemble'}
              onClick={() => setMode('assemble')}
            >
              🧩 Armar por fragmentos
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={mode === 'draw'}
              onClick={() => setMode('draw')}
            >
              ✏️ Dibujar de memoria
            </button>
          </div>

          <label className="compare__select">
            <span className="filter-bar__label">Aminoácido a construir</span>
            <select
              aria-label="Aminoácido a construir"
              value={target.code3}
              onChange={(event) => {
                const next = AMINO_ACIDS.find((aa) => aa.code3 === event.target.value)
                if (next) changeTarget(next)
              }}
            >
              {AMINO_ACIDS.map((aa) => (
                <option key={aa.code3} value={aa.code3}>
                  {aa.name} ({aa.code3} · {aa.code1}) — {GROUPS[aa.group].label}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="pill-button" onClick={pickRandomTarget}>
            🎲 Otro al azar
          </button>
        </div>
      </section>

      {mode === 'assemble' ? (
        <div className="aa-detail__structures">
          <section className="panel" aria-label="Núcleo y cadena lateral armada">
            <h3>
              Construye: {target.name} ({target.code3} · {target.code1})
            </h3>
            <p className="panel__caption">
              Grupo: <strong>{GROUPS[target.group].label}</strong>. El núcleo <code>H₂N–CαH–COOH</code> está fijo;
              arrastra o toca los fragmentos en orden desde el Cα hasta el extremo de la cadena lateral.
            </p>

            <div
              className="builder-dropzone"
              aria-label="Zona de armado de la cadena lateral"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const fragmentId = event.dataTransfer.getData('text/plain')
                if (fragmentId && FRAGMENT_BY_ID[fragmentId]) addFragment(fragmentId)
              }}
            >
              <span className="builder-backbone">H₂N — CαH(COOH)</span>
              {placed.map((fragmentId, index) => {
                const fragment = FRAGMENT_BY_ID[fragmentId]
                return (
                  <button
                    key={`${fragmentId}-${index}`}
                    type="button"
                    className="builder-placed-chip"
                    title="Toca para quitar este fragmento"
                    onClick={() => removeFragmentAt(index)}
                  >
                    — {fragment?.formula ?? fragmentId} ✕
                  </button>
                )
              })}
              {placed.length === 0 && (
                <span className="builder-placeholder">← arrastra o toca fragmentos aquí</span>
              )}
            </div>

            {liveValidation.builtSmiles && (
              <div className="builder-preview">
                <Structure2D
                  smiles={liveValidation.builtSmiles}
                  size={200}
                  ariaLabel="Vista previa 2D de la molécula construida"
                />
                <p className="panel__caption">
                  SMILES armado: <code>{liveValidation.builtSmiles}</code>
                </p>
              </div>
            )}

            <div className="builder-actions">
              <button type="button" className="pill-button pill-button--primary" onClick={handleCheckAssemble}>
                Validar estructura
              </button>
              <button
                type="button"
                className="pill-button"
                disabled={placed.length === 0}
                onClick={() => {
                  setPlaced([])
                  setCheckedMessage(null)
                }}
              >
                Vaciar
              </button>
              <button type="button" className="link-button" onClick={() => setShowHint((v) => !v)}>
                {showHint ? 'Ocultar pista' : 'Ver pista'}
              </button>
            </div>

            {showHint && (
              <p className="builder-hint" role="note">
                Pista para {target.name}: necesita <strong>{recipe.length}</strong>{' '}
                {recipe.length === 1 ? 'fragmento' : 'fragmentos'} ({target.note})
              </p>
            )}

            {checkedMessage && (
              <div
                className={`quiz-feedback ${checkedMessage.matches ? 'quiz-feedback--ok' : 'quiz-feedback--err'}`}
                role="status"
              >
                {checkedMessage.text}
              </div>
            )}
          </section>

          <section className="panel" aria-label="Bandeja de fragmentos">
            <h3>Fragmentos disponibles</h3>
            <p className="panel__caption">Toca un fragmento o arrástralo hacia el núcleo Cα.</p>
            <div className="fragment-palette">
              {SIDE_CHAIN_FRAGMENTS.map((fragment) => (
                <button
                  key={fragment.id}
                  type="button"
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData('text/plain', fragment.id)}
                  className="fragment-tile"
                  onClick={() => addFragment(fragment.id)}
                >
                  <span className="fragment-tile__formula">{fragment.formula}</span>
                  <span className="fragment-tile__name">{fragment.name}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="aa-detail__structures">
          <section className="panel" aria-label="Lienzo para dibujar de memoria">
            <h3>
              Dibuja de memoria: {target.name} ({target.code3} · {target.code1})
            </h3>
            <p className="panel__caption">
              Traza la estructura neutra (<code>–NH₂</code> y <code>–COOH</code>) con el ratón o el dedo y luego pulsa
              «Comparar con la correcta».
            </p>
            <canvas
              ref={canvasRef}
              width={320}
              height={260}
              className="draw-canvas"
              aria-label={`Lienzo de dibujo para ${target.name}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
            <div className="builder-actions">
              <button
                type="button"
                className="pill-button pill-button--primary"
                onClick={() => setRevealed(true)}
              >
                Comparar con la correcta
              </button>
              <button
                type="button"
                className="pill-button"
                disabled={!hasStrokes && !revealed}
                onClick={() => {
                  clearCanvas()
                  setRevealed(false)
                  setSelfGraded(null)
                }}
              >
                Borrar lienzo
              </button>
            </div>
          </section>

          <section className="panel" aria-label="Estructura de referencia y autocalificación">
            <h3>Estructura correcta (forma neutra)</h3>
            {revealed ? (
              <>
                <Structure2D smiles={target.smiles} ariaLabel={`Estructura 2D de ${target.name}`} />
                <p className="panel__caption">{target.note}</p>
                <div className="self-grade" role="group" aria-label="Autocalificación">
                  <span>¿Cómo te quedó?</span>
                  <button
                    type="button"
                    className="pill-button pill-button--primary"
                    disabled={selfGraded !== null}
                    onClick={() => handleSelfGrade(true)}
                  >
                    ✅ La dibujé bien
                  </button>
                  <button
                    type="button"
                    className="pill-button"
                    disabled={selfGraded !== null}
                    onClick={() => handleSelfGrade(false)}
                  >
                    🔁 Me faltó algún detalle
                  </button>
                </div>
                {selfGraded && (
                  <p className="quiz-feedback quiz-feedback--ok" role="status">
                    {selfGraded === 'correct'
                      ? '¡Registrado como acierto en tu progreso de Estructura 2D!'
                      : 'Registrado para repasar pronto en Estructura 2D.'}
                  </p>
                )}
              </>
            ) : (
              <p className="classification__empty">
                <span aria-hidden="true">🙈</span> Oculta mientras dibujas. Pulsa «Comparar con la correcta» cuando
                termines tu boceto.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
