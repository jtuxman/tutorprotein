import SmilesDrawer from 'smiles-drawer'
import { computePI } from '../chem/charge'
import { formulaFromSmiles } from '../chem/smiles'
import { formulaFromSdf, parseSdfAtoms, readAtomNames, readStructure, structureExists } from '../test/structures'
import { AMINO_ACIDS, GROUPS, ccdCode, type LehningerGroup } from './aminoacids'

const EXPECTED_GROUPS: Record<LehningerGroup, string[]> = {
  nonpolar: ['Gly', 'Ala', 'Pro', 'Val', 'Leu', 'Ile', 'Met'],
  aromatic: ['Phe', 'Tyr', 'Trp'],
  polar: ['Ser', 'Thr', 'Cys', 'Asn', 'Gln'],
  positive: ['Lys', 'Arg', 'His'],
  negative: ['Asp', 'Glu'],
}

const atomNames = readAtomNames()

describe('AMINO_ACIDS', () => {
  it('tiene exactamente los 20 estándar, con códigos únicos', () => {
    expect(AMINO_ACIDS).toHaveLength(20)
    expect(AMINO_ACIDS.every((aa) => aa.standard)).toBe(true)
    expect(new Set(AMINO_ACIDS.map((aa) => aa.code3)).size).toBe(20)
    expect(
      AMINO_ACIDS.map((aa) => aa.code1)
        .sort()
        .join(''),
    ).toBe('ACDEFGHIKLMNPQRSTVWY')
  })

  it('pone cada aminoácido en su grupo de Lehninger', () => {
    for (const [group, codes] of Object.entries(EXPECTED_GROUPS)) {
      const actual = AMINO_ACIDS.filter((aa) => aa.group === group).map((aa) => aa.code3)
      expect(actual.sort()).toEqual([...codes].sort())
      expect(GROUPS[group as LehningerGroup].label).toBeTruthy()
      expect(GROUPS[group as LehningerGroup].explanation.length).toBeGreaterThanOrEqual(2)
    }
  })

  it.each(AMINO_ACIDS)('$code3: SMILES neutro que SmilesDrawer parsea', (aa) => {
    expect(aa.smiles).not.toBe('')
    expect(aa.smiles).not.toMatch(/[+-]/)
    expect(() => SmilesDrawer.Parser.parse(aa.smiles)).not.toThrow()
  })

  it.each(AMINO_ACIDS)('$code3: el SDF existe, es neutro y coincide con el SMILES', (aa) => {
    const ccd = ccdCode(aa)
    expect(structureExists(ccd)).toBe(true)
    const sdf = readStructure(ccd)
    expect(sdf).not.toContain('M  CHG')
    expect(parseSdfAtoms(sdf).every((atom) => atom.chargeCode === 0)).toBe(true)
    // Fórmula completa, con hidrógenos: 2D y 3D están en la misma forma neutra.
    expect(formulaFromSdf(sdf)).toEqual(formulaFromSmiles(aa.smiles))
  })

  it.each(AMINO_ACIDS)('$code3: atom-names.json nombra cada átomo del SDF', (aa) => {
    const ccd = ccdCode(aa)
    const names = atomNames[ccd]
    const atoms = parseSdfAtoms(readStructure(ccd))
    expect(names).toHaveLength(atoms.length)
    expect(new Set(names).size).toBe(names.length)
    for (const group of aa.ionizableGroups) {
      for (const atom of group.atoms) expect(names).toContain(atom)
    }
  })

  it('His está en el tautómero Nε2–H', () => {
    expect(atomNames.HIS).toContain('HE2')
    expect(atomNames.HIS).not.toContain('HD1')
  })

  it.each(AMINO_ACIDS)('$code3: el pI tabulado es coherente con sus pKa', (aa) => {
    expect(Math.abs(aa.pI - computePI(aa))).toBeLessThanOrEqual(0.1)
  })

  it('usa la escala de Kyte-Doolittle', () => {
    for (const aa of AMINO_ACIDS) {
      expect(aa.hydropathy).toBeGreaterThanOrEqual(-4.5)
      expect(aa.hydropathy).toBeLessThanOrEqual(4.5)
    }
    expect(AMINO_ACIDS.find((aa) => aa.code3 === 'Ile')?.hydropathy).toBe(4.5)
    expect(AMINO_ACIDS.find((aa) => aa.code3 === 'Arg')?.hydropathy).toBe(-4.5)
  })

  it('reparte los 61 codones con sentido sin repetir', () => {
    const codons = AMINO_ACIDS.flatMap((aa) => aa.codons)
    expect(codons).toHaveLength(61)
    expect(new Set(codons).size).toBe(61)
    for (const codon of codons) expect(codon).toMatch(/^[ACGU]{3}$/)
    for (const stop of ['UAA', 'UAG', 'UGA']) expect(codons).not.toContain(stop)
  })

  it('la masa tabulada coincide con la fórmula del SMILES', () => {
    const mass: Record<string, number> = { C: 12.011, H: 1.008, N: 14.007, O: 15.999, S: 32.06 }
    for (const aa of AMINO_ACIDS) {
      const computed = Object.entries(formulaFromSmiles(aa.smiles)).reduce(
        (sum, [element, count]) => sum + mass[element] * count,
        0,
      )
      expect(Math.abs(computed - aa.molecularWeight)).toBeLessThan(0.6)
    }
  })
})
