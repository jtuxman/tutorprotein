import { AMINO_ACIDS } from '../../data/aminoacids'
import { EMPTY_FILTERS, applyFilters, hasSulfur, normalize, type Filters } from './filters'

const codes = (filters: Partial<Filters>) =>
  applyFilters(AMINO_ACIDS, { ...EMPTY_FILTERS, ...filters })
    .map((aa) => aa.code3)
    .sort()

describe('filtros de clasificación', () => {
  it('sin filtros devuelve los 20', () => {
    expect(codes({})).toHaveLength(20)
  })

  it('busca sin distinguir mayúsculas ni acentos', () => {
    expect(normalize('  Ácido Glutámico ')).toBe('acido glutamico')
    expect(codes({ query: 'glutamico' })).toEqual(['Glu'])
    expect(codes({ query: 'TRIPTOFANO' })).toEqual(['Trp'])
    expect(codes({ query: 'aspartato' })).toEqual(['Asp'])
    expect(codes({ query: 'glu' })).toEqual(['Gln', 'Glu'])
  })

  it('busca por código de una y de tres letras', () => {
    expect(codes({ query: 'W' })).toEqual(['Trp'])
    expect(codes({ query: 'k' })).toEqual(['Lys'])
    expect(codes({ query: 'tyr' })).toEqual(['Tyr'])
  })

  it('combina filtros de distintas categorías', () => {
    expect(codes({ groups: ['positive'], essentiality: ['essential'] })).toEqual(['His', 'Lys'])
    expect(codes({ groups: ['positive', 'negative'] })).toEqual(['Arg', 'Asp', 'Glu', 'His', 'Lys'])
    expect(codes({ charges: ['negative'] })).toEqual(['Asp', 'Glu'])
    expect(codes({ charges: ['positive'] })).toEqual(['Arg', 'Lys'])
    expect(codes({ sulfur: true })).toEqual(['Cys', 'Met'])
    expect(codes({ sulfur: true, essentiality: ['essential'] })).toEqual(['Met'])
    expect(codes({ groups: ['polar'], hydropathy: ['hydrophobic'] })).toEqual(['Cys'])
    expect(codes({ groups: ['negative'], charges: ['positive'] })).toEqual([])
  })

  it('deduce el azufre del SMILES', () => {
    expect(AMINO_ACIDS.filter(hasSulfur).map((aa) => aa.code3).sort()).toEqual(['Cys', 'Met'])
  })
})
