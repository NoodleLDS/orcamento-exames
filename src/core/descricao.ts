// Frase que descreve o cenário em português claro, para a tela, o Excel e a impressão.
import type { Regras, Resultado } from './simulacao';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const br = (iso: string) => iso.split('-').reverse().join('/');
const n = (v: number) => v.toLocaleString('pt-BR');

export function descreverCenario(regras: Regras, r: Resultado, totalExames: number): string {
  const partes: string[] = [];
  partes.push(regras.orcamento !== null ? `Com ${brl(regras.orcamento)}` : 'Sem orçamento definido');
  const qtd = regras.examesMarcados.length;
  partes.push(qtd === totalExames ? `comprando todos os ${qtd} exames` : `comprando ${qtd} de ${totalExames} exames`);

  const quem: string[] = [];
  const { idadeMin: a, idadeMax: b } = regras;
  if (a !== null && b !== null) quem.push(`de ${a} a ${b} anos`);
  else if (a !== null) quem.push(`com ${a} anos ou mais`);
  else if (b !== null) quem.push(`com até ${b} anos`);
  if (regras.inclusaoDe && regras.inclusaoAte) quem.push(`que entraram na fila entre ${br(regras.inclusaoDe)} e ${br(regras.inclusaoAte)}`);
  else if (regras.inclusaoDe) quem.push(`que entraram na fila a partir de ${br(regras.inclusaoDe)}`);
  else if (regras.inclusaoAte) quem.push(`que entraram na fila até ${br(regras.inclusaoAte)}`);
  if (regras.solicitadaAte) quem.push(`com exame pedido para até ${br(regras.solicitadaAte)}`);
  if (regras.exigirPedidoCompleto) quem.push('com o pedido inteiro nas listas');
  partes.push(quem.length ? `para pacientes ${quem.join(', ')}` : 'para toda a fila');

  const crit = (c: 'data' | 'idade') =>
    c === 'data'
      ? regras.dataMaisAntigosPrimeiro ? 'quem está há mais tempo na fila' : 'quem entrou na fila mais recentemente'
      : regras.idadeMaisVelhosPrimeiro ? 'os mais velhos' : 'os mais novos';
  const faixas = regras.faixasPrioritarias.length
    ? `as faixas ${regras.faixasPrioritarias.map((f) => `${f.min}–${f.max} anos`).join(', depois ')}, e dentro delas `
    : '';
  partes.push(`atendendo primeiro ${faixas}${crit(regras.ordem[0])} (no empate, ${crit(regras.ordem[1])})`);

  let fim: string;
  if (regras.orcamento === null || r.precosFaltando.length) fim = `${n(r.elegiveis)} pacientes podem entrar.`;
  else {
    const nec = r.custoContemplados + r.custoNaoContemplados;
    const saldo = regras.orcamento - nec;
    fim = `${n(r.contemplados.length)} de ${n(r.elegiveis)} pacientes são atendidos por completo (${brl(r.custoContemplados)}). ${
      saldo < 0 ? `Para atender todos faltariam ${brl(-saldo)}.` : `Sobram ${brl(saldo)}.`
    }`;
  }
  return `${partes.join(', ')}: ${fim}`;
}
