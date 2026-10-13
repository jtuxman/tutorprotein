import { PHYSIOLOGICAL_PH, netCharge } from '../../chem/charge'
import { GROUPS, HYDROPATHY_RANGE, type AminoAcid } from '../../data/aminoacids'
import { polarityClass, sideChainColor } from './coloring'
import { CHARGE_CLOUD_NOTICE, NEUTRAL_STRUCTURE_NOTICE } from './explanations'
import {
  ELEMENT_COLORS,
  HYDROPHILIC_COLOR,
  HYDROPHOBIC_COLOR,
  NEGATIVE_COLOR,
  NEUTRAL_COLOR,
  POLARITY_COLORS,
  POSITIVE_COLOR,
  ZERO_CHARGE_COLOR,
} from './palette'
import type { MolViewerState } from './types'

interface LegendProps {
  state: MolViewerState
  aminoAcid?: AminoAcid
}

const ELEMENT_NAMES: Record<string, string> = { C: 'Carbono', H: 'Hidrógeno', N: 'Nitrógeno', O: 'Oxígeno', S: 'Azufre' }
const POLARITY_NAMES = { nonpolar: 'No polar', polar: 'Polar sin carga', positive: 'Carga +', negative: 'Carga −' }

export function formatSigned(value: number, digits = 1): string {
  const text = Math.abs(value).toFixed(digits)
  if (Number(text) === 0) return text
  return `${value < 0 ? '−' : '+'}${text}`
}

function Chip({ color, children, active = true }: { color: string; children: React.ReactNode; active?: boolean }) {
  return (
    <span className={`mol-legend__chip${active ? '' : ' mol-legend__chip--dim'}`}>
      <span className="mol-legend__swatch" style={{ background: color }} aria-hidden="true" />
      {children}
    </span>
  )
}

/** Barra de gradiente con una marca en la posición `fraction` (0–1). */
export function GradientBar({ colors, fraction, min, max }: { colors: string[]; fraction?: number; min: string; max: string }) {
  return (
    <span className="mol-legend__scale">
      <span>{min}</span>
      <span className="mol-legend__bar" style={{ background: `linear-gradient(90deg, ${colors.join(', ')})` }} aria-hidden="true">
        {fraction !== undefined && <span className="mol-legend__marker" style={{ left: `${fraction * 100}%` }} />}
      </span>
      <span>{max}</span>
    </span>
  )
}

function ColorLegend({ state, aminoAcid }: LegendProps) {
  if (state.colorMode === 'element' || !aminoAcid) {
    return (
      <>
        {Object.entries(ELEMENT_COLORS).map(([element, color]) => (
          <Chip key={element} color={color}>
            {ELEMENT_NAMES[element]}
          </Chip>
        ))}
      </>
    )
  }

  const backbone = <Chip color={NEUTRAL_COLOR}>Esqueleto</Chip>
  switch (state.colorMode) {
    case 'group':
      return (
        <>
          <Chip color={sideChainColor('group', aminoAcid)}>Cadena lateral: {GROUPS[aminoAcid.group].label}</Chip>
          {backbone}
        </>
      )
    case 'hydrophobic':
      return (
        <>
          <Chip color={HYDROPHOBIC_COLOR} active={aminoAcid.hydropathy > 0}>
            Hidrofóbica
          </Chip>
          <Chip color={HYDROPHILIC_COLOR} active={aminoAcid.hydropathy <= 0}>
            Hidrofílica
          </Chip>
          {backbone}
        </>
      )
    case 'kyte-doolittle':
      return (
        <>
          <GradientBar
            colors={[HYDROPHILIC_COLOR, ZERO_CHARGE_COLOR, HYDROPHOBIC_COLOR]}
            fraction={(aminoAcid.hydropathy - HYDROPATHY_RANGE.min) / (HYDROPATHY_RANGE.max - HYDROPATHY_RANGE.min)}
            min={formatSigned(HYDROPATHY_RANGE.min)}
            max={formatSigned(HYDROPATHY_RANGE.max)}
          />
          <span>Hidropatía: {formatSigned(aminoAcid.hydropathy)}</span>
          {backbone}
        </>
      )
    case 'polarity': {
      const current = polarityClass(aminoAcid.group)
      return (
        <>
          {(Object.keys(POLARITY_COLORS) as (keyof typeof POLARITY_COLORS)[]).map((key) => (
            <Chip key={key} color={POLARITY_COLORS[key]} active={key === current}>
              {POLARITY_NAMES[key]}
            </Chip>
          ))}
          {backbone}
        </>
      )
    }
    default:
      return (
        <>
          <GradientBar colors={[NEGATIVE_COLOR, ZERO_CHARGE_COLOR, POSITIVE_COLOR]} min="−1" max="+1" />
          <span>Carga neta a pH 7: {formatSigned(netCharge(aminoAcid, PHYSIOLOGICAL_PH), 2)}</span>
          <span className="mol-legend__note">{NEUTRAL_STRUCTURE_NOTICE}</span>
        </>
      )
  }
}

function SurfaceLegend({ state, aminoAcid }: LegendProps) {
  if (!aminoAcid || state.surface === 'none') return null
  if (state.surface === 'charge-cloud') {
    return (
      <div className="mol-legend mol-legend--surface">
        <strong>Nube:</strong>
        <GradientBar colors={[NEGATIVE_COLOR, '#ffffff', POSITIVE_COLOR]} min="−" max="+" />
        <span className="mol-legend__note">
          {CHARGE_CLOUD_NOTICE} {NEUTRAL_STRUCTURE_NOTICE}
        </span>
      </div>
    )
  }
  return (
    <div className="mol-legend mol-legend--surface">
      <strong>Superficie:</strong>
      <Chip color={HYDROPHOBIC_COLOR}>Apolar (C, S y sus H)</Chip>
      <Chip color={HYDROPHILIC_COLOR}>Polar (N, O y sus H)</Chip>
      <span>
        Hidropatía de {aminoAcid.name} (Kyte-Doolittle): {formatSigned(aminoAcid.hydropathy)}
      </span>
    </div>
  )
}

export function Legend(props: LegendProps) {
  return (
    <>
      <div className="mol-legend">
        <ColorLegend {...props} />
      </div>
      <SurfaceLegend {...props} />
    </>
  )
}
