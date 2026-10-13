// Propiedades que muestran la ficha y la tabla de comparación.

import type { ReactNode } from 'react'
import { PHYSIOLOGICAL_PH, chargeSign, netCharge } from '../../chem/charge'
import { HYDROPHILIC_COLOR, HYDROPHOBIC_COLOR, ZERO_CHARGE_COLOR } from '../../components/MolViewer/palette'
import { ESSENTIALITY_LABELS, GROUPS, HYDROPATHY_RANGE, type AminoAcid } from '../../data/aminoacids'
import { formatSigned } from '../../format'

export interface Property {
  id: string
  label: ReactNode
  /** Valor como texto: lo que se compara para resaltar diferencias. */
  text: (aminoAcid: AminoAcid) => string
  /** Presentación enriquecida; si falta se muestra `text`. */
  render?: (aminoAcid: AminoAcid) => ReactNode
}

const CHARGE_WORDS = { positive: 'positiva', negative: 'negativa', neutral: 'neutra' }

export function GroupBadge({ aminoAcid }: { aminoAcid: AminoAcid }) {
  const group = GROUPS[aminoAcid.group]
  return (
    <span className="group-badge" style={{ '--group-color': `var(${group.cssVar})` } as React.CSSProperties}>
      {group.label}
    </span>
  )
}

function HydropathyBar({ value }: { value: number }) {
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

export const PROPERTIES: Property[] = [
  { id: 'name', label: 'Nombre', text: (aa) => aa.name },
  { id: 'codes', label: 'Códigos', text: (aa) => `${aa.code3} · ${aa.code1}` },
  {
    id: 'group',
    label: 'Grupo',
    text: (aa) => GROUPS[aa.group].label,
    render: (aa) => <GroupBadge aminoAcid={aa} />,
  },
  { id: 'mass', label: 'Masa molecular (Mr)', text: (aa) => `${aa.molecularWeight} g/mol` },
  { id: 'pk1', label: 'pKa del α-COOH', text: (aa) => aa.pKa.carboxyl.toFixed(2) },
  {
    id: 'pk2',
    label: (
      <>
        pKa del α-NH<sub>3</sub>
        <sup>+</sup>
      </>
    ),
    text: (aa) => aa.pKa.amino.toFixed(2),
  },
  {
    id: 'pkr',
    label: 'pKa de la cadena lateral',
    text: (aa) => (aa.pKa.sideChain === undefined ? 'No se ioniza' : aa.pKa.sideChain.toFixed(2)),
  },
  { id: 'pi', label: 'Punto isoeléctrico (pI)', text: (aa) => aa.pI.toFixed(2) },
  {
    id: 'hydropathy',
    label: 'Hidropatía (Kyte-Doolittle)',
    text: (aa) => formatSigned(aa.hydropathy, 1),
    render: (aa) => <HydropathyBar value={aa.hydropathy} />,
  },
  { id: 'essentiality', label: 'Esencialidad', text: (aa) => ESSENTIALITY_LABELS[aa.essentiality] },
  {
    id: 'charge',
    label: 'Carga neta a pH 7',
    text: (aa) => `${formatSigned(netCharge(aa, PHYSIOLOGICAL_PH), 2)} (${CHARGE_WORDS[chargeSign(aa)]})`,
  },
  {
    id: 'codons',
    label: 'Codones (ARN)',
    text: (aa) => aa.codons.join(' '),
    render: (aa) => (
      <span className="codons">
        {aa.codons.map((codon) => (
          <code key={codon}>{codon}</code>
        ))}
      </span>
    ),
  },
  { id: 'note', label: 'Nota', text: (aa) => aa.note },
]
