// Teste das interações do simulador. Uso: node scripts/e2e-ux.mjs <base.xlsx> <saida-dir>
import { chromium } from 'playwright';
import path from 'node:path';

const [base, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const erros = [];
p.on('pageerror', (e) => erros.push(e.message));
const ok = (c, msg) => console.log(c ? 'OK  ' : 'ERRO', msg);

await p.goto('http://localhost:4173/');
await p.setInputFiles('input[type=file]', base);
await p.waitForSelector('button.primario:has-text("Ver panorama"):not([disabled])');
await p.click('nav >> text=Simulador');
await p.fill('.orc input', '1 milhão');
await p.waitForTimeout(700);
const contemplados = async () => (await p.locator('.kpi.destaque strong').innerText()).trim();
ok((await contemplados()) === '9.470', `1 milhão, todos: ${await contemplados()}`);

// idade: negativo bloqueado, decimal truncado
const idadeDe = p.locator('.filtro:has-text("Idade") input').first();
await idadeDe.click();
await p.keyboard.type('-5');
ok((await idadeDe.inputValue()) === '5', `digitar "-5" na idade vira: "${await idadeDe.inputValue()}"`);
await idadeDe.fill('');
await idadeDe.fill('-10');
await p.waitForTimeout(200);
ok(Number(await idadeDe.inputValue() || 0) >= 0, `colar "-10" vira: "${await idadeDe.inputValue()}"`);
await idadeDe.fill('');

// datas
const de = p.locator('.filtro:has-text("Entrou na fila") input').nth(0);
const ate = p.locator('.filtro:has-text("Entrou na fila") input').nth(1);
await de.fill('08/2026');
await ate.fill('31082026');
await p.waitForTimeout(600);
const dicas = await p.locator('.filtro:has-text("Entrou na fila") .campo-data small').allInnerTexts();
ok(dicas[0].includes('01/08/2026') && dicas[1].includes('31/08/2026'), `datas entendidas: ${dicas.join(' | ')} (campo 2 mostra "${await ate.inputValue()}")`);
const eleg = (await p.locator('.kpi').nth(3).locator('strong').innerText()).trim();
ok(eleg === '4.458', `elegíveis que entraram em agosto/2026: ${eleg}`);
await de.fill('32/13/2026');
await p.waitForTimeout(200);
ok((await p.locator('.campo-data small.erro').count()) === 1, 'data inválida sinalizada');
await p.click('.filtro:has-text("Entrou na fila") .limpar >> nth=0');
await p.click('.filtro:has-text("Entrou na fila") .limpar >> nth=0');
await p.waitForTimeout(900);
ok((await contemplados()) === '9.470', 'limpar datas volta ao cenário original');

// frase
console.log('     frase:', await p.locator('.frase p').innerText());

// cenários
await p.click('text=Guardar para comparar');
await idadeDe.fill('60');
await p.waitForTimeout(700);
await p.click('text=Guardar para comparar');
const linhasCen = await p.locator('.cenarios tbody tr').allInnerTexts();
ok(linhasCen.length === 2, `cenários guardados: ${linhasCen.length}`);
console.log('     ', linhasCen.map((l) => l.replace(/\s+/g, ' ')).join('\n      '));

// regras sobrevivem à troca de aba
await p.click('nav >> text=Panorama');
await p.click('nav >> text=Simulador');
ok((await idadeDe.inputValue()) === '60' && (await p.locator('.cenarios tbody tr').count()) === 2, 'regras e cenários mantidos ao trocar de aba');

// Excel com aba de compra
const [dl] = await Promise.all([p.waitForEvent('download'), p.click('text=Baixar Excel')]);
await dl.saveAs(path.join(out, 'ux-cenario.xlsx'));
ok(true, 'Excel baixado: ' + (await dl.suggestedFilename()));

// modo apresentação
await p.click('.interruptor');
await p.waitForTimeout(300);
const nomesVisiveis = await p.locator('.lista-pacientes tbody tr').count();
ok(nomesVisiveis === 0 && (await p.locator('.oculto').isVisible()), 'modo apresentação esconde a lista');
const [dl2] = await Promise.all([p.waitForEvent('download'), p.click('text=Baixar Excel')]);
await dl2.saveAs(path.join(out, 'ux-sem-nomes.xlsx'));
await p.screenshot({ path: path.join(out, 'ux-1440.png') });

// impressão
await p.emulateMedia({ media: 'print' });
await p.pdf({ path: path.join(out, 'ux-resumo.pdf'), format: 'A4', printBackground: true });
await p.emulateMedia({ media: 'screen' });
ok(true, 'PDF de resumo gerado');

for (const [w, h] of [[1024, 768], [768, 1024], [390, 844]]) {
  await p.setViewportSize({ width: w, height: h });
  await p.waitForTimeout(400);
  if (w === 390) console.log('     lista de exames no celular aberta?', await p.locator('.lista-exames').evaluate((d) => d.open));
  const largura = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(largura <= w, `largura ${w}px: página com ${largura}px`);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.screenshot({ path: path.join(out, `ux-${w}.png`) });
}
ok(erros.length === 0, `erros no console: ${JSON.stringify(erros)}`);
await b.close();
