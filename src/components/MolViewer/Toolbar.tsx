import { useState } from 'react'
import { COLOR_MODES, REPRESENTATIONS, TOOLS, type Explanation } from './explanations'
import { isRevealingColorMode, type ColorMode, type MolViewerState, type Representation } from './types'

interface ToolbarProps {
  state: MolViewerState
  onChange: (patch: Partial<MolViewerState>) => void
  spoilerFree: boolean
  /** Sin aminoácido asociado no hay propiedades que colorear. */
  hasAminoAcid: boolean
  disabled: boolean
  onReset: () => void
  onCapture: () => void
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

export function Toolbar({ state, onChange, spoilerFree, hasAminoAcid, disabled, onReset, onCapture }: ToolbarProps) {
  // En pantallas pequeñas la barra se pliega; el CSS la muestra siempre en escritorio.
  const [open, setOpen] = useState(false)
  // La explicación abierta sigue a la opción elegida en ese control.
  const explanations = {
    representation: REPRESENTATIONS[state.representation],
    color: COLOR_MODES[state.colorMode],
    hydrogens: TOOLS.hydrogens,
    labels: TOOLS.labels,
  }
  const [infoKey, setInfoKey] = useState<keyof typeof explanations | null>(null)
  const toggleInfo = (id: keyof typeof explanations) => setInfoKey((shown) => (shown === id ? null : id))
  const info = infoKey && explanations[infoKey]
  const infoProps = { explanations, current: infoKey, onToggle: toggleInfo }
  const propertiesLocked = spoilerFree || !hasAminoAcid

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
              {(Object.keys(REPRESENTATIONS) as Representation[]).map((key) => (
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
              {(Object.keys(COLOR_MODES) as ColorMode[]).map((key) => (
                <option key={key} value={key} disabled={propertiesLocked && isRevealingColorMode(key)}>
                  {COLOR_MODES[key].label}
                </option>
              ))}
            </select>
          </label>
          <InfoButton id="color" {...infoProps} />
        </div>

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
