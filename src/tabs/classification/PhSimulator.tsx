import { useMemo, useState } from 'react'
import { netCharge } from '../../chem/charge'
import { describeProtonation, protonatedSmiles, titrationCurve } from '../../chem/protonation'
import { MolViewer, aminoAcidMolecule } from '../../components/MolViewer'
import { Structure2D } from '../../components/Structure2D'
import { AMINO_ACIDS, GROUPS, type AminoAcid } from '../../data/aminoacids'
import { formatSigned } from '../../format'
import { recordAttempt } from '../../progress'

interface PhQuestion {
  id: string
  aminoAcidCode: string
  prompt: string
  targetPh: number
  options: { id: string; label: string; correct: boolean }[]
  explanation: string
}

const PH_QUESTIONS: PhQuestion[] = [
  {
    id: 'his-ph5',
    aminoAcidCode: 'His',
    targetPh: 5.0,
    prompt: '¿Qué carga neta aproximada tiene la histidina libre a pH 5.0?',
    options: [
      { id: 'plus1', label: 'Aproximadamente +0.9 (positiva: α-NH₃⁺ e imidazolio protonados, α-COO⁻ desprotonado)', correct: true },
      { id: 'zero', label: 'Cercana a 0 (zwitterión sin carga en la cadena lateral)', correct: false },
      { id: 'minus1', label: 'Aproximadamente −1.0 (predomina la forma aniónica)', correct: false },
      { id: 'plus2', label: 'Exactamente +2.0 (los tres grupos totalmente protonados)', correct: false },
    ],
    explanation:
      'A pH 5.0 el α-COOH (pKa 1.82) ya perdió su protón (−1), el α-NH₃⁺ (pKa 9.17) sigue protonado (+1) y el anillo de imidazol (pKa 6.00) está protonado en ~91 % (+0.91). La suma da ≈ +0.91.',
  },
  {
    id: 'asp-pi',
    aminoAcidCode: 'Asp',
    targetPh: 2.77,
    prompt: '¿A qué pH el ácido aspártico tiene carga neta promedio igual a cero (su pI)?',
    options: [
      { id: 'pi277', label: 'A pH ≈ 2.77, a mitad de camino entre pK₁ (1.88) y pK_R (3.65)', correct: true },
      { id: 'pi570', label: 'A pH ≈ 5.74, promedio entre pK₁ y pK₂', correct: false },
      { id: 'pi700', label: 'A pH 7.00, donde ambos carboxilos están desprotonados', correct: false },
      { id: 'pi960', label: 'A pH ≈ 9.60, cuando se titula el grupo amino', correct: false },
    ],
    explanation:
      'Para que el ácido aspártico sea neutro en promedio, la carga +1 del α-NH₃⁺ debe compensarse con −1 repartido entre sus dos carboxilos; eso ocurre justo en el promedio de pK₁ (1.88) y pK_R (3.65): pI = 2.77.',
  },
  {
    id: 'gly-ph7',
    aminoAcidCode: 'Gly',
    targetPh: 7.0,
    prompt: 'A pH 7.0, ¿en qué forma predomina la glicina en disolución acuosa?',
    options: [
      { id: 'zwitterion', label: 'Como zwitterión H₃N⁺–CH₂–COO⁻ con carga neta ≈ 0', correct: true },
      { id: 'neutral', label: 'Sin cargas formales: H₂N–CH₂–COOH', correct: false },
      { id: 'cation', label: 'Como catión H₃N⁺–CH₂–COOH (+1)', correct: false },
      { id: 'anion', label: 'Como anión H₂N–CH₂–COO⁻ (−1)', correct: false },
    ],
    explanation:
      'En agua a pH 7 (entre pK₁ = 2.34 y pK₂ = 9.60), el grupo carboxilo ya cedió su protón y el grupo amino lo conserva: la especie real en disolución es el zwitterión dipolar con carga neta cero.',
  },
  {
    id: 'lys-ph7',
    aminoAcidCode: 'Lys',
    targetPh: 7.0,
    prompt: '¿Por qué la lisina tiene carga neta aproximada +1 a pH fisiológico (7.0)?',
    options: [
      {
        id: 'two-nh3',
        label: 'Porque tiene dos grupos amino protonados (+2 en total) y un α-carboxilato desprotonado (−1)',
        correct: true,
      },
      { id: 'neutral-alpha', label: 'Porque su esqueleto es neutro y solo se ioniza el ε-amino', correct: false },
      { id: 'deprot', label: 'Porque su ε-amino tiene pKa < 7 y cede un protón', correct: false },
      { id: 'minus', label: 'En realidad su carga a pH 7 es −1', correct: false },
    ],
    explanation:
      'A pH 7 están por encima de 7 tanto el pK₂ del α-amino (8.95) como el pK_R del ε-amino (10.53), así que ambos llevan +1; el α-COO⁻ (pK₁ 2.18) aporta −1. Total: +1 + 1 − 1 = +1.',
  },
  {
    id: 'cys-ph9',
    aminoAcidCode: 'Cys',
    targetPh: 8.18,
    prompt: 'Si llevas la cisteína a pH = 8.18 (igual al pKa de su tiol –SH), ¿qué ocurre con su cadena lateral?',
    options: [
      { id: 'half', label: 'Mitad está como tiol neutro (–SH) y mitad como tiolato (–S⁻), aportando −0.5 de carga', correct: true },
      { id: 'all-prot', label: 'Sigue 100 % protonada como –SH', correct: false },
      { id: 'plus', label: 'Se protona para dar –SH₂⁺ (+1)', correct: false },
      { id: 'disulfide', label: 'Se transforma automáticamente en metionina', correct: false },
    ],
    explanation:
      'Por la ecuación de Henderson-Hasselbalch, cuando pH = pKa la razón [A⁻]/[HA] vale 1: el 50 % de las cadenas laterales están como –S⁻ y la capacidad amortiguadora de ese grupo es máxima.',
  },
]

interface TitrationChartProps {
  aminoAcid: AminoAcid
  pH: number
  onSelectPh: (pH: number) => void
}

function TitrationChart({ aminoAcid, pH, onSelectPh }: TitrationChartProps) {
  const curve = useMemo(() => titrationCurve(aminoAcid, 0.2), [aminoAcid])
  const maxEq = aminoAcid.ionizableGroups.length
  const width = 460
  const height = 240
  const padLeft = 44
  const padRight = 20
  const padTop = 18
  const padBottom = 36
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const xForEq = (eq: number) => padLeft + (eq / maxEq) * plotW
  const yForPh = (value: number) => padTop + ((14 - value) / 14) * plotH

  const pathD = curve
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${xForEq(point.equivalents).toFixed(1)},${yForPh(point.pH).toFixed(1)}`)
    .join(' ')

  const currentEq = aminoAcid.ionizableGroups.reduce((sum, g) => sum + (1 - 1 / (1 + 10 ** (pH - g.pKa))), 0)
  const currentPoint = { eq: currentEq, x: xForEq(currentEq), y: yForPh(pH) }

  const piEq = aminoAcid.ionizableGroups.reduce(
    (sum, g) => sum + (1 - 1 / (1 + 10 ** (aminoAcid.pI - g.pKa))),
    0,
  )
  const piPoint = { x: xForEq(piEq), y: yForPh(aminoAcid.pI) }

  const pkaMarkers = aminoAcid.ionizableGroups.map((group) => {
    const eq = aminoAcid.ionizableGroups.reduce(
      (sum, g) => sum + (1 - 1 / (1 + 10 ** (group.pKa - g.pKa))),
      0,
    )
    const tag =
      group.kind === 'alpha-carboxyl' ? 'pK₁' : group.kind === 'alpha-amino' ? 'pK₂' : 'pK_R'
    return { tag, pKa: group.pKa, x: xForEq(eq), y: yForPh(group.pKa) }
  })

  return (
    <svg
      className="titration-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Curva de titulación de ${aminoAcid.name} con pKa y pI marcados`}
    >
      {[0, 2, 4, 6, 8, 10, 12, 14].map((tick) => (
        <g key={tick}>
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={yForPh(tick)}
            y2={yForPh(tick)}
            stroke="#ede4ff"
            strokeWidth="1"
          />
          <text x={padLeft - 6} y={yForPh(tick) + 4} textAnchor="end" fontSize="10" fill="#6b5f8a">
            {tick}
          </text>
        </g>
      ))}
      {Array.from({ length: maxEq + 1 }, (_, eq) => (
        <g key={eq}>
          <line
            x1={xForEq(eq)}
            x2={xForEq(eq)}
            y1={padTop}
            y2={height - padBottom}
            stroke="#ede4ff"
            strokeWidth="1"
          />
          <text x={xForEq(eq)} y={height - padBottom + 14} textAnchor="middle" fontSize="10" fill="#6b5f8a">
            {eq}
          </text>
        </g>
      ))}

      <text x={14} y={padTop + plotH / 2} textAnchor="middle" fontSize="11" fontWeight="700" fill="#2b2147" transform={`rotate(-90 14 ${padTop + plotH / 2})`}>
        pH
      </text>
      <text x={padLeft + plotW / 2} y={height - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="#2b2147">
        Equivalentes de OH⁻ añadidos
      </text>

      {/* Línea horizontal del pH actual */}
      <line
        x1={padLeft}
        x2={width - padRight}
        y1={currentPoint.y}
        y2={currentPoint.y}
        stroke="#7c3aed"
        strokeDasharray="4 3"
        strokeWidth="1.5"
      />

      {/* Curva principal */}
      <path d={pathD} fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />

      {/* Puntos pKa */}
      {pkaMarkers.map((marker) => (
        <g
          key={marker.tag}
          className="titration-chart__marker"
          onClick={() => onSelectPh(marker.pKa)}
          style={{ cursor: 'pointer' }}
        >
          <circle cx={marker.x} cy={marker.y} r="5" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
          <text x={marker.x + 7} y={marker.y - 6} fontSize="10" fontWeight="800" fill="#b45309">
            {marker.tag} = {marker.pKa.toFixed(2)}
          </text>
        </g>
      ))}

      {/* Punto isoeléctrico pI */}
      <g
        className="titration-chart__marker"
        onClick={() => onSelectPh(aminoAcid.pI)}
        style={{ cursor: 'pointer' }}
      >
        <circle cx={piPoint.x} cy={piPoint.y} r="5.5" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
        <text x={piPoint.x + 7} y={piPoint.y + 12} fontSize="10" fontWeight="800" fill="#047857">
          pI = {aminoAcid.pI.toFixed(2)}
        </text>
      </g>

      {/* Posición actual del deslizador */}
      <circle cx={currentPoint.x} cy={currentPoint.y} r="7" fill="#ec4899" stroke="#fff" strokeWidth="2" />
    </svg>
  )
}

export interface PhSimulatorProps {
  initialAminoAcid?: AminoAcid
}

export function PhSimulator({ initialAminoAcid }: PhSimulatorProps) {
  const [aminoAcid, setAminoAcid] = useState<AminoAcid>(
    () => initialAminoAcid ?? AMINO_ACIDS.find((aa) => aa.code3 === 'His') ?? AMINO_ACIDS[0],
  )
  const [pH, setPh] = useState<number>(7.0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  const charge = netCharge(aminoAcid, pH)
  const groups = useMemo(() => describeProtonation(aminoAcid, pH), [aminoAcid, pH])
  const currentSmiles = useMemo(() => protonatedSmiles(aminoAcid, pH), [aminoAcid, pH])

  const question = PH_QUESTIONS[questionIndex]
  const chosenOption = question.options.find((opt) => opt.id === selectedOption)

  const handleAnswer = (optionId: string) => {
    if (selectedOption !== null) return
    setSelectedOption(optionId)
    const option = question.options.find((opt) => opt.id === optionId)
    if (!option) return
    recordAttempt({
      aminoAcid: question.aminoAcidCode,
      skill: 'chemistry',
      correct: option.correct,
      responseMs: 1200,
    })
  }

  const jumpToQuestionContext = (q: PhQuestion) => {
    const target = AMINO_ACIDS.find((aa) => aa.code3 === q.aminoAcidCode)
    if (target) setAminoAcid(target)
    setPh(q.targetPh)
  }

  const selectQuestion = (index: number) => {
    setQuestionIndex(index)
    setSelectedOption(null)
  }

  return (
    <div className="chem-tool">
      <header className="classification__intro">
        <h2>Simulador de pH y punto isoeléctrico (pI)</h2>
        <p>
          Mueve el deslizador de pH entre 0 y 14 para ver cómo cada grupo ionizable gana o cede protones según la
          ecuación de Henderson-Hasselbalch. Aquí sí aparecen las formas ionizadas y el zwitterión.
        </p>
      </header>

      <section className="panel ph-controls" aria-label="Controles de pH y aminoácido">
        <div className="ph-controls__row">
          <label className="compare__select">
            <span className="filter-bar__label">Aminoácido</span>
            <select
              aria-label="Aminoácido del simulador de pH"
              value={aminoAcid.code3}
              onChange={(event) => {
                const next = AMINO_ACIDS.find((aa) => aa.code3 === event.target.value)
                if (next) setAminoAcid(next)
              }}
            >
              {AMINO_ACIDS.map((aa) => (
                <option key={aa.code3} value={aa.code3}>
                  {aa.name} ({aa.code3} · {aa.code1}) — {GROUPS[aa.group].label}
                </option>
              ))}
            </select>
          </label>

          <div className="ph-slider-box">
            <div className="ph-slider-box__header">
              <label htmlFor="ph-slider" className="filter-bar__label">
                pH de la disolución: <strong className="ph-badge">pH {pH.toFixed(2)}</strong>
              </label>
              <span className="ph-charge-readout">
                Carga neta promedio: <strong>{formatSigned(charge, 2)}</strong>
              </span>
            </div>
            <input
              id="ph-slider"
              type="range"
              min="0"
              max="14"
              step="0.05"
              value={pH}
              onChange={(event) => setPh(Number(event.target.value))}
            />
            <div className="ph-quick-buttons" role="group" aria-label="Valores rápidos de pH">
              <button type="button" className="chip" onClick={() => setPh(1)}>
                pH 1 (ácido)
              </button>
              <button type="button" className="chip" onClick={() => setPh(aminoAcid.pKa.carboxyl)}>
                pK₁ = {aminoAcid.pKa.carboxyl.toFixed(2)}
              </button>
              {aminoAcid.pKa.sideChain !== undefined && (
                <button type="button" className="chip" onClick={() => setPh(aminoAcid.pKa.sideChain!)}>
                  pK_R = {aminoAcid.pKa.sideChain.toFixed(2)}
                </button>
              )}
              <button type="button" className="chip" onClick={() => setPh(aminoAcid.pI)}>
                pI = {aminoAcid.pI.toFixed(2)}
              </button>
              <button type="button" className="chip" onClick={() => setPh(7)}>
                pH 7 (fisiológico)
              </button>
              <button type="button" className="chip" onClick={() => setPh(aminoAcid.pKa.amino)}>
                pK₂ = {aminoAcid.pKa.amino.toFixed(2)}
              </button>
              <button type="button" className="chip" onClick={() => setPh(13)}>
                pH 13 (básico)
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="aa-detail__structures">
        <section className="panel" aria-label="Estructura 2D al pH seleccionado">
          <h3>Especie predominante a pH {pH.toFixed(1)}</h3>
          <Structure2D
            smiles={currentSmiles}
            ariaLabel={`Estructura 2D de ${aminoAcid.name} a pH ${pH.toFixed(1)}`}
          />
          <p className="panel__caption">
            SMILES predominante: <code>{currentSmiles}</code>
          </p>
          <ul className="protonation-list">
            {groups.map((item) => (
              <li key={item.group.kind} className="protonation-item">
                <div className="protonation-item__header">
                  <strong>{item.label}</strong>
                  <span>pKa = {item.group.pKa.toFixed(2)}</span>
                </div>
                <div className="protonation-item__details">
                  <span>
                    Predomina: <strong>{item.predominantlyProtonated ? item.protonatedForm : item.deprotonatedForm}</strong>{' '}
                    ({Math.round(item.protonatedFraction * 100)} % protonado)
                  </span>
                  <span>Aporte de carga: {formatSigned(item.charge, 2)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel" aria-label="Curva de titulación">
          <h3>Curva de titulación</h3>
          <TitrationChart aminoAcid={aminoAcid} pH={pH} onSelectPh={setPh} />
          <p className="panel__caption">
            Toca cualquier punto pKa (naranja) o el pI (verde) para llevar el deslizador a ese pH.
          </p>
        </section>
      </div>

      <section className="panel" aria-label="Nube de carga en 3D">
        <h3>Nube de carga en 3D a pH {pH.toFixed(1)}</h3>
        <MolViewer
          molecule={aminoAcidMolecule(aminoAcid)}
          pH={pH}
          colorMode="charge"
          surface="charge-cloud"
        />
      </section>

      <section className="panel ph-quiz" aria-label="Preguntas integradas de pH y pI">
        <header className="ph-quiz__header">
          <h3>Preguntas rápidas de pH y pI</h3>
          <div className="ph-quiz__steps">
            {PH_QUESTIONS.map((q, idx) => (
              <button
                key={q.id}
                type="button"
                className="chip"
                aria-pressed={idx === questionIndex}
                onClick={() => selectQuestion(idx)}
              >
                Pregunta {idx + 1} ({q.aminoAcidCode})
              </button>
            ))}
          </div>
        </header>

        <p className="ph-quiz__prompt">{question.prompt}</p>
        <button
          type="button"
          className="link-button"
          onClick={() => jumpToQuestionContext(question)}
        >
          Ver {question.aminoAcidCode} a pH {question.targetPh.toFixed(2)} en el simulador ↑
        </button>

        <div className="quiz-options">
          {question.options.map((option) => {
            const isChosen = selectedOption === option.id
            const stateClass =
              selectedOption === null
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
                disabled={selectedOption !== null}
                onClick={() => handleAnswer(option.id)}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        {chosenOption && (
          <div className={`quiz-feedback ${chosenOption.correct ? 'quiz-feedback--ok' : 'quiz-feedback--err'}`} role="status">
            <strong>{chosenOption.correct ? '¡Correcto!' : 'Revisa el equilibrio ácido-base:'}</strong>{' '}
            {question.explanation}
          </div>
        )}
      </section>
    </div>
  )
}
