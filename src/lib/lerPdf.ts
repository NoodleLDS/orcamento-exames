import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { parseRelatorio, type Relatorio, type TextItem } from '../core/parseRelatorio';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Lê o PDF inteiro no navegador. Nada sai do computador. */
export async function lerRelatorioPdf(arquivo: File, progresso: (pag: number, total: number) => void): Promise<Relatorio> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()), verbosity: 0 }).promise;
  const paginas: TextItem[][] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    paginas.push(
      tc.items.flatMap((i) => ('str' in i ? [{ str: i.str, x: i.transform[4], y: i.transform[5] }] : [])),
    );
    if (p % 10 === 0 || p === doc.numPages) progresso(p, doc.numPages);
  }
  await doc.destroy();
  return parseRelatorio(paginas, arquivo.name);
}
