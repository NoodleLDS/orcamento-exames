import { describe, expect, it } from 'vitest';
import type { LinhaFila } from './parseRelatorio';
import { agruparPacientes } from './pacientes';
import { REGRAS_PADRAO, simular, type Regras } from './simulacao';

const linha = (prontuario: string, exame: string, extra: Partial<LinhaFila> = {}): LinhaFila => ({
  exame,
  prontuario,
  nome: prontuario,
  idadeAnos: 50,
  idadeTexto: '50 A',
  cns: prontuario,
  dataCadastro: '2026-01-10',
  dataSolicitada: '2026-01-10',
  risco: '',
  unidadeSolicitada: '',
  totalProcedimentos: null,
  ...extra,
});

const HEMO = 'Hemograma completo';
const GLIC = 'Dosagem De Hemoglobina Glicosilada';
const TG = 'Dosagem De Triglicerideos';

const linhas: LinhaFila[] = [
  linha('lucas', HEMO), linha('lucas', GLIC),
  linha('ze', HEMO), linha('ze', GLIC), linha('ze', TG),
  linha('maria', HEMO, { idadeAnos: 80, dataCadastro: '2025-06-01' }),
];
const precos = { Hemograma: 4, 'Hemoglobina glicada': 7, 'Triglicerídeos': 3 };
const regras = (r: Partial<Regras> = {}): Regras => ({
  ...REGRAS_PADRAO,
  examesMarcados: ['Hemograma', 'Hemoglobina glicada'],
  ...r,
});

describe('elegibilidade', () => {
  const ps = agruparPacientes(linhas);

  it('entra quem tem o pacote inteiro dentro dos marcados; seu Zé fica de fora', () => {
    const r = simular(ps, precos, regras());
    const nomes = r.naoContemplados.map((i) => i.paciente.prontuario).sort();
    expect(nomes).toEqual(['lucas', 'maria']);
    expect(r.foraPorExame).toBe(1);
  });

  it('orçamento para no primeiro que não cabe, respeitando a ordem', () => {
    // ordem por data: maria (2025) primeiro, custo 4; lucas custo 11
    const r = simular(ps, precos, regras({ orcamento: 10 }));
    expect(r.contemplados.map((i) => i.paciente.prontuario)).toEqual(['maria']);
    expect(r.sobra).toBe(6);
  });

  it('modo pular continua procurando quem cabe na sobra', () => {
    const r = simular(ps, precos, regras({ orcamento: 11, ordem: ['idade', 'data'], idadeMaisVelhosPrimeiro: false }));
    // lucas (50) primeiro custa 11 → cabe; maria 4 não cabe mais
    expect(r.contemplados.map((i) => i.paciente.prontuario)).toEqual(['lucas']);
  });

  it('filtro de idade "até 59" inclui quem tem 59', () => {
    const p = agruparPacientes([linha('a', HEMO, { idadeAnos: 59 }), linha('b', HEMO, { idadeAnos: 60 })]);
    const r = simular(p, precos, regras({ idadeMax: 59 }));
    expect(r.elegiveis).toBe(1);
  });

  it('sem preço configurado não simula orçamento', () => {
    const r = simular(ps, { Hemograma: 4 }, regras({ orcamento: 100 }));
    expect(r.precosFaltando).toEqual(['Hemoglobina glicada']);
    expect(r.contemplados).toHaveLength(0);
  });
});

describe('agrupamento', () => {
  it('usa a data de cadastro mais antiga e conta procedimentos fora das listas', () => {
    const [p] = agruparPacientes([
      linha('x', HEMO, { dataCadastro: '2026-03-01', totalProcedimentos: 5 }),
      linha('x', TG, { dataCadastro: '2026-03-01', totalProcedimentos: 5 }),
      linha('x', GLIC, { dataCadastro: '2025-12-01', totalProcedimentos: 1 }),
    ]);
    expect(p.dataInclusao).toBe('2025-12-01');
    expect(p.pedidos).toBe(2);
    expect(p.foraDasListas).toBe(3);
  });

  it('exigir pedido completo tira quem tem procedimento fora das listas', () => {
    const ps = agruparPacientes([
      linha('a', HEMO, { totalProcedimentos: 1 }),
      linha('b', HEMO, { totalProcedimentos: 4 }),
    ]);
    const r = simular(ps, precos, regras({ exigirPedidoCompleto: true }));
    expect(r.elegiveis).toBe(1);
  });
});
