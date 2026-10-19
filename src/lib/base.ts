// "Base consolidada": todas as listas já lidas num Excel único, para abrir em segundos
// sem reler os PDFs. Funciona no navegador e no Node (mesmo código).
import * as XLSX from 'xlsx';
import type { LinhaFila, Relatorio } from '../core/parseRelatorio';

const COLS = [
  'Procedimento', 'Prontuário', 'Nome', 'Idade', 'CNS', 'Data cadastro', 'Data solicitada',
  'Total de procedimentos', 'Risco', 'Unidade solicitada',
] as const;
const MARCA = 'Base consolidada — Fila Eletrônica de exames';

const br = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');
const iso = (s: unknown) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s ?? '').trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
};

export function montarBase(relatorios: Relatorio[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const info = [
    [MARCA],
    ['Gerada em', new Date().toLocaleString('pt-BR')],
    [],
    ['Procedimento', 'Total declarado', 'Linhas', 'Relatório gerado em'],
    ...relatorios.map((r) => [r.exame, r.totalDeclarado ?? '', r.linhas.length, r.geradoEm]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), 'Relatórios');
  const linhas: (string | number)[][] = [COLS as unknown as string[]];
  for (const r of relatorios)
    for (const l of r.linhas)
      linhas.push([
        l.exame, l.prontuario, l.nome, l.idadeTexto, l.cns, br(l.dataCadastro), br(l.dataSolicitada),
        l.totalProcedimentos ?? '', l.risco, l.unidadeSolicitada,
      ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linhas), 'Linhas');
  return wb;
}

export function baixarBase(relatorios: Relatorio[]) {
  XLSX.writeFile(montarBase(relatorios), `base-fila-exames-${new Date().toISOString().slice(0, 10)}.xlsx`, { compression: true });
}

export function lerBase(dados: ArrayBuffer | Uint8Array): Relatorio[] {
  const wb = XLSX.read(dados, { type: 'array', raw: true });
  const infoSheet = wb.Sheets['Relatórios'];
  const linhasSheet = wb.Sheets['Linhas'];
  if (!infoSheet || !linhasSheet) throw new Error('não é uma base gerada por este app (faltam as abas "Relatórios" e "Linhas")');

  const info = XLSX.utils.sheet_to_json<(string | number)[]>(infoSheet, { header: 1, raw: false });
  const meta = new Map<string, { total: number | null; gerado: string }>();
  for (const row of info.slice(4)) if (row[0]) meta.set(String(row[0]), { total: row[1] === '' || row[1] == null ? null : Number(row[1]), gerado: String(row[3] ?? '') });

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(linhasSheet, { raw: false, defval: '' });
  const porExame = new Map<string, LinhaFila[]>();
  for (const r of rows) {
    const exame = String(r['Procedimento']);
    const idadeTexto = String(r['Idade']).trim();
    const [n, u] = idadeTexto.split(/\s+/);
    const idadeAnos = u === 'M' ? Number(n) / 12 : u === 'D' ? Number(n) / 365 : Number(n);
    const l: LinhaFila = {
      exame,
      prontuario: String(r['Prontuário']),
      nome: String(r['Nome']),
      idadeAnos,
      idadeTexto,
      cns: String(r['CNS']),
      dataCadastro: iso(r['Data cadastro']),
      dataSolicitada: iso(r['Data solicitada']),
      risco: String(r['Risco']),
      unidadeSolicitada: String(r['Unidade solicitada']),
      totalProcedimentos: r['Total de procedimentos'] === '' ? null : Number(r['Total de procedimentos']),
    };
    const lista = porExame.get(exame);
    if (lista) lista.push(l);
    else porExame.set(exame, [l]);
  }
  return [...porExame].map(([exame, linhas]) => {
    const m = meta.get(exame);
    const avisos = m?.total != null && m.total !== linhas.length ? [`${exame}: base diz ${m.total} pacientes, mas tem ${linhas.length} linhas`] : [];
    return { exame, totalDeclarado: m?.total ?? null, geradoEm: m?.gerado ?? '', linhas, avisos };
  });
}
