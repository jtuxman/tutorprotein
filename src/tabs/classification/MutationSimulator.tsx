import { useState } from 'react'
import { PHYSIOLOGICAL_PH, chargeSign, netCharge } from '../../chem/charge'
import { Structure2D } from '../../components/Structure2D'
import { AMINO_ACIDS, GROUPS, findAminoAcid, type AminoAcid } from '../../data/aminoacids'
import {
  HBOND_LABELS,
  REAL_WORLD_MUTATIONS,
  analyzeMutation,
  type RealWorldMutation,
} from '../../data/blosum62'
import { formatSigned } from '../../format'
import { GroupBadge } from './GroupBadge'
import { HydropathyBar } from './HydropathyBar'

const CHARGE_WORDS = { positive: 'positiva', negative: 'negativa', neutral: 'neutra' }

export interface MutationSimulatorProps {
  initialFrom?: AminoAcid
  initialTo?: AminoAcid
}

export function MutationSimulator({ initialFrom, initialTo }: MutationSimulatorProps) {
  const [from, setFrom] = useState<AminoAcid>(
    () => initialFrom ?? findAminoAcid('Glu') ?? AMINO_ACIDS[0],
  )
  const [to, setTo] = useState<AminoAcid>(
    () => initialTo ?? findAminoAcid('Val') ?? AMINO_ACIDS[1],
  )
  const [activePreset, setActivePreset] = useState<RealWorldMutation | null>(REAL_WORLD_MUTATIONS[0])

  const analysis = analyzeMutation(from, to)

  const applyPreset = (preset: RealWorldMutation) => {
    const f = findAminoAcid(preset.from)
    const t = findAminoAcid(preset.to)
    if (f && t) {
      setFrom(f)
      setTo(t)
      setActivePreset(preset)
    }
  }

  return (
    <div className="chem-tool">
      <header className="classification__intro">
        <h2>Simulador de mutaciones (nivel aminoácido)</h2>
        <p>
          Elige una sustitución <strong>X → Y</strong> para comparar masa, carga, polaridad, hidropatía, puentes de
          hidrógeno y su puntuación evolutiva en la matriz <strong>BLOSUM62</strong>.
        </p>
      </header>

      <section className="panel" aria-label="Casos reales precargados">
        <h3>Casos reales y clásicos</h3>
        <div className="filter-bar__chips" role="group" aria-label="Casos reales de mutación">
          {REAL_WORLD_MUTATIONS.map((preset) => {
            const isSelected = from.code3 === preset.from && to.code3 === preset.to
            return (
              <button
                key={preset.id}
                type="button"
                className="chip"
                aria-pressed={isSelected}
                onClick={() => applyPreset(preset)}
              >
                {preset.title} ({preset.from} → {preset.to})
              </button>
            )
          })}
        </div>
        {activePreset && activePreset.from === from.code3 && activePreset.to === to.code3 && (
          <div className="mutation-preset-note" role="note">
            <strong>
              {activePreset.title} — {activePreset.protein} ({activePreset.positionLabel}):
            </strong>{' '}
            {activePreset.clinicalNote}
          </div>
        )}
      </section>

      <section className="panel" aria-label="Selección de aminoácido original y mutado">
        <div className="mutation-selectors">
          <label className="compare__select">
            <span className="filter-bar__label">Aminoácido original (X)</span>
            <select
              aria-label="Aminoácido original"
              value={from.code3}
              onChange={(event) => {
                const next = findAminoAcid(event.target.value)
                if (next) {
                  setFrom(next)
                  setActivePreset(null)
                }
              }}
            >
              {AMINO_ACIDS.map((aa) => (
                <option key={aa.code3} value={aa.code3}>
                  {aa.name} ({aa.code3} · {aa.code1})
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="pill-button"
            onClick={() => {
              setFrom(to)
              setTo(from)
              setActivePreset(null)
            }}
          >
            ⇄ Invertir
          </button>

          <label className="compare__select">
            <span className="filter-bar__label">Aminoácido sustituido (Y)</span>
            <select
              aria-label="Aminoácido sustituido"
              value={to.code3}
              onChange={(event) => {
                const next = findAminoAcid(event.target.value)
                if (next) {
                  setTo(next)
                  setActivePreset(null)
                }
              }}
            >
              {AMINO_ACIDS.map((aa) => (
                <option key={aa.code3} value={aa.code3}>
                  {aa.name} ({aa.code3} · {aa.code1})
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="compare__columns">
        <section
          className="panel compare__column"
          aria-label={`Original: ${from.name}`}
          style={{ '--group-color': `var(${GROUPS[from.group].cssVar})` } as React.CSSProperties}
        >
          <header className="compare__column-header">
            <span className="aa-card__code1" aria-hidden="true">
              {from.code1}
            </span>
            <div>
              <h3>
                {from.name} ({from.code3})
              </h3>
              <GroupBadge aminoAcid={from} />
            </div>
          </header>
          <div className="compare__2d">
            <Structure2D smiles={from.smiles} ariaLabel={`Estructura 2D de ${from.name}`} />
          </div>
        </section>

        <section
          className="panel compare__column"
          aria-label={`Mutado: ${to.name}`}
          style={{ '--group-color': `var(${GROUPS[to.group].cssVar})` } as React.CSSProperties}
        >
          <header className="compare__column-header">
            <span className="aa-card__code1" aria-hidden="true">
              {to.code1}
            </span>
            <div>
              <h3>
                {to.name} ({to.code3})
              </h3>
              <GroupBadge aminoAcid={to} />
            </div>
          </header>
          <div className="compare__2d">
            <Structure2D smiles={to.smiles} ariaLabel={`Estructura 2D de ${to.name}`} />
          </div>
        </section>
      </div>

      <section className="panel" aria-label="Evaluación BLOSUM62 y efecto probable">
        <div className="blosum-banner">
          <div>
            <span className="filter-bar__label">Matriz de sustitución BLOSUM62</span>
            <h3>
              {from.code3} → {to.code3}: puntuación{' '}
              <span className={`blosum-score blosum-score--${analysis.interchangeable}`}>
                {formatSigned(analysis.blosum62, 0)}
              </span>
            </h3>
          </div>
          <span className={`blosum-tag blosum-tag--${analysis.interchangeable}`}>
            {analysis.interchangeableLabel}
          </span>
        </div>

        <ul className="mutation-summary">
          {analysis.summary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <table className="property-table property-table--compare">
          <thead>
            <tr>
              <th scope="col">Propiedad</th>
              <th scope="col">{from.code3}</th>
              <th scope="col">{to.code3}</th>
              <th scope="col">Cambio (Δ)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Masa molecular (Mr)</th>
              <td>{from.molecularWeight} g/mol</td>
              <td>{to.molecularWeight} g/mol</td>
              <td>{formatSigned(analysis.deltaMass, 0)} g/mol</td>
            </tr>
            <tr>
              <th scope="row">Grupo de Lehninger</th>
              <td>{GROUPS[from.group].label}</td>
              <td>{GROUPS[to.group].label}</td>
              <td>{analysis.sameGroup ? 'Mismo grupo' : 'Cambia de grupo'}</td>
            </tr>
            <tr>
              <th scope="row">Carga neta a pH 7</th>
              <td>
                {formatSigned(netCharge(from, PHYSIOLOGICAL_PH), 2)} ({CHARGE_WORDS[chargeSign(from)]})
              </td>
              <td>
                {formatSigned(netCharge(to, PHYSIOLOGICAL_PH), 2)} ({CHARGE_WORDS[chargeSign(to)]})
              </td>
              <td>{formatSigned(analysis.deltaCharge, 2)}</td>
            </tr>
            <tr>
              <th scope="row">Hidropatía (Kyte-Doolittle)</th>
              <td>
                <HydropathyBar value={from.hydropathy} />
              </td>
              <td>
                <HydropathyBar value={to.hydropathy} />
              </td>
              <td>{formatSigned(analysis.deltaHydropathy, 1)}</td>
            </tr>
            <tr>
              <th scope="row">Puentes de H (cadena lateral)</th>
              <td>{HBOND_LABELS[analysis.fromHBond]}</td>
              <td>{HBOND_LABELS[analysis.toHBond]}</td>
              <td>{analysis.fromHBond === analysis.toHBond ? 'Se conserva' : 'Cambia rol'}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  )
}
