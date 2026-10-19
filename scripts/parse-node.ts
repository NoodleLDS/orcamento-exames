// Roda o mesmo parser do app em Node, para validar contra os PDFs reais.
// Uso: npx tsx scripts/parse-node.ts <pasta-com-pdfs> <saida.json>
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { parseRelatorio, type TextItem } from '../src/core/parseRelatorio';

const [dir, out] = process.argv.slice(2);
const todos = [];
for (const f of fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf')).sort()) {
  const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(path.join(dir, f))), verbosity: 0 }).promise;
  const paginas: TextItem[][] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    paginas.push(
      tc.items.filter((i) => 'str' in i).map((i: any) => ({ str: i.str, x: i.transform[4], y: i.transform[5] })),
    );
  }
  const r = parseRelatorio(paginas, f);
  console.log(`${r.exame} | declarado ${r.totalDeclarado} | lido ${r.linhas.length} | avisos ${r.avisos.length}`);
  r.avisos.slice(0, 3).forEach((a) => console.log('   ', a.replace(/\d+\/\d+/, '#')));
  todos.push(r);
}
fs.writeFileSync(out, JSON.stringify(todos));
