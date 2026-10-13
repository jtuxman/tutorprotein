import { AMINO_ACIDS } from '../data/aminoacids'
import { chargeSign, groupCharge, netCharge } from './charge'

const byCode = (code3: string) => AMINO_ACIDS.find((aa) => aa.code3 === code3)!

describe('carga por Henderson-Hasselbalch', () => {
  it('un grupo está medio ionizado en su pKa', () => {
    expect(groupCharge({ pKa: 4, type: 'acid' }, 4)).toBeCloseTo(-0.5)
    expect(groupCharge({ pKa: 9, type: 'base' }, 9)).toBeCloseTo(0.5)
  })

  it('da la carga neta esperada a pH 7', () => {
    expect(netCharge(byCode('Asp'), 7)).toBeCloseTo(-1, 1)
    expect(netCharge(byCode('Glu'), 7)).toBeCloseTo(-1, 1)
    expect(netCharge(byCode('Lys'), 7)).toBeCloseTo(1, 1)
    expect(netCharge(byCode('Arg'), 7)).toBeCloseTo(1, 1)
    expect(netCharge(byCode('Gly'), 7)).toBeCloseTo(0, 1)
    const his = netCharge(byCode('His'), 7)
    expect(his).toBeGreaterThan(0)
    expect(his).toBeLessThan(0.2)
  })

  it('clasifica el signo de la carga redondeada', () => {
    expect(chargeSign(byCode('Asp'))).toBe('negative')
    expect(chargeSign(byCode('Lys'))).toBe('positive')
    expect(chargeSign(byCode('His'))).toBe('neutral')
    expect(chargeSign(byCode('Ala'))).toBe('neutral')
  })
})
