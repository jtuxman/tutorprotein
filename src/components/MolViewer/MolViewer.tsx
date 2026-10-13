import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AtomSpec, GLViewer } from '3dmol'
import { ccdCode } from '../../data/aminoacids'
import {
  CLOUD_SCALE,
  atomCharges,
  computePotentialGrid,
  gridSpecFor,
  type CloudRequest,
  type CloudResponse,
  type GridSpec,
} from './chargeCloud'
import { apolarMask, atomColors, type SceneAtom } from './coloring'
import { Legend } from './Legend'
import { load3Dmol, type Lib3Dmol } from './load3Dmol'
import { faceOnQuaternion } from './orientation'
import { HYDROPHILIC_COLOR, HYDROPHOBIC_COLOR, VIEWER_BACKGROUND } from './palette'
import { fetchAtomNames, fetchStructure } from './structures'
import { Toolbar } from './Toolbar'
import { DEFAULT_STATE, resolveState, type MolViewerProps, type MolViewerState, type Representation } from './types'
import './MolViewer.css'

type ColorFunc = (atom: AtomSpec) => string

interface Cloud {
  url: string
  spec: GridSpec
  data: Float32Array
}

interface Scene {
  /** URL de la molécula cargada; evita pintar una molécula con los datos de otra. */
  url: string
  atoms: SceneAtom[]
}

function representationStyle(representation: Representation, colorfunc: ColorFunc) {
  switch (representation) {
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

/** Encuadra la molécula completa, vista de frente. */
function frame(viewer: GLViewer, atoms: { x: number; y: number; z: number }[]) {
  viewer.zoomTo()
  const view = viewer.getView()
  viewer.setView([...view.slice(0, 4), ...faceOnQuaternion(atoms)])
  viewer.zoomTo()
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
  const { molecule, spoilerFree = false, toolbar = true, onStateChange } = props
  const { representation, colorMode, surface, surfaceOpacity, showHydrogens, labels } = props
  const aminoAcid = molecule.aminoAcid
  const hasAminoAcid = Boolean(aminoAcid)

  const [internal, setInternal] = useState<MolViewerState>(DEFAULT_STATE)
  const controlled = useMemo(
    () => ({ representation, colorMode, surface, surfaceOpacity, showHydrogens, labels }),
    [representation, colorMode, surface, surfaceOpacity, showHydrogens, labels],
  )
  const state = useMemo(
    () => resolveState(internal, controlled, { spoilerFree, hasAminoAcid }),
    [internal, controlled, spoilerFree, hasAminoAcid],
  )

  const canvasRef = useRef<HTMLDivElement>(null)
  const libRef = useRef<Lib3Dmol | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const cloudRef = useRef<Cloud | null>(null)
  const [viewer, setViewer] = useState<GLViewer | null>(null)
  const [scene, setScene] = useState<Scene | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const ready = status === 'ready' && viewer !== null && scene?.url === molecule.url

  const update = useCallback(
    (patch: Partial<MolViewerState>) => {
      // Se parte del estado sin el filtro anti-spoiler para no perder lo elegido antes.
      const next = { ...resolveState(internal, controlled, { spoilerFree: false, hasAminoAcid: true }), ...patch }
      setInternal(next)
      onStateChange?.(next)
    },
    [internal, controlled, onStateChange],
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
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
      if (created) releaseViewer(created, container)
      setViewer(null)
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  /** Rejilla de potencial de la molécula actual; se calcula una vez, en un Web Worker. */
  const requestCloud = useCallback((current: Scene, charges: number[]): Promise<Cloud> => {
    const cached = cloudRef.current
    if (cached?.url === current.url) return Promise.resolve(cached)
    const spec = gridSpecFor(current.atoms)
    const finish = (data: Float32Array) => (cloudRef.current = { url: current.url, spec, data })
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

  // Carga la molécula y asigna a cada átomo su nombre del CCD.
  const url = molecule.url
  const ccd = aminoAcid ? ccdCode(aminoAcid) : null
  useEffect(() => {
    if (!viewer) return
    let cancelled = false
    setStatus('loading')
    Promise.all([fetchStructure(url), ccd ? fetchAtomNames() : null])
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
        setScene({ url, atoms: sceneAtoms })
        frame(viewer, sceneAtoms)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [viewer, url, ccd])

  // Representación, colores e hidrógenos.
  useEffect(() => {
    if (!ready || !viewer || !scene) return
    const colors = atomColors(state.colorMode, scene.atoms, aminoAcid)
    const colorfunc: ColorFunc = (atom) => colors[atom.index ?? 0]
    viewer.setStyle({}, representationStyle(state.representation, colorfunc))
    if (!state.showHydrogens) viewer.setStyle({ elem: 'H' }, {})
    viewer.render()
  }, [ready, viewer, scene, aminoAcid, state.representation, state.colorMode, state.showHydrogens])

  // Etiquetas con el nombre CCD de cada átomo pesado.
  useEffect(() => {
    if (!ready || !viewer || !scene) return
    viewer.removeAllLabels()
    if (state.labels === 'atoms') {
      for (const atom of scene.atoms) {
        if (atom.element === 'H' || !atom.name) continue
        viewer.addLabel(atom.name, {
          position: { x: atom.x, y: atom.y, z: atom.z },
          fontSize: 12,
          fontColor: '#ffffff',
          backgroundColor: '#000000',
          backgroundOpacity: 0.55,
          inFront: true,
          alignment: 'center',
        })
      }
    }
    viewer.render()
  }, [ready, viewer, scene, state.labels])

  // Superficies: nube de carga (pH 7) o hidrofobicidad por átomo.
  useEffect(() => {
    const lib = libRef.current
    if (!ready || !viewer || !scene || !lib || !aminoAcid) return
    if (state.surface === 'none') return
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
    } else {
      const charges = atomCharges(aminoAcid, scene.atoms.map((atom) => atom.name))
      requestCloud(scene, charges)
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
    }

    return () => {
      cancelled = true
      // La superficie se crea de forma asíncrona: se retira cuando termine.
      if (surface) {
        surface.then((id) => {
          viewer.removeSurface(id as number)
          viewer.render()
        })
      }
    }
  }, [ready, viewer, scene, aminoAcid, state.surface, state.surfaceOpacity, requestCloud])

  const reset = () => {
    if (!viewer || !scene) return
    frame(viewer, scene.atoms)
    viewer.render()
  }

  const capture = () => {
    if (!viewer) return
    const link = document.createElement('a')
    link.href = viewer.pngURI()
    // En modo quiz el nombre del archivo tampoco debe delatar la respuesta.
    link.download = aminoAcid && !spoilerFree ? `aminolab-${aminoAcid.code3.toLowerCase()}.png` : 'aminolab.png'
    link.click()
  }

  const title = aminoAcid && !spoilerFree ? `Visor 3D de ${aminoAcid.name}` : 'Visor 3D de la molécula'

  return (
    <div className="mol-viewer">
      {toolbar && (
        <Toolbar
          state={state}
          onChange={update}
          spoilerFree={spoilerFree}
          hasAminoAcid={hasAminoAcid}
          disabled={!ready}
          onReset={reset}
          onCapture={capture}
        />
      )}
      <div className="mol-viewer__stage">
        <div ref={canvasRef} className="mol-viewer__canvas" role="img" aria-label={title} />
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
      {!spoilerFree && <Legend state={state} aminoAcid={aminoAcid} />}
    </div>
  )
}
