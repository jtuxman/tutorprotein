// Utilidades de prueba para leer los archivos de public/structures/ desde Node.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Formula } from '../chem/smiles'

const STRUCTURES_DIR = join(process.cwd(), 'public', 'structures')

export function structurePath(ccd: string): string {
  return join(STRUCTURES_DIR, `${ccd}.sdf`)
}

export function structureExists(ccd: string): boolean {
  return existsSync(structurePath(ccd))
}

export function readStructure(ccd: string): string {
  return readFileSync(structurePath(ccd), 'utf8')
}

export function readAtomNames(): Record<string, string[]> {
  return JSON.parse(readFileSync(join(STRUCTURES_DIR, 'atom-names.json'), 'utf8'))
}

export interface SdfAtom {
  element: string
  x: number
  y: number
  z: number
  chargeCode: number
}

export function parseSdfAtoms(sdf: string): SdfAtom[] {
  const lines = sdf.split('\n')
  const atomCount = Number(lines[3].slice(0, 3))
  return lines.slice(4, 4 + atomCount).map((line) => ({
    x: Number(line.slice(0, 10)),
    y: Number(line.slice(10, 20)),
    z: Number(line.slice(20, 30)),
    element: line.slice(31, 34).trim(),
    chargeCode: Number(line.slice(36, 39)),
  }))
}

export function formulaFromSdf(sdf: string): Formula {
  const formula: Formula = {}
  for (const atom of parseSdfAtoms(sdf)) formula[atom.element] = (formula[atom.element] ?? 0) + 1
  return formula
}
