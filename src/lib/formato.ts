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

/**
 * Lê data como a pessoa digitar: "15/08/2026", "15/8/26", "08/2026", "ago/2026", "2026".
 * Mês ou ano sozinhos viram o primeiro dia (modo "inicio") ou o último dia (modo "fim").
 * Retorna ISO yyyy-mm-dd ou null.
 */
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export function lerData(s: string, modo: 'inicio' | 'fim'): string | null {
  let t = s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.\-\s]+/g, '/');
  if (!t) return null;
  t = t.replace(/^([a-z]{3})[a-z]*\//, (_, m: string) => (MESES.indexOf(m) >= 0 ? `${MESES.indexOf(m) + 1}/` : 'x/'));
  const ano = (a: string) => (a.length === 2 ? 2000 + Number(a) : a.length === 4 ? Number(a) : NaN);
  const p2 = (n: number) => String(n).padStart(2, '0');
  const ultimo = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate();
  let a: number, m: number, d: number;
  let partes = t.split('/');
  if (partes.length === 1 && /^\d{8}$/.test(t)) partes = [t.slice(0, 2), t.slice(2, 4), t.slice(4)];
  if (partes.length === 1 && /^\d{6}$/.test(t)) partes = [t.slice(0, 2), t.slice(2)];
  if (partes.some((x) => !/^\d+$/.test(x))) return null;
  if (partes.length === 3) [d, m, a] = [Number(partes[0]), Number(partes[1]), ano(partes[2])];
  else if (partes.length === 2) {
    [m, a] = [Number(partes[0]), ano(partes[1])];
    d = modo === 'inicio' ? 1 : ultimo(a, m);
  } else if (partes.length === 1 && partes[0].length === 4) {
    a = ano(partes[0]);
    [m, d] = modo === 'inicio' ? [1, 1] : [12, 31];
  } else return null;
  if (!Number.isFinite(a) || a < 2000 || a > 2100 || m < 1 || m > 12 || d < 1 || d > ultimo(a, m)) return null;
  return `${a}-${p2(m)}-${p2(d)}`;
}

export const valorParaCampo =(n: number | null | undefined) =>
  n === null || n === undefined ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
