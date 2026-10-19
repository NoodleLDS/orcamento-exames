import * as XLSX from 'xlsx';
import type { Resultado, ItemFila } from '../core/simulacao';
import type { Precos } from '../core/pacientes';
import { dataBR } from './formato';

const r2 = (v: number) => Math.round(v * 100) / 100;

const linhas = (xs: ItemFila[], ocultarNomes: boolean) =>
  xs.map((i) => ({
    'Posição na prioridade': i.posicao,
    Prontuário: i.paciente.prontuario,
    ...(ocultarNomes ? {} : { Nome: i.paciente.nome, CNS: i.paciente.cns }),
    Idade: i.paciente.idadeTexto,
    'Data de inclusão': dataBR(i.paciente.dataInclusao),
    'Data solicitada (maior)': dataBR(i.paciente.dataSolicitadaMax),
    Exames: i.paciente.exames.join(', '),
    'Qtd. exames': i.paciente.exames.length,
    'Procedimentos fora das listas': i.paciente.foraDasListas,
    'Custo (R$)': r2(i.custo),
  }));

/** Quantidade de cada exame pago pelo orçamento: o pedido de compra. */
export function examesAComprar(r: Resultado, precos: Precos) {
  const qtd = new Map<string, number>();
  for (const i of r.contemplados) for (const e of i.paciente.exames) qtd.set(e, (qtd.get(e) ?? 0) + 1);
  return [...qtd.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([exame, q]) => ({ exame, qtd: q, unit: precos[exame] ?? 0, total: r2(q * (precos[exame] ?? 0)) }));
}

export function exportarExcel(r: Resultado, precos: Precos, descricaoRegras: [string, string][], frase: string, ocultarNomes: boolean) {
  const wb = XLSX.utils.book_new();
  const resumo: (string | number)[][] = [
    ['Cenário de orçamento — Fila Eletrônica de exames laboratoriais'],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
    [],
    ['Resumo', frase],
    [],
    ...descricaoRegras,
    [],
    ['Pacientes contemplados', r.contemplados.length],
    ['Custo dos contemplados (R$)', r2(r.custoContemplados)],
    ['Elegíveis não contemplados', r.naoContemplados.length],
    ['Custo para atender os não contemplados (R$)', r2(r.custoNaoContemplados)],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  wsResumo['!cols'] = [{ wch: 42 }, { wch: 110 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Cenário');

  const compra = examesAComprar(r, precos);
  const totalCompra = compra.reduce((s, c) => s + c.total, 0);
  const wsCompra = XLSX.utils.aoa_to_sheet([
    ['Exame', 'Quantidade', 'Valor unitário (R$)', 'Total (R$)'],
    ...compra.map((c) => [c.exame, c.qtd, c.unit, c.total]),
    ['TOTAL', compra.reduce((s, c) => s + c.qtd, 0), '', r2(totalCompra)],
  ]);
  wsCompra['!cols'] = [{ wch: 34 }, { wch: 12 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsCompra, 'Exames a comprar');

  const aba = (xs: ItemFila[]) =>
    xs.length ? XLSX.utils.json_to_sheet(linhas(xs, ocultarNomes)) : XLSX.utils.aoa_to_sheet([['Nenhum paciente nesta lista']]);
  XLSX.utils.book_append_sheet(wb, aba(r.contemplados), 'Contemplados');
  XLSX.utils.book_append_sheet(wb, aba(r.naoContemplados), 'Não contemplados');
  const hoje = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `cenario-orcamento-exames-${hoje}.xlsx`);
}
