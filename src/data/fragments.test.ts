import { AMINO_ACIDS } from './aminoacids'
import { SIDE_CHAIN_RECIPES, smilesFromFragments, validateBuiltStructure } from './fragments'

describe('constructor de estructuras (fragments)', () => {
  it.each(AMINO_ACIDS)('$code3: su receta reconstruye exactamente el SMILES neutro', (aa) => {
    const recipe = SIDE_CHAIN_RECIPES[aa.code3]
    expect(recipe).toBeDefined()
    expect(smilesFromFragments(recipe)).toBe(aa.smiles)
    const validation = validateBuiltStructure(aa, recipe)
    expect(validation.matches).toBe(true)
    expect(validation.builtSmiles).toBe(aa.smiles)
  })

  it('detecta cuando el usuario arma otro aminoácido válido por error (Asp vs Glu)', () => {
    const asp = AMINO_ACIDS.find((aa) => aa.code3 === 'Asp')!
    const gluRecipe = SIDE_CHAIN_RECIPES.Glu
    const result = validateBuiltStructure(asp, gluRecipe)
    expect(result.matches).toBe(false)
    expect(result.matchedAminoAcid?.code3).toBe('Glu')
    expect(result.feedback).toContain('Ácido glutámico')
  })
})
