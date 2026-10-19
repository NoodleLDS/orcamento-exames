// Carrega os PDFs no app, salva a base e exporta cenários em Excel, para conferência externa.
// Uso: node scripts/e2e-cenarios.mjs <pasta-pdfs> <pasta-saida>
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const [dir, out] = process.argv.slice(2);
const pdfs = fs.readdirSync(dir).filter((f) => f.endsWith('.pdf')).map((f) => path.join(dir, f));
const ascii = pdfs.filter((p) => /^[\x20-\x7e]+$/.test(path.basename(p)));
const acento = pdfs.filter((p) => !ascii.includes(p));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const erros = [];
p.on('pageerror', (e) => erros.push(e.message));
await p.goto('http://localhost:4173/');
const pronto = 'button.primario:has-text("Ver panorama"):not([disabled])';
await p.setInputFiles('input[type=file]', ascii);
await p.waitForSelector(pronto, { timeout: 600000 });
if (acento.length) {
  await p.setInputFiles('input[type=file]', acento.map((f) => ({ name: path.basename(f), mimeType: 'application/pdf', buffer: fs.readFileSync(f) })));
  await p.waitForTimeout(1500);
  await p.waitForSelector(pronto, { timeout: 600000 });
}
console.log('relatórios carregados:', await p.locator('table tbody tr').count());

const baixar = async (acao, nome) => {
  const [dl] = await Promise.all([p.waitForEvent('download'), acao()]);
  await dl.saveAs(path.join(out, nome));
};
await baixar(() => p.click('text=Salvar base consolidada'), 'app-base.xlsx');

await p.click('text=Ver panorama');
const pan = (await p.locator('.kpi').allInnerTexts()).map((k) => k.replace(/\n+/g, ' | '));
fs.writeFileSync(path.join(out, 'app-panorama.json'), JSON.stringify(pan));
await p.click('nav >> text=Simulador');

const kpis = async () => (await p.locator('.resultado .kpi').allInnerTexts()).map((k) => k.replace(/\n+/g, ' | '));
const marcar = async (nomes, on) => {
  for (const n of nomes) {
    const cb = p.locator('.checks label').filter({ has: p.locator('span', { hasText: new RegExp(`^${n.replace(/[()]/g, '\\$&')}$`) }) }).locator('input');
    on ? await cb.check() : await cb.uncheck();
  }
};
const FORA_CISALP = ['Folato', 'Ferritina', 'Transferrina', 'Capacidade de fixação do ferro', 'Urina tipo I (EAS)', 'T3', 'T4', 'T4 livre'];
const resumo = {};

// A: todos, 1 milhão, padrão (data mais antiga, depois mais velhos)
await p.fill('.orc input', '1000000');
await p.waitForTimeout(900);
resumo.A = await kpis();
await baixar(() => p.click('text=Baixar Excel'), 'cen-A.xlsx');

// B: só os 21 da tabela CISALP
await marcar(FORA_CISALP, false);
await p.waitForTimeout(900);
resumo.B = await kpis();
await baixar(() => p.click('text=Baixar Excel'), 'cen-B.xlsx');
await marcar(FORA_CISALP, true);

// C: todos, 60+ anos, idade primeiro (mais velhos)
await p.fill('.grade2 label:has-text("Idade de") input', '60');
await p.selectOption('.controles select >> nth=1', 'idade');
await p.waitForTimeout(900);
resumo.C = await kpis();
await baixar(() => p.click('text=Baixar Excel'), 'cen-C.xlsx');

// D: todos, sem filtro de idade, data primeiro, faixa prioritária 60-120, R$ 500 mil, modo pular
await p.fill('.grade2 label:has-text("Idade de") input', '');
await p.selectOption('.controles select >> nth=1', 'data');
await p.click('text=+ adicionar faixa');
await p.selectOption('.orc ~ label select', 'pular');
await p.fill('.orc input', '500 mil');
await p.waitForTimeout(900);
resumo.D = await kpis();
await baixar(() => p.click('text=Baixar Excel'), 'cen-D.xlsx');

fs.writeFileSync(path.join(out, 'app-kpis.json'), JSON.stringify(resumo, null, 1));
console.log(JSON.stringify(resumo, null, 1));
console.log('erros:', erros);
await b.close();
