import * as XLSX from 'xlsx';
import type { Resultado, Regras, ItemFila } from '../core/simulacao';
import { dataBR } from './formato';

const linhas = (xs: ItemFila[]) =>
  xs.map((i) => ({
    'Posição na prioridade': i.posicao,
    Prontuário: i.paciente.prontuario,
    Nome: i.paciente.nome,
    CNS: i.paciente.cns,
    Idade: i.paciente.idadeTexto,
    'Data de inclusão': dataBR(i.paciente.dataInclusao),
    'Data solicitada (maior)': dataBR(i.paciente.dataSolicitadaMax),
    Exames: i.paciente.exames.join(', '),
    'Qtd. exames': i.paciente.exames.length,
    'Procedimentos fora das listas': i.paciente.foraDasListas,
    'Custo (R$)': Math.round(i.custo * 100) / 100,
  }));

export function exportarExcel(r: Resultado, regras: Regras, descricaoRegras: [string, string][]) {
  const wb = XLSX.utils.book_new();
  const resumo: (string | number)[][] = [
    ['Cenário de orçamento — Fila Eletrônica de Exames Laboratoriais'],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
    [],
    ...descricaoRegras,
    [],
    ['Pacientes contemplados', r.contemplados.length],
    ['Custo dos contemplados (R$)', Math.round(r.custoContemplados * 100) / 100],
    ['Sobra do orçamento (R$)', r.sobra === null ? '' : Math.round(r.sobra * 100) / 100],
    ['Elegíveis não contemplados', r.naoContemplados.length],
    ['Custo para atender os não contemplados (R$)', Math.round(r.custoNaoContemplados * 100) / 100],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), 'Cenário');
  const aba = (xs: ItemFila[]) =>
    xs.length ? XLSX.utils.json_to_sheet(linhas(xs)) : XLSX.utils.aoa_to_sheet([['Nenhum paciente nesta lista']]);
  XLSX.utils.book_append_sheet(wb, aba(r.contemplados), 'Contemplados');
  XLSX.utils.book_append_sheet(wb, aba(r.naoContemplados), 'Não contemplados');
  const hoje = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `cenario-orcamento-exames-${hoje}.xlsx`);
  void regras;
}
