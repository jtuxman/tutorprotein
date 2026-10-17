import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AtomSpec, GLViewer } from '3dmol'
import { PHYSIOLOGICAL_PH, netCharge } from '../../chem/charge'
import { findResidueContacts, isSideChainOrGlyCa, residueKey } from '../../chem/pdb'
import { ccdCode, findAminoAcid } from '../../data/aminoacids'
import {
  CLOUD_SCALE,
  atomCharges,
  computePotentialGrid,
  gridSpecFor,
  type CloudRequest,
  type CloudResponse,
  type GridSpec,
} from './chargeCloud'
import {
  apolarMask,
  atomColors,
  backboneMask,
  chargeColor,
  elementColor,
  kyteDoolittleColor,
  polarityClass,
  sideChainColor,
  type SceneAtom,
} from './coloring'
import { Legend } from './Legend'
import { load3Dmol, type Lib3Dmol } from './load3Dmol'
import { MEASURE_KINDS, measure, type MeasureKind, type Measurement } from './measure'
import { faceOnQuaternion } from './orientation'
import {
  HYDROPHILIC_COLOR,
  HYDROPHOBIC_COLOR,
  MEASURE_COLOR,
  NEUTRAL_COLOR,
  POLARITY_COLORS,
  VIEWER_BACKGROUND,
  divergingColor,
} from './palette'
import { fetchAtomNames, fetchStructure } from './structures'
import { Toolbar } from './Toolbar'
import {
  DEFAULT_STATE,
  resolveState,
  type ColorMode,
  type MolViewerProps,
  type MolViewerState,
  type Representation,
} from './types'
import './MolViewer.css'

type ColorFunc = (atom: AtomSpec) => string

interface Cloud {
  key: string
  spec: GridSpec
  data: Float32Array
}

interface Scene {
  /** Clave única de la molécula cargada; evita pintar una molécula con los datos de otra. */
  key: string
  atoms: SceneAtom[]
}

const CHAIN_PALETTE = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

function representationStyle(representation: Representation, colorfunc: ColorFunc) {
  switch (representation) {
    case 'cartoon':
      return { cartoon: { colorfunc } }
    case 'sticks':
      return { stick: { radius: 0.2, colorfunc } }
    case 'spheres':
      return { sphere: { colorfunc } }
    case 'lines':
      return { line: { linewidth: 2, colorfunc } }
    default:
      return { stick: { radius: 0.13, colorfunc }, sphere: { scale: 0.26, colorfunc } }
  }
}

function proteinColorFunc(mode: ColorMode, totalResidues: number, chains: string[], pH: number): ColorFunc {
  return (atom: AtomSpec) => {
    const elem = atom.elem ?? 'C'
    if (mode === 'element') return elementColor(elem)
    if (mode === 'ss') {
      if (atom.ss === 'h') return '#ec4899'
      if (atom.ss === 's') return '#f59e0b'
      return '#a78bfa'
    }
    if (mode === 'chain') {
      const idx = Math.max(0, chains.indexOf(atom.chain ?? 'A'))
      return CHAIN_PALETTE[idx % CHAIN_PALETTE.length]
    }
    if (mode === 'rainbow') {
      const resi = atom.resi ?? 1
      const frac = Math.max(0, Math.min(1, (resi - 1) / Math.max(1, totalResidues - 1)))
      return divergingColor(frac * 2 - 1, '#3b82f6', '#10b981', '#ef4444')
    }
    if (mode === 'bfactor') {
      const b = atom.b ?? 20
      const norm = Math.max(-1, Math.min(1, (b - 25) / 25))
      return divergingColor(norm, '#3b82f6', '#f8fafc', '#ef4444')
    }

    const aa = atom.resn ? findAminoAcid(atom.resn) : undefined
    if (!aa) return elementColor(elem)

    if (mode === 'group') return sideChainColor('group', aa)
    if (mode === 'hydrophobic') return aa.hydropathy > 0 ? HYDROPHOBIC_COLOR : HYDROPHILIC_COLOR
    if (mode === 'kyte-doolittle') return kyteDoolittleColor(aa.hydropathy)
    if (mode === 'polarity') return POLARITY_COLORS[polarityClass(aa.group)]
    if (mode === 'charge') return chargeColor(netCharge(aa, pH))
    return NEUTRAL_COLOR
  }
}

/** Encuadra la molécula completa, vista de frente. */
function frame(viewer: GLViewer, atoms: { x: number; y: number; z: number }[]) {
  viewer.zoomTo()
  if (atoms.length > 0 && atoms.length <= 60) {
    const view = viewer.getView()
    viewer.setView([...view.slice(0, 4), ...faceOnQuaternion(atoms)])
    viewer.zoomTo()
  }
}

/** Libera el contexto WebGL: los navegadores solo permiten unos pocos a la vez. */
function releaseViewer(viewer: GLViewer, container: HTMLElement | null) {
  try {
    viewer.clear()
    const canvas = container?.querySelector('canvas')
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    // El visor ya no existe; no hay nada más que liberar.
  }
  container?.replaceChildren()
}

export function MolViewer(props: MolViewerProps) {
  const {
    molecule,
    pH = PHYSIOLOGICAL_PH,
    hideSideChain = false,
    proteinOptions,
    spoilerFree = false,
    toolbar = true,
    toolbarPosition = 'top',
    onStateChange,
  } = props
  const { representation, colorMode, surface, surfaceOpacity, showHydrogens, labels } = props
  const isProtein = molecule.kind === 'pdb'
  const aminoAcid = molecule.kind === 'sdf' ? molecule.aminoAcid : undefined
  const hasAminoAcid = Boolean(aminoAcid)

  const [internal, setInternal] = useState<MolViewerState>(() =>
    isProtein ? { ...DEFAULT_STATE, representation: 'cartoon', colorMode: 'ss', labels: 'none' } : DEFAULT_STATE,
  )
  const controlled = useMemo(
    () => ({ representation, colorMode, surface, surfaceOpacity, showHydrogens, labels }),
    [representation, colorMode, surface, surfaceOpacity, showHydrogens, labels],
  )
  const state = useMemo(
    () => resolveState(internal, controlled, { spoilerFree, hasAminoAcid, isProtein }),
    [internal, controlled, spoilerFree, hasAminoAcid, isProtein],
  )

  const canvasRef = useRef<HTMLDivElement>(null)
  const libRef = useRef<Lib3Dmol | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const cloudRef = useRef<Cloud | null>(null)
  const [viewer, setViewer] = useState<GLViewer | null>(null)
  const [scene, setScene] = useState<Scene | null>(null)
  const [viewerFailed, setViewerFailed] = useState(false)
  const [structureFailed, setStructureFailed] = useState(false)

  const moleculeKey = molecule.kind === 'sdf' ? molecule.url : `pdb:${molecule.id}:${molecule.data.length}`
  const [trackedKey, setTrackedKey] = useState(moleculeKey)
  if (trackedKey !== moleculeKey) {
    setTrackedKey(moleculeKey)
    setStructureFailed(false)
  }
  const status: 'loading' | 'ready' | 'error' =
    viewerFailed || structureFailed ? 'error' : viewer !== null && scene?.key === moleculeKey ? 'ready' : 'loading'
  const ready = status === 'ready'

  // Medidas: son del visor, no forman parte del estado compartido.
  const [measureKind, setMeasureKind] = useState<MeasureKind | null>(null)
  const [picks, setPicks] = useState<number[]>([])
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const pickRef = useRef<(atom: AtomSpec) => void>(() => {})

  useEffect(() => {
    pickRef.current = (atom) => {
      const index = atom.index ?? -1
      if (measureKind && scene && index >= 0 && !picks.includes(index)) {
        const next = [...picks, index]
        if (next.length < MEASURE_KINDS[measureKind].atoms) {
          setPicks(next)
          return
        }
        setMeasurements((list) => [...list, measure(measureKind, next, next.map((i) => scene.atoms[i]))])
        setPicks([])
        return
      }
      if (isProtein && proteinOptions?.onResidueClick && atom.chain && atom.resi !== undefined) {
        proteinOptions.onResidueClick(residueKey(atom.chain, atom.resi))
      }
    }
  }, [measureKind, scene, picks, isProtein, proteinOptions])

  const changeMeasureKind = (kind: MeasureKind | null) => {
    setMeasureKind(kind)
    setPicks([])
  }
  const clearMeasurements = () => {
    setMeasurements([])
    setPicks([])
  }

  const update = useCallback(
    (patch: Partial<MolViewerState>) => {
      const next = {
        ...resolveState(internal, controlled, { spoilerFree: false, hasAminoAcid: true, isProtein }),
        ...patch,
      }
      setInternal(next)
      onStateChange?.(next)
    },
    [internal, controlled, onStateChange, isProtein],
  )

  // Crea el visor al montar y lo libera al desmontar.
  useEffect(() => {
    const container = canvasRef.current
    let cancelled = false
    let created: GLViewer | null = null
    load3Dmol()
      .then((lib) => {
        if (cancelled || !container) return
        libRef.current = lib
        created = lib.createViewer(container, { backgroundColor: VIEWER_BACKGROUND }) ?? null
        if (!created) throw new Error('No se pudo crear el visor')
        setViewer(created)
      })
      .catch(() => {
        if (!cancelled) setViewerFailed(true)
      })
    return () => {
      cancelled = true
      if (created) releaseViewer(created, container)
      setViewer(null)
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  /** Rejilla de potencial de la molécula actual; se calcula en un Web Worker. */
  const requestCloud = useCallback((current: Scene, charges: number[], key: string): Promise<Cloud> => {
    const cached = cloudRef.current
    if (cached?.key === key) return Promise.resolve(cached)
    const spec = gridSpecFor(current.atoms)
    const finish = (data: Float32Array) => (cloudRef.current = { key, spec, data })
    if (typeof Worker === 'undefined') {
      return Promise.resolve(finish(computePotentialGrid(current.atoms, charges, spec)))
    }
    workerRef.current ??= new Worker(new URL('./chargeCloud.worker.ts', import.meta.url), { type: 'module' })
    const worker = workerRef.current
    const id = Math.random()
    return new Promise((resolve, reject) => {
      const onMessage = (event: MessageEvent<CloudResponse>) => {
        if (event.data.id !== id) return
        worker.removeEventListener('message', onMessage)
        resolve(finish(event.data.data))
      }
      worker.addEventListener('message', onMessage)
      worker.addEventListener('error', reject, { once: true })
      const request: CloudRequest = { id, atoms: current.atoms.map(({ x, y, z }) => ({ x, y, z })), charges, spec }
      worker.postMessage(request)
    })
  }, [])

  // Mantiene el lienzo ajustado al tamaño de su contenedor.
  useEffect(() => {
    const container = canvasRef.current
    if (!viewer || !container || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => viewer.resize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [viewer])

  // Carga la molécula (SDF o PDB).
  const ccd = aminoAcid ? ccdCode(aminoAcid) : null
  useEffect(() => {
    if (!viewer) return
    let cancelled = false

    if (molecule.kind === 'pdb') {
      const pdbData = molecule.data
      Promise.resolve()
        .then(() => {
          if (cancelled) return
          viewer.removeAllModels()
          viewer.removeAllSurfaces()
          viewer.removeAllLabels()
          viewer.removeAllShapes()
          const atoms = viewer.addModel(pdbData, 'pdb', { keepH: true }).selectedAtoms({})
          const sceneAtoms = atoms.map((atom) => ({
            name: atom.atom ?? '',
            element: atom.elem ?? '',
            bonds: atom.bonds ?? [],
            x: atom.x ?? 0,
            y: atom.y ?? 0,
            z: atom.z ?? 0,
          }))
          setScene({ key: moleculeKey, atoms: sceneAtoms })
          setPicks([])
          setMeasurements([])
          viewer.setClickable({}, true, (atom: AtomSpec) => pickRef.current(atom))
          frame(viewer, sceneAtoms)
        })
        .catch(() => {
          if (!cancelled) setStructureFailed(true)
        })
      return () => {
        cancelled = true
      }
    }

    Promise.all([fetchStructure(molecule.url), ccd ? fetchAtomNames() : null])
      .then(([sdf, names]) => {
        if (cancelled) return
        viewer.removeAllModels()
        viewer.removeAllSurfaces()
        viewer.removeAllLabels()
        viewer.removeAllShapes()
        const atoms = viewer.addModel(sdf, 'sdf').selectedAtoms({})
        const atomNames = (ccd && names?.[ccd]) || []
        atoms.forEach((atom, index) => {
          if (atomNames[index]) atom.atom = atomNames[index]
        })
        const sceneAtoms = atoms.map((atom, index) => ({
          name: atomNames[index] ?? '',
          element: atom.elem ?? '',
          bonds: atom.bonds ?? [],
          x: atom.x ?? 0,
          y: atom.y ?? 0,
          z: atom.z ?? 0,
        }))
        setScene({ key: moleculeKey, atoms: sceneAtoms })
        setPicks([])
        setMeasurements([])
        viewer.setClickable({}, true, (atom: AtomSpec) => pickRef.current(atom))
        frame(viewer, sceneAtoms)
      })
      .catch(() => {
        if (!cancelled) setStructureFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [viewer, molecule, moleculeKey, ccd])

  // Representación, colores, hidrógenos y resaltado de residuo en proteína.
  useEffect(() => {
    if (!ready || !viewer || !scene) return

    if (molecule.kind === 'pdb') {
      const parsed = molecule.parsed
      const totalRes = parsed?.residues.length ?? 100
      const chains = parsed?.chains ?? ['A']
      const selKey = proteinOptions?.selectedResidueKey ?? null
      const quizOnly = Boolean(proteinOptions?.quizSideChainOnly && selKey)

      if (quizOnly && selKey) {
        const [selChain, selResiText] = selKey.split(':')
        const selResi = Number(selResiText)
        // Atenuar el resto del entorno en gris translúcido
        viewer.setStyle({}, { line: { color: '#475569', linewidth: 1 } })
        // Mostrar en bolas y varillas por elemento la cadena lateral del residuo pregunta (o Cα en Gly)
        viewer.setStyle(
          { chain: selChain, resi: selResi },
          {
            stick: {
              radius: 0.22,
              colorfunc: (atom: AtomSpec) =>
                isSideChainOrGlyCa(atom.atom ?? '', atom.resn ?? '')
                  ? elementColor(atom.elem ?? 'C')
                  : '#64748b',
            },
            sphere: {
              scale: 0.3,
              colorfunc: (atom: AtomSpec) =>
                isSideChainOrGlyCa(atom.atom ?? '', atom.resn ?? '')
                  ? elementColor(atom.elem ?? 'C')
                  : '#64748b',
            },
          },
        )
      } else {
        const colorfunc = proteinColorFunc(state.colorMode, totalRes, chains, pH)
        const baseRepStyle = representationStyle(state.representation, colorfunc)
        viewer.setStyle({}, baseRepStyle)

        // Superposición de expuestos/enterrados o sitio de unión a ligando
        if (parsed && proteinOptions?.showBurial) {
          for (const res of parsed.residues) {
            viewer.setStyle(
              { chain: res.chain, resi: res.resSeq },
              representationStyle(state.representation, () =>
                res.burial === 'buried' ? '#f59e0b' : '#06b6d4',
              ),
            )
          }
        }
        if (parsed && proteinOptions?.showLigandSite) {
          for (const res of parsed.residues) {
            if (res.nearLigand) {
              viewer.setStyle(
                { chain: res.chain, resi: res.resSeq },
                {
                  cartoon: { color: '#10b981' },
                  stick: { radius: 0.2, color: '#10b981' },
                },
              )
            }
          }
        }

        // Mostrar todas las cadenas laterales en bolas y varillas
        if (proteinOptions?.showAllSideChains && !proteinOptions?.onlySelectedAndContacts) {
          viewer.setStyle(
            {},
            {
              ...(state.representation === 'cartoon' ? { cartoon: { colorfunc } } : {}),
              stick: { radius: 0.14, colorfunc },
              sphere: { scale: 0.24, colorfunc },
            },
          )
        }

        // Mostrar únicamente las cadenas laterales del seleccionado y de los residuos con los que hace contacto
        if (parsed && selKey && proteinOptions?.onlySelectedAndContacts) {
          const contacts = findResidueContacts(parsed, selKey)
          for (const c of contacts) {
            viewer.setStyle(
              { chain: c.partner.chain, resi: c.partner.resSeq },
              {
                ...(state.representation === 'cartoon' ? { cartoon: { color: '#38bdf8' } } : {}),
                stick: { radius: 0.18, colorfunc: (atom: AtomSpec) => elementColor(atom.elem ?? 'C') },
                sphere: { scale: 0.25, colorfunc: (atom: AtomSpec) => elementColor(atom.elem ?? 'C') },
              },
            )
          }
        }

        // El residuo seleccionado permanece siempre resaltado (enlaces más gruesos y carbonos en gris neutro)
        if (selKey) {
          const [selChain, selResiText] = selKey.split(':')
          const selResi = Number(selResiText)
          viewer.setStyle(
            { chain: selChain, resi: selResi },
            {
              cartoon: { color: '#94a3b8' },
              stick: {
                radius: 0.28,
                colorfunc: (atom: AtomSpec) => elementColor(atom.elem ?? 'C'),
              },
              sphere: {
                scale: 0.34,
                colorfunc: (atom: AtomSpec) => elementColor(atom.elem ?? 'C'),
              },
            },
          )
        }

        // Si la representación está en Cintas (cartoon) y se activa «Mostrar hidrógenos»,
        // dibujar también los hidrógenos en varillas/esferas blancas para que sean visibles.
        if (state.showHydrogens && state.representation === 'cartoon') {
          viewer.setStyle(
            { elem: 'H' },
            {
              stick: { radius: 0.14, color: '#ffffff' },
              sphere: { scale: 0.24, color: '#ffffff' },
            },
          )
        }
      }

      if (!state.showHydrogens) viewer.setStyle({ elem: 'H' }, {})
      viewer.render()
      return
    }

    const colors = atomColors(state.colorMode, scene.atoms, aminoAcid, pH)
    const colorfunc: ColorFunc = (atom) => colors[atom.index ?? 0]
    viewer.setStyle({}, representationStyle(state.representation, colorfunc))
    if (hideSideChain) {
      const backbone = backboneMask(scene.atoms)
      scene.atoms.forEach((_, idx) => {
        if (!backbone[idx]) viewer.setStyle({ index: idx }, {})
      })
    }
    if (!state.showHydrogens) viewer.setStyle({ elem: 'H' }, {})
    viewer.render()
  }, [
    ready,
    viewer,
    scene,
    molecule,
    aminoAcid,
    pH,
    hideSideChain,
    proteinOptions,
    state.representation,
    state.colorMode,
    state.showHydrogens,
  ])

  // En proteínas: hace zoom únicamente cuando cambia el residuo seleccionado; si es `null`, encuadra la proteína entera.
  const selectedResidueKey = proteinOptions?.selectedResidueKey ?? null
  useEffect(() => {
    if (!ready || !viewer || !scene || molecule.kind !== 'pdb') return
    if (selectedResidueKey) {
      const [selChain, selResiText] = selectedResidueKey.split(':')
      viewer.zoomTo({ chain: selChain, resi: Number(selResiText) })
    } else {
      viewer.zoomTo()
    }
    viewer.render()
  }, [ready, viewer, scene, molecule.kind, selectedResidueKey])

  // Etiquetas de átomo, interacciones de proteína (disulfuros, puentes salinos) y medidas.
  useEffect(() => {
    if (!ready || !viewer || !scene) return
    viewer.removeAllLabels()
    viewer.removeAllShapes()
    const label = (text: string, position: { x: number; y: number; z: number }, backgroundColor: string) =>
      viewer.addLabel(text, {
        position: { x: position.x, y: position.y, z: position.z },
        fontSize: 12,
        fontColor: '#ffffff',
        backgroundColor,
        backgroundOpacity: 0.6,
        inFront: true,
        alignment: 'center',
      })

    if (molecule.kind === 'pdb' && molecule.parsed) {
      const parsed = molecule.parsed
      const quizOnly = Boolean(proteinOptions?.quizSideChainOnly && proteinOptions?.selectedResidueKey)

      if (!quizOnly && proteinOptions?.showDisulfides) {
        for (const bond of parsed.disulfides) {
          viewer.addCylinder({
            start: { x: bond.fromAtom.x, y: bond.fromAtom.y, z: bond.fromAtom.z },
            end: { x: bond.toAtom.x, y: bond.toAtom.y, z: bond.toAtom.z },
            radius: 0.18,
            color: '#eab308',
            fromCap: 1,
            toCap: 1,
          })
          label(
            `S–S ${bond.fromKey}↔${bond.toKey} (${bond.distance} Å)`,
            {
              x: (bond.fromAtom.x + bond.toAtom.x) / 2,
              y: (bond.fromAtom.y + bond.toAtom.y) / 2,
              z: (bond.fromAtom.z + bond.toAtom.z) / 2,
            },
            '#ca8a04',
          )
        }
      }

      if (!quizOnly && proteinOptions?.showSaltBridges) {
        for (const bridge of parsed.saltBridges) {
          viewer.addCylinder({
            start: { x: bridge.positiveAtom.x, y: bridge.positiveAtom.y, z: bridge.positiveAtom.z },
            end: { x: bridge.negativeAtom.x, y: bridge.negativeAtom.y, z: bridge.negativeAtom.z },
            radius: 0.08,
            dashed: true,
            dashLength: 0.25,
            gapLength: 0.15,
            color: '#ec4899',
            fromCap: 1,
            toCap: 1,
          })
          label(
            `Salino ${bridge.positiveKey}↔${bridge.negativeKey} (${bridge.distance} Å)`,
            {
              x: (bridge.positiveAtom.x + bridge.negativeAtom.x) / 2,
              y: (bridge.positiveAtom.y + bridge.negativeAtom.y) / 2,
              z: (bridge.positiveAtom.z + bridge.negativeAtom.z) / 2,
            },
            '#be185d',
          )
        }
      }

      if (!quizOnly && !spoilerFree) {
        const selKey = proteinOptions?.selectedResidueKey ?? null
        const contacts = selKey ? findResidueContacts(parsed, selKey) : []
        const contactKeySet = new Set(contacts.map((c) => c.partnerKey))

        // Nombres de todos los residuos (si está prendido el interruptor)
        if (proteinOptions?.showAllResidueNames) {
          for (const r of parsed.residues) {
            if (r.key === selKey) continue
            const ca = r.atoms.find((a) => a.name === 'CA') ?? r.atoms[0]
            if (ca) label(`${r.aminoAcid.code3} ${r.resSeq}`, ca, '#334155')
          }
        } else if (selKey && proteinOptions?.showContactNames) {
          // O nombres de los residuos en contacto cuando se pide ver contactos con nombre
          for (const r of parsed.residues) {
            if (!contactKeySet.has(r.key)) continue
            const ca = r.atoms.find((a) => a.name === 'CA') ?? r.atoms[0]
            if (ca) label(`${r.aminoAcid.code3} ${r.resSeq}`, ca, '#0284c7')
          }
        }

        // Distancias de contacto del residuo seleccionado con sus vecinos en contacto
        if (selKey && proteinOptions?.showContactDistances) {
          for (const c of contacts) {
            viewer.addCylinder({
              start: { x: c.fromAtom.x, y: c.fromAtom.y, z: c.fromAtom.z },
              end: { x: c.toAtom.x, y: c.toAtom.y, z: c.toAtom.z },
              radius: 0.07,
              dashed: true,
              dashLength: 0.22,
              gapLength: 0.14,
              color: '#38bdf8',
              fromCap: 1,
              toCap: 1,
            })
            label(
              `${c.partner.aminoAcid.code3}${c.partner.resSeq}: ${c.distance} Å`,
              {
                x: (c.fromAtom.x + c.toAtom.x) / 2,
                y: (c.fromAtom.y + c.toAtom.y) / 2,
                z: (c.fromAtom.z + c.toAtom.z) / 2,
              },
              '#0369a1',
            )
          }
        }

        // El residuo seleccionado SIEMPRE muestra su nombre y un halo gris neutro para distinguirse de los demás
        if (selKey) {
          const res = parsed.residues.find((r) => r.key === selKey)
          const ca = res?.atoms.find((a) => a.name === 'CA') ?? res?.atoms[0]
          if (res && ca) {
            viewer.addSphere({
              center: { x: ca.x, y: ca.y, z: ca.z },
              radius: 0.85,
              color: '#94a3b8',
              opacity: 0.35,
            })
            label(`★ ${res.aminoAcid.code3} ${res.resSeq} (${res.chain})`, ca, '#475569')
          }
          if (res && state.labels === 'atoms') {
            for (const atom of res.atoms) {
              if (atom.element !== 'H' && atom.name && atom.name !== 'CA') {
                label(atom.name, atom, '#000000')
              }
            }
          }
        }
      }
    } else if (state.labels === 'atoms') {
      const backbone = hideSideChain ? backboneMask(scene.atoms) : null
      scene.atoms.forEach((atom, idx) => {
        if (backbone && !backbone[idx]) return
        if (atom.element !== 'H' && atom.name) label(atom.name, atom, '#000000')
      })
    }

    for (const index of picks) {
      const atom = scene.atoms[index]
      if (atom) viewer.addSphere({ center: { x: atom.x, y: atom.y, z: atom.z }, radius: 0.5, color: MEASURE_COLOR, opacity: 0.65 })
    }
    for (const measurement of measurements) {
      const points = measurement.atoms.map((index) => scene.atoms[index]).filter(Boolean)
      for (let i = 1; i < points.length; i++) {
        const [start, end] = [points[i - 1], points[i]]
        viewer.addCylinder({
          start: { x: start.x, y: start.y, z: start.z },
          end: { x: end.x, y: end.y, z: end.z },
          radius: 0.06,
          dashed: true,
          dashLength: 0.2,
          gapLength: 0.15,
          color: MEASURE_COLOR,
          fromCap: 1,
          toCap: 1,
        })
      }
      label(measurement.text, measurement.anchor, MEASURE_COLOR)
    }
    viewer.render()
  }, [ready, viewer, scene, molecule, hideSideChain, spoilerFree, proteinOptions, state.labels, picks, measurements])

  // Superficies: nube de carga (pH 7) o hidrofobicidad.
  useEffect(() => {
    const lib = libRef.current
    if (!ready || !viewer || !scene || !lib) return
    if (state.surface === 'none') return
    if (!isProtein && !aminoAcid) return
    let cancelled = false
    let surface: Promise<unknown> | null = null
    const add = (style: Record<string, unknown>) => {
      if (cancelled) return
      const created = viewer.addSurface(lib.SurfaceType.SES, { opacity: state.surfaceOpacity, ...style })
      surface = created
      created.then(() => viewer.render())
    }

    if (state.surface === 'hydrophobicity') {
      const apolar = apolarMask(scene.atoms)
      add({ colorfunc: (atom: AtomSpec) => (apolar[atom.index ?? 0] ? HYDROPHOBIC_COLOR : HYDROPHILIC_COLOR) })
    } else if (aminoAcid) {
      const charges = atomCharges(
        aminoAcid,
        scene.atoms.map((atom) => atom.name),
        pH,
      )
      requestCloud(scene, charges, `${scene.key}@${pH.toFixed(2)}`)
        .then((cloud) => {
          const voldata = new lib.VolumeData('', 'none')
          const [x, y, z] = cloud.spec.origin
          const [nx, ny, nz] = cloud.spec.size
          voldata.origin = { x, y, z }
          voldata.unit = { x: cloud.spec.step, y: cloud.spec.step, z: cloud.spec.step }
          voldata.size = { x: nx, y: ny, z: nz }
          voldata.data = cloud.data as Float32Array<ArrayBuffer>
          add({ voldata, volscheme: new lib.Gradient.RWB(-CLOUD_SCALE, CLOUD_SCALE) })
        })
        .catch((error) => console.error('No se pudo calcular la nube de carga', error))
    } else if (isProtein) {
      add({
        colorfunc: (atom: AtomSpec) => {
          const aa = atom.resn ? findAminoAcid(atom.resn) : undefined
          return aa ? chargeColor(netCharge(aa, pH)) : '#ffffff'
        },
      })
    }

    return () => {
      cancelled = true
      if (surface) {
        surface.then((id) => {
          viewer.removeSurface(id as number)
          viewer.render()
        })
      }
    }
  }, [ready, viewer, scene, isProtein, aminoAcid, pH, state.surface, state.surfaceOpacity, requestCloud])

  const reset = () => {
    if (!viewer || !scene) return
    frame(viewer, scene.atoms)
    viewer.render()
  }

  const capture = () => {
    if (!viewer) return
    const link = document.createElement('a')
    link.href = viewer.pngURI()
    link.download =
      aminoAcid && !spoilerFree
        ? `aminolab-${aminoAcid.code3.toLowerCase()}.png`
        : isProtein
          ? `aminolab-${molecule.id.toLowerCase()}.png`
          : 'aminolab.png'
    link.click()
  }

  const title =
    aminoAcid && !spoilerFree
      ? `Visor 3D de ${aminoAcid.name}`
      : isProtein && !spoilerFree
        ? `Visor 3D de la proteína ${molecule.id}`
        : 'Visor 3D de la molécula'

  const toolbarElement = toolbar && (
    <Toolbar
      state={state}
      onChange={update}
      spoilerFree={spoilerFree}
      hasAminoAcid={hasAminoAcid}
      isProtein={isProtein}
      disabled={!ready}
      onReset={reset}
      onCapture={capture}
      measureKind={measureKind}
      onMeasureKindChange={changeMeasureKind}
      hasMeasurements={measurements.length > 0 || picks.length > 0}
      onClearMeasurements={clearMeasurements}
    />
  )

  return (
    <div className={`mol-viewer${isProtein ? ' mol-viewer--protein' : ''}`}>
      {toolbarPosition === 'top' && toolbarElement}
      <div className="mol-viewer__stage">
        <div ref={canvasRef} className="mol-viewer__canvas" role="img" aria-label={title} />
        {measureKind && status === 'ready' && (
          <p className="mol-viewer__hint" role="status">
            Toca {MEASURE_KINDS[measureKind].atoms} átomos · {picks.length} de {MEASURE_KINDS[measureKind].atoms}
          </p>
        )}
        {status === 'loading' && (
          <div className="mol-viewer__overlay" role="status">
            <span className="mol-viewer__spinner" aria-hidden="true" />
            Cargando visor 3D…
          </div>
        )}
        {status === 'error' && (
          <div className="mol-viewer__overlay" role="alert">
            No se pudo cargar la estructura 3D. Revisa tu conexión y vuelve a intentarlo.
          </div>
        )}
      </div>
      {!spoilerFree && <Legend state={state} aminoAcid={aminoAcid} pH={pH} />}
      {toolbarPosition === 'bottom' && toolbarElement}
    </div>
  )
}
