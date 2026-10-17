import { HYDROPHILIC_COLOR, HYDROPHOBIC_COLOR, ZERO_CHARGE_COLOR } from '../../components/MolViewer/palette'
import { HYDROPATHY_RANGE } from '../../data/aminoacids'
import { formatSigned } from '../../format'

export function HydropathyBar({ value }: { value: number }) {
  const fraction = (value - HYDROPATHY_RANGE.min) / (HYDROPATHY_RANGE.max - HYDROPATHY_RANGE.min)
  return (
    <span className="hydropathy">
      <strong>{formatSigned(value, 1)}</strong>
      <span className="hydropathy__scale">
        <span className="hydropathy__end">{formatSigned(HYDROPATHY_RANGE.min, 1)}</span>
        <span
          className="hydropathy__bar"
          style={{ background: `linear-gradient(90deg, ${HYDROPHILIC_COLOR}, ${ZERO_CHARGE_COLOR}, ${HYDROPHOBIC_COLOR})` }}
          aria-hidden="true"
        >
          <span className="hydropathy__marker" style={{ left: `${fraction * 100}%` }} />
        </span>
        <span className="hydropathy__end">{formatSigned(HYDROPATHY_RANGE.max, 1)}</span>
      </span>
    </span>
  )
}
