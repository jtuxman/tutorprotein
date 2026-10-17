import SmilesDrawer from 'smiles-drawer'
import { AMINO_ACIDS } from '../data/aminoacids'
import { describeProtonation, protonatedSmiles, titrationCurve } from './protonation'

describe('protonation', () => {
  it('a pH 7 representa Gly como zwitterión con carga neta cercana a 0', () => {
    const gly = AMINO_ACIDS.find((aa) => aa.code3 === 'Gly')!
    const smiles = protonatedSmiles(gly, 7)
    expect(smiles).toContain('[NH3+]')
    expect(smiles).toContain('[O-]')
    const groups = describeProtonation(gly, 7)
    expect(groups.find((g) => g.group.kind === 'alpha-carboxyl')?.predominantlyProtonated).toBe(false)
    expect(groups.find((g) => g.group.kind === 'alpha-amino')?.predominantlyProtonated).toBe(true)
  })

  it('produce SMILES válidos para SmilesDrawer en los 20 aminoácidos a pH ácido, neutro y básico', () => {
    for (const aa of AMINO_ACIDS) {
      for (const pH of [1, 7, 13]) {
        const smiles = protonatedSmiles(aa, pH)
        let parsed: unknown = null
        let error: unknown = null
        SmilesDrawer.parse(
          smiles,
          (tree) => {
            parsed = tree
          },
          (err) => {
            error = err
          },
        )
        expect(error, `${aa.code3} a pH ${pH} (${smiles})`).toBeNull()
        expect(parsed, `${aa.code3} a pH ${pH}`).not.toBeNull()
      }
    }
  })

  it('genera la curva de titulación de His con tres escalones (0 a 3 equivalentes)', () => {
    const his = AMINO_ACIDS.find((aa) => aa.code3 === 'His')!
    expect(his.ionizableGroups).toHaveLength(3)
    const curve = titrationCurve(his, 0.5)
    expect(curve[0].pH).toBe(0)
    expect(curve.at(-1)?.pH).toBe(14)
    expect(curve[0].equivalents).toBeLessThan(0.1)
    expect(curve.at(-1)!.equivalents).toBeGreaterThan(2.9)
    // Monótona creciente en equivalentes de base y decreciente en carga neta.
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].equivalents).toBeGreaterThan(curve[i - 1].equivalents)
      expect(curve[i].netCharge).toBeLessThan(curve[i - 1].netCharge)
    }
  })
})
