const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const num = new Intl.NumberFormat('pt-BR');

export const reais = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : brl.format(v));
export const inteiro = (v: number) => num.format(v);
export const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—');
export const dataBR = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');

/** Aceita "1.000.000", "1000000", "1.000.000,50", "1 milhão" não. */
export function lerValor(s: string): number | null {
  const limpo = s.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export const valorParaCampo = (n: number | null | undefined) =>
  n === null || n === undefined ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
