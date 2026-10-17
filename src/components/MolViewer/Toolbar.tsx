import { useState } from 'react'
import { COLOR_MODES, REPRESENTATIONS, SURFACES, TOOLS, type Explanation } from './explanations'
import { MEASURE_KINDS, type MeasureKind } from './measure'
import {
  isProteinOnlyColorMode,
  isRevealingColorMode,
  type ColorMode,
  type MolViewerState,
  type Representation,
  type SurfaceMode,
} from './types'

interface ToolbarProps {
  state: MolViewerState
  onChange: (patch: Partial<MolViewerState>) => void
  spoilerFree: boolean
  /** Sin aminoácido asociado no hay propiedades que colorear. */
  hasAminoAcid: boolean
  isProtein?: boolean
  disabled: boolean
  onReset: () => void
  onCapture: () => void
  measureKind: MeasureKind | null
  onMeasureKindChange: (kind: MeasureKind | null) => void
  hasMeasurements: boolean
  onClearMeasurements: () => void
}

interface InfoButtonProps<Key extends string> {
  id: Key
  explanations: Record<Key, Explanation>
  current: Key | null
  onToggle: (id: Key) => void
}

function InfoButton<Key extends string>({ id, explanations, current, onToggle }: InfoButtonProps<Key>) {
  return (
    <button
      type="button"
      className="mol-toolbar__info"
      aria-label={`¿Qué estoy viendo? ${explanations[id].label}`}
      aria-expanded={current === id}
      onClick={() => onToggle(id)}
    >
      ⓘ
    </button>
  )
}

export function Toolbar({
  state,
  onChange,
  spoilerFree,
  hasAminoAcid,
  isProtein = false,
  disabled,
  onReset,
  onCapture,
  measureKind,
  onMeasureKindChange,
  hasMeasurements,
  onClearMeasurements,
}: ToolbarProps) {
  // En pantallas pequeñas la barra se pliega; el CSS la muestra siempre en escritorio.
  const [open, setOpen] = useState(false)
  // La explicación abierta sigue a la opción elegida en ese control.
  const explanations = {
    representation: REPRESENTATIONS[state.representation],
    color: COLOR_MODES[state.colorMode],
    surface: SURFACES[state.surface],
    hydrogens: TOOLS.hydrogens,
    labels: TOOLS.labels,
    measure: TOOLS.measure,
  }
  const [infoKey, setInfoKey] = useState<keyof typeof explanations | null>(null)
  const toggleInfo = (id: keyof typeof explanations) => setInfoKey((shown) => (shown === id ? null : id))
  const info = infoKey && explanations[infoKey]
  const infoProps = { explanations, current: infoKey, onToggle: toggleInfo }
  const propertiesLocked = spoilerFree || (!hasAminoAcid && !isProtein)
  const visibleRepresentations = (Object.keys(REPRESENTATIONS) as Representation[]).filter(
    (key) => isProtein || key !== 'cartoon',
  )
  const visibleColorModes = (Object.keys(COLOR_MODES) as ColorMode[]).filter(
    (key) => isProtein || !isProteinOnlyColorMode(key),
  )

  return (
    <div className="mol-toolbar">
      <button
        type="button"
        className="mol-toolbar__toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">🎛️</span> Opciones del visor
      </button>

      <div className={`mol-toolbar__controls${open ? ' mol-toolbar__controls--open' : ''}`}>
        <div className="mol-toolbar__field">
          <label>
            <span className="mol-toolbar__label">Representación</span>
            <select
              value={state.representation}
              disabled={disabled}
              onChange={(event) => onChange({ representation: event.target.value as Representation })}
            >
              {visibleRepresentations.map((key) => (
                <option key={key} value={key}>
                  {REPRESENTATIONS[key].label}
                </option>
              ))}
            </select>
          </label>
          <InfoButton id="representation" {...infoProps} />
        </div>

        <div className="mol-toolbar__field">
          <label>
            <span className="mol-toolbar__label">Color</span>
            <select
              value={state.colorMode}
              disabled={disabled}
              onChange={(event) => onChange({ colorMode: event.target.value as ColorMode })}
            >
              {visibleColorModes.map((key) => (
                <option key={key} value={key} disabled={propertiesLocked && isRevealingColorMode(key)}>
                  {COLOR_MODES[key].label}
                </option>
              ))}
            </select>
          </label>
          <InfoButton id="color" {...infoProps} />
        </div>

        <div className="mol-toolbar__field">
          <label>
            <span className="mol-toolbar__label">Superficie</span>
            <select
              value={state.surface}
              disabled={disabled}
              onChange={(event) => onChange({ surface: event.target.value as SurfaceMode })}
            >
              {(Object.keys(SURFACES) as SurfaceMode[]).map((key) => (
                <option key={key} value={key} disabled={propertiesLocked && key !== 'none'}>
                  {SURFACES[key].label}
                </option>
              ))}
            </select>
          </label>
          <InfoButton id="surface" {...infoProps} />
        </div>

        {state.surface !== 'none' && (
          <div className="mol-toolbar__field">
            <label>
              <span className="mol-toolbar__label">Opacidad</span>
              <input
                type="range"
                min={0.3}
                max={1}
                step={0.05}
                value={state.surfaceOpacity}
                disabled={disabled}
                onChange={(event) => onChange({ surfaceOpacity: Number(event.target.value) })}
              />
            </label>
          </div>
        )}

        <div className="mol-toolbar__field">
          <label className="mol-toolbar__check">
            <input
              type="checkbox"
              checked={state.showHydrogens}
              disabled={disabled}
              onChange={(event) => onChange({ showHydrogens: event.target.checked })}
            />
            Mostrar hidrógenos
          </label>
          <InfoButton id="hydrogens" {...infoProps} />
        </div>

        <div className="mol-toolbar__field">
          <label className="mol-toolbar__check">
            <input
              type="checkbox"
              checked={state.labels === 'atoms'}
              disabled={disabled || propertiesLocked}
              onChange={(event) => onChange({ labels: event.target.checked ? 'atoms' : 'none' })}
            />
            Etiquetas
          </label>
          <InfoButton id="labels" {...infoProps} />
        </div>

        <div className="mol-toolbar__field">
          <label>
            <span className="mol-toolbar__label">Medir</span>
            <select
              value={measureKind ?? ''}
              disabled={disabled}
              onChange={(event) => onMeasureKindChange((event.target.value || null) as MeasureKind | null)}
            >
              <option value="">Desactivado</option>
              {(Object.keys(MEASURE_KINDS) as MeasureKind[]).map((key) => (
                <option key={key} value={key}>
                  {MEASURE_KINDS[key].label}
                </option>
              ))}
            </select>
          </label>
          <InfoButton id="measure" {...infoProps} />
          {hasMeasurements && (
            <button type="button" className="mol-toolbar__button" onClick={onClearMeasurements}>
              <span aria-hidden="true">🧹</span> Borrar medidas
            </button>
          )}
        </div>

        <div className="mol-toolbar__field">
          <button type="button" className="mol-toolbar__button" disabled={disabled} onClick={onReset} title={TOOLS.reset.text}>
            <span aria-hidden="true">🎯</span> Centrar
          </button>
          <button type="button" className="mol-toolbar__button" disabled={disabled} onClick={onCapture} title={TOOLS.capture.text}>
            <span aria-hidden="true">📷</span> Captura PNG
          </button>
        </div>
      </div>

      {info && (
        <p className="mol-toolbar__explanation" role="status">
          <strong>{info.label}.</strong> {info.text}
        </p>
      )}
    </div>
  )
}
