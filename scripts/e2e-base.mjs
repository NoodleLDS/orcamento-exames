// Abre a base consolidada no app e mede o tempo. Uso: node scripts/e2e-base.mjs <base.xlsx>
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage();
const erros = []; p.on('pageerror', (e) => erros.push(e.message));
await p.goto('http://localhost:4173/');
const t0 = Date.now();
await p.setInputFiles('input[type=file]', process.argv[2]);
await p.waitForSelector('button.primario:has-text("Ver panorama"):not([disabled])', { timeout: 120000 });
console.log('abriu em', ((Date.now() - t0) / 1000).toFixed(1), 's | listas:', await p.locator('table tbody tr').count(), '| vermelhos:', await p.locator('td.n.ruim').count());
await p.click('text=Ver panorama');
console.log((await p.locator('.kpi').allInnerTexts()).slice(0, 3).map((k) => k.replace(/\n+/g, ' | ')));
await p.click('nav >> text=Simulador');
await p.fill('.orc input', '1.000.000');
console.log((await p.locator('.resultado .kpi').first().innerText()).replace(/\n+/g, ' | '), '| erros:', erros);
await b.close();
