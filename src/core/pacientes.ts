import type { LinhaFila } from './parseRelatorio';
import { nomeCurto } from './exames';

export type Paciente = {
  prontuario: string;
  nome: string;
  cns: string;
  idadeAnos: number;
  idadeTexto: string;
  exames: string[]; // nomes curtos, ordenados
  dataInclusao: string; // data de cadastro mais antiga entre os exames (ISO)
  dataSolicitadaMax: string; // maior "data solicitada" entre os exames (ISO)
  pedidos: number; // quantas datas de cadastro diferentes
  totalProcedimentos: number; // soma do "Total de Procedimentos" de cada pedido
  foraDasListas: number; // procedimentos do pedido que não estão em nenhuma lista carregada
};

/** Junta as linhas de todos os relatórios pelo prontuário. */
export function agruparPacientes(linhas: LinhaFila[]): Paciente[] {
  const porPront = new Map<string, LinhaFila[]>();
  for (const l of linhas) {
    const lista = porPront.get(l.prontuario);
    if (lista) lista.push(l);
    else porPront.set(l.prontuario, [l]);
  }

  const pacientes: Paciente[] = [];
  for (const [prontuario, ls] of porPront) {
    const exames = [...new Set(ls.map((l) => nomeCurto(l.exame)))].sort();

    // Um "pedido" = mesma data de cadastro. O Total de Procedimentos vem por pedido.
    const pedidos = new Map<string, { vistos: Set<string>; total: number }>();
    for (const l of ls) {
      const p = pedidos.get(l.dataCadastro) ?? { vistos: new Set(), total: 0 };
      p.vistos.add(l.exame);
      p.total = Math.max(p.total, l.totalProcedimentos ?? 0);
      pedidos.set(l.dataCadastro, p);
    }
    let total = 0;
    let fora = 0;
    for (const p of pedidos.values()) {
      total += p.total;
      fora += Math.max(0, p.total - p.vistos.size);
    }

    const datasCad = ls.map((l) => l.dataCadastro).filter(Boolean).sort();
    const datasSol = ls.map((l) => l.dataSolicitada).filter(Boolean).sort();
    const maisVelha = ls.reduce((a, b) => (b.idadeAnos > a.idadeAnos ? b : a));

    pacientes.push({
      prontuario,
      nome: ls[0].nome,
      cns: ls.find((l) => l.cns)?.cns ?? '',
      idadeAnos: maisVelha.idadeAnos,
      idadeTexto: maisVelha.idadeTexto,
      exames,
      dataInclusao: datasCad[0] ?? '',
      dataSolicitadaMax: datasSol[datasSol.length - 1] ?? '',
      pedidos: pedidos.size,
      totalProcedimentos: total,
      foraDasListas: fora,
    });
  }
  return pacientes;
}

export type Precos = Record<string, number | undefined>;

export function custoPaciente(p: Paciente, precos: Precos): number {
  let s = 0;
  for (const e of p.exames) s += precos[e] ?? NaN;
  return s;
}
