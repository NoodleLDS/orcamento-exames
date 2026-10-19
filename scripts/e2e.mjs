// Teste ponta a ponta: carrega os PDFs reais no app e confere os números da tela.
// Uso: node scripts/e2e.mjs <pasta-pdfs> <pasta-saida>
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const [dir, out] = process.argv.slice(2);
const pdfs = fs.readdirSync(dir).filter((f) => f.endsWith('.pdf')).map((f) => path.join(dir, f));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));

await page.goto('http://localhost:4173/');
const t0 = Date.now();
// O Playwright não envia por caminho arquivo com acento no nome: esses vão como buffer, numa segunda leva
const ascii = pdfs.filter((p) => /^[\x20-\x7e]+$/.test(path.basename(p)));
const acento = pdfs.filter((p) => !ascii.includes(p));
await page.setInputFiles('input[type=file]', ascii);
await page.waitForSelector('button.primario:has-text("Ver panorama"):not([disabled])', { timeout: 600000 });
await page.setInputFiles(
  'input[type=file]',
  acento.map((p) => ({ name: path.basename(p), mimeType: 'application/pdf', buffer: fs.readFileSync(p) })),
);
console.log('arquivos com acento no nome:', acento.map((p) => path.basename(p)));
await page.waitForTimeout(500);
await page.waitForSelector('button.primario:has-text("Ver panorama"):not([disabled])', { timeout: 600000 });
console.log('leitura no navegador:', Math.round((Date.now() - t0) / 1000), 's');
console.log('linhas na tabela de arquivos:', await page.locator('table tbody tr').count());
console.log('marcados em vermelho (declarado != lido):', await page.locator('td.n.ruim').count());

await page.click('text=Ver panorama');
const kpis = await page.locator('.kpi').allInnerTexts();
console.log('PANORAMA:', kpis.map((k) => k.replace(/\n+/g, ' | ')));
await page.screenshot({ path: path.join(out, 'panorama.png'), fullPage: true });

await page.click('nav >> text=Simulador');
await page.fill('.orc input', '1.000.000');
await page.locator('.orc input').blur();
await page.waitForTimeout(300);
console.log('SIM 1M:', (await page.locator('.resultado .kpi').allInnerTexts()).map((k) => k.replace(/\n+/g, ' | ')));
console.log('funil:', await page.locator('.funil').innerText());
await page.screenshot({ path: path.join(out, 'simulador.png') });

// desmarca os 5 exames sem valor CISALP
for (const e of ['Ferritina', 'Folato', 'Transferrina', 'Capacidade de fixação do ferro', 'Urina tipo I (EAS)']) {
  await page.locator('.checks label', { hasText: e }).locator('input').uncheck();
}
console.log('SIM 21 exames:', (await page.locator('.resultado .kpi').allInnerTexts()).map((k) => k.replace(/\n+/g, ' | ')));

// faixa prioritária 60+ e pedido completo
await page.click('text=+ adicionar faixa');
await page.locator('.checks label', { hasText: 'Ferritina' }).locator('input').check();
console.log('SIM com faixa 60+:', (await page.locator('.resultado .kpi').first().innerText()).replace(/\n+/g, ' | '));
const primeira = await page.locator('.resultado tbody tr').first().locator('td').nth(3).innerText();
console.log('idade do 1º da lista com faixa 60+:', primeira);

const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=Baixar Excel')]);
const arq = path.join(out, await dl.suggestedFilename());
await dl.saveAs(arq);
console.log('excel:', path.basename(arq), fs.statSync(arq).size, 'bytes');

await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: path.join(out, 'mobile.png') });
const largura = await page.evaluate(() => document.documentElement.scrollWidth);
console.log('largura no celular:', largura);
console.log('erros no console:', erros);
await browser.close();
