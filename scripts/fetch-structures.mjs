// Descarga los SDF "ideal" de los 20 aminoácidos del Chemical Component
// Dictionary (RCSB) y los deja en public/structures/ en forma NEUTRA, junto con
// atom-names.json (nombres de átomo del CCD, en el orden del SDF resultante).
//
// Se ejecuta una sola vez (`node scripts/fetch-structures.mjs`) y sus resultados
// se commitean: la app nunca descarga estas estructuras en tiempo de ejecución.
//
// Los SDF ideales de Lys, Arg e His traen la cadena lateral protonada (+1). Aquí
// se neutralizan quitando un hidrógeno del nitrógeno cargado. Los átomos se
// identifican por nombre (vía el CIF del componente), nunca por índice; si el
// archivo no coincide con lo esperado, el script falla en vez de adivinar.

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'structures')

const CCD_CODES = [
  'ALA', 'ARG', 'ASN', 'ASP', 'CYS', 'GLN', 'GLU', 'GLY', 'HIS', 'ILE',
  'LEU', 'LYS', 'MET', 'PHE', 'PRO', 'SER', 'THR', 'TRP', 'TYR', 'VAL',
]

// Hidrógeno a quitar para neutralizar. `doubleBondTo` documenta (y comprueba)
// el doble enlace que debe tener el nitrógeno cargado en el archivo original.
const NEUTRALIZE = {
  LYS: { nitrogen: 'NZ', hydrogen: 'HZ3' }, // –NH3+ → –NH2
  ARG: { nitrogen: 'NH2', hydrogen: 'HH22', doubleBondTo: 'CZ' }, // =NH2+ → =NH
  HIS: { nitrogen: 'ND1', hydrogen: 'HD1', doubleBondTo: 'CE1' }, // tautómero Nε2–H
}

async function fetchText(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No se pudo descargar ${url}: HTTP ${response.status}`)
  return response.text()
}

/** Lee el bucle `_chem_comp_atom` del CIF: nombre, elemento y coordenadas ideales. */
function parseCifAtoms(cif, code) {
  const lines = cif.split('\n')
  const start = lines.findIndex((line) => line.startsWith('_chem_comp_atom.'))
  if (start < 0) throw new Error(`${code}: el CIF no tiene _chem_comp_atom`)
  const columns = []
  let i = start
  for (; lines[i].startsWith('_chem_comp_atom.'); i++) {
    columns.push(lines[i].trim().replace('_chem_comp_atom.', ''))
  }
  const col = (name) => {
    const index = columns.indexOf(name)
    if (index < 0) throw new Error(`${code}: falta la columna ${name} en el CIF`)
    return index
  }
  const [id, symbol, x, y, z] = [
    col('atom_id'),
    col('type_symbol'),
    col('pdbx_model_Cartn_x_ideal'),
    col('pdbx_model_Cartn_y_ideal'),
    col('pdbx_model_Cartn_z_ideal'),
  ]
  const atoms = []
  for (; i < lines.length && !lines[i].startsWith('#'); i++) {
    const fields = lines[i].trim().split(/\s+/)
    if (fields.length !== columns.length) {
      throw new Error(`${code}: línea de átomo inesperada en el CIF: "${lines[i]}"`)
    }
    atoms.push({
      name: fields[id],
      element: fields[symbol],
      coords: [Number(fields[x]), Number(fields[y]), Number(fields[z])],
    })
  }
  return atoms
}

/** Lee un molfile V2000 conservando las líneas originales. */
function parseSdf(sdf, code) {
  const lines = sdf.split('\n').map((line) => line.replace(/\r$/, ''))
  const counts = lines[3]
  if (!counts?.includes('V2000')) throw new Error(`${code}: el SDF no es V2000`)
  const atomCount = Number(counts.slice(0, 3))
  const bondCount = Number(counts.slice(3, 6))
  const atoms = lines.slice(4, 4 + atomCount).map((line) => ({
    line,
    element: line.slice(31, 34).trim(),
    coords: [Number(line.slice(0, 10)), Number(line.slice(10, 20)), Number(line.slice(20, 30))],
    chargeCode: Number(line.slice(36, 39)),
  }))
  const bonds = lines.slice(4 + atomCount, 4 + atomCount + bondCount).map((line) => ({
    a: Number(line.slice(0, 3)),
    b: Number(line.slice(3, 6)),
    order: Number(line.slice(6, 9)),
    rest: line.slice(9),
  }))
  const properties = lines.slice(4 + atomCount + bondCount)
  const end = properties.findIndex((line) => line.startsWith('M  END'))
  if (end < 0) throw new Error(`${code}: el SDF no tiene M  END`)
  return {
    header: lines.slice(0, 3),
    countsRest: counts.slice(6),
    atoms,
    bonds,
    properties: properties.slice(0, end),
  }
}

/** Asigna a cada átomo del SDF su nombre del CIF, comprobando elemento y coordenadas. */
function assignNames(mol, cifAtoms, code) {
  if (mol.atoms.length !== cifAtoms.length) {
    throw new Error(`${code}: el SDF tiene ${mol.atoms.length} átomos y el CIF ${cifAtoms.length}`)
  }
  mol.atoms.forEach((atom, index) => {
    const reference = cifAtoms[index]
    if (atom.element !== reference.element) {
      throw new Error(
        `${code}: el átomo ${index + 1} es ${atom.element} en el SDF y ${reference.element} (${reference.name}) en el CIF`,
      )
    }
    if (atom.coords.some((value, axis) => Math.abs(value - reference.coords[axis]) > 0.002)) {
      throw new Error(`${code}: las coordenadas de ${reference.name} no coinciden entre SDF y CIF`)
    }
    atom.name = reference.name
  })
}

function neutralize(mol, rule, code) {
  const indexOf = (name) => {
    const index = mol.atoms.findIndex((atom) => atom.name === name)
    if (index < 0) throw new Error(`${code}: no existe el átomo ${name}`)
    return index + 1
  }
  const bondBetween = (a, b) =>
    mol.bonds.find((bond) => (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a))

  const nitrogen = indexOf(rule.nitrogen)
  const hydrogen = indexOf(rule.hydrogen)

  const chargeLines = mol.properties.filter((line) => line.startsWith('M  CHG'))
  const expected = `M  CHG  1 ${String(nitrogen).padStart(3)} ${'1'.padStart(3)}`
  if (chargeLines.length !== 1 || chargeLines[0].trimEnd() !== expected) {
    throw new Error(
      `${code}: se esperaba una sola carga +1 en ${rule.nitrogen} ("${expected}") y hay: ${JSON.stringify(chargeLines)}`,
    )
  }
  if (mol.atoms[nitrogen - 1].chargeCode !== 3) {
    throw new Error(`${code}: ${rule.nitrogen} no tiene carga +1 en el bloque de átomos`)
  }
  if (bondBetween(nitrogen, hydrogen)?.order !== 1) {
    throw new Error(`${code}: ${rule.hydrogen} no está unido a ${rule.nitrogen}`)
  }
  if (rule.doubleBondTo && bondBetween(nitrogen, indexOf(rule.doubleBondTo))?.order !== 2) {
    throw new Error(`${code}: ${rule.nitrogen} no tiene doble enlace con ${rule.doubleBondTo}`)
  }

  const charged = mol.atoms[nitrogen - 1]
  charged.line = `${charged.line.slice(0, 36)}  0${charged.line.slice(39)}`
  charged.chargeCode = 0

  mol.atoms.splice(hydrogen - 1, 1)
  const renumber = (index) => (index > hydrogen ? index - 1 : index)
  mol.bonds = mol.bonds
    .filter((bond) => bond.a !== hydrogen && bond.b !== hydrogen)
    .map((bond) => ({ ...bond, a: renumber(bond.a), b: renumber(bond.b) }))
  mol.properties = mol.properties.filter((line) => !line.startsWith('M  CHG'))
}

function assertNeutral(mol, code) {
  if (mol.properties.some((line) => line.startsWith('M  CHG')) || mol.atoms.some((atom) => atom.chargeCode !== 0)) {
    throw new Error(`${code}: el SDF tiene cargas formales y no hay regla para neutralizarlo`)
  }
}

function serializeSdf(mol) {
  const pad = (value) => String(value).padStart(3)
  return [
    ...mol.header,
    `${pad(mol.atoms.length)}${pad(mol.bonds.length)}${mol.countsRest}`,
    ...mol.atoms.map((atom) => atom.line),
    ...mol.bonds.map((bond) => `${pad(bond.a)}${pad(bond.b)}${pad(bond.order)}${bond.rest}`),
    ...mol.properties,
    'M  END',
    '$$$$',
    '',
  ].join('\n')
}

await mkdir(OUT_DIR, { recursive: true })
const atomNames = {}

for (const code of CCD_CODES) {
  const [sdf, cif] = await Promise.all([
    fetchText(`https://files.rcsb.org/ligands/view/${code}_ideal.sdf`),
    fetchText(`https://files.rcsb.org/ligands/view/${code}.cif`),
  ])
  const mol = parseSdf(sdf, code)
  assignNames(mol, parseCifAtoms(cif, code), code)

  const rule = NEUTRALIZE[code]
  if (rule) neutralize(mol, rule, code)
  assertNeutral(mol, code)

  await writeFile(join(OUT_DIR, `${code}.sdf`), serializeSdf(mol))
  atomNames[code] = mol.atoms.map((atom) => atom.name)
  console.log(`${code}: ${mol.atoms.length} átomos${rule ? ` (neutralizado: sin ${rule.hydrogen})` : ''}`)
}

await writeFile(join(OUT_DIR, 'atom-names.json'), `${JSON.stringify(atomNames, null, 2)}\n`)
console.log(`Listo: ${CCD_CODES.length} SDF y atom-names.json en public/structures/`)
