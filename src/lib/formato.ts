const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const num = new Intl.NumberFormat('pt-BR');

export const reais = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : brl.format(v));
export const inteiro = (v: number) => num.format(v);
export const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—');
export const dataBR = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');

/**
 * Lê valor em reais como a pessoa digitar:
 * "1000000", "1.000.000", "1.000.000,50", "R$ 1.000.000,00", "1,000,000", "1 milhão", "1,5 mi", "500 mil".
 */
export function lerValor(s: string): number | null {
  let t = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/r\$|\s/g, '');
  if (!t) return null;
  let mult = 1;
  const suf = /(milhoes|milhao|mi|mm)$|(mil|k)$/.exec(t);
  if (suf) {
    mult = suf[1] ? 1e6 : 1e3;
    t = t.slice(0, suf.index);
  }
  const virgulas = (t.match(/,/g) ?? []).length;
  const pontos = (t.match(/\./g) ?? []).length;
  if (virgulas > 1 && pontos === 0) t = t.replace(/,/g, ''); // 1,000,000 (formato americano)
  else if (pontos > 1 && virgulas === 0) t = t.replace(/\./g, ''); // 1.000.000
  else if (pontos === 1 && virgulas === 0 && /\.\d{3}$/.test(t) && mult === 1) t = t.replace('.', ''); // 500.000
  else if (virgulas === 1 && pontos === 0 && /,\d{3}$/.test(t) && mult === 1) t = t.replace(',', ''); // 500,000
  else if (pontos === 1 && virgulas === 0) { /* 3.36: ponto decimal, deixa como está */ }
  else t = t.replace(/\./g, '').replace(',', '.'); // 1.000.000,50 / 1,5
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t) * mult;
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export const valorParaCampo = (n: number | null | undefined) =>
  n === null || n === undefined ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
