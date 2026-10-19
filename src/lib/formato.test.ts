import { describe, expect, it } from 'vitest';
import { lerData, lerValor } from './formato';

describe('lerData', () => {
  it.each([
    ['15/08/2026', 'inicio', '2026-08-15'],
    ['15/8/26', 'inicio', '2026-08-15'],
    ['15082026', 'inicio', '2026-08-15'],
    ['08/2026', 'inicio', '2026-08-01'],
    ['08/2026', 'fim', '2026-08-31'],
    ['02/2028', 'fim', '2028-02-29'],
    ['ago/2026', 'inicio', '2026-08-01'],
    ['Setembro 2026', 'fim', '2026-09-30'],
    ['2026', 'inicio', '2026-01-01'],
    ['2026', 'fim', '2026-12-31'],
  ] as const)('"%s" (%s) → %s', (s, modo, iso) => expect(lerData(s, modo)).toBe(iso));

  it.each(['', '31/02/2026', '13/2026', 'abc', '15/08', '1/1/1990'])('"%s" é inválida', (s) => expect(lerData(s, 'inicio')).toBeNull());

  it('6 dígitos é mês e ano', () => expect(lerData('082026', 'fim')).toBe('2026-08-31'));
});

describe('lerValor', () => {
  it.each([
    ['1000000', 1_000_000],
    ['1.000.000', 1_000_000],
    ['1.000.000,00', 1_000_000],
    ['R$ 1.000.000,50', 1_000_000.5],
    ['1,000,000', 1_000_000],
    ['1 milhão', 1_000_000],
    ['1 milhao', 1_000_000],
    ['1,5 mi', 1_500_000],
    ['2 milhões', 2_000_000],
    ['500 mil', 500_000],
    ['500.000', 500_000],
    ['500,000', 500_000],
    ['7,20', 7.2],
    ['3.36', 3.36],
    ['0', 0],
  ])('"%s" → %d', (s, v) => expect(lerValor(s)).toBe(v));

  it.each(['', 'abc', '1.2.3,4,5', '-100'])('"%s" não é valor', (s) => expect(lerValor(s)).toBeNull());
});
