// Acceso a los archivos de public/structures/. Las rutas se construyen con
// BASE_URL porque el sitio se publica bajo /tutorprotein/.

import { ccdCode, type AminoAcid } from '../../data/aminoacids'
import type { Molecule } from './types'

const STRUCTURES_URL = `${import.meta.env.BASE_URL}structures/`

const textCache = new Map<string, Promise<string>>()
let atomNamesPromise: Promise<Record<string, string[]>> | undefined

async function request(url: string): Promise<Response> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No se pudo cargar ${url} (HTTP ${response.status})`)
  return response
}

/** Molécula lista para `MolViewer` a partir de un aminoácido de `src/data`. */
export function aminoAcidMolecule(aminoAcid: AminoAcid): Molecule {
  return { kind: 'sdf', url: `${STRUCTURES_URL}${ccdCode(aminoAcid)}.sdf`, aminoAcid }
}

export function fetchStructure(url: string): Promise<string> {
  let promise = textCache.get(url)
  if (!promise) {
    promise = request(url).then((response) => response.text())
    promise.catch(() => textCache.delete(url))
    textCache.set(url, promise)
  }
  return promise
}

/** Nombres de átomo del CCD por código, en el orden de cada SDF. */
export function fetchAtomNames(): Promise<Record<string, string[]>> {
  if (!atomNamesPromise) {
    atomNamesPromise = request(`${STRUCTURES_URL}atom-names.json`).then((response) => response.json())
    atomNamesPromise.catch(() => {
      atomNamesPromise = undefined
    })
  }
  return atomNamesPromise
}
