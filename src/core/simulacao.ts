import { custoPaciente, type Paciente, type Precos } from './pacientes';

export type Criterio = 'data' | 'idade';

export type FaixaPrioritaria = { min: number; max: number };

export type Regras = {
  examesMarcados: string[];
  exigirPedidoCompleto: boolean; // só entra quem não tem procedimento fora das listas carregadas
  idadeMin: number | null;
  idadeMax: number | null;
  inclusaoDe: string | null; // ISO
  inclusaoAte: string | null; // ISO
  solicitadaAte: string | null; // ISO — exclui pedidos com data solicitada depois disso
  ordem: [Criterio, Criterio];
  dataMaisAntigosPrimeiro: boolean;
  idadeMaisVelhosPrimeiro: boolean;
  faixasPrioritarias: FaixaPrioritaria[];
  orcamento: number | null;
  modoOrcamento: 'parar' | 'pular';
};

export const REGRAS_PADRAO: Omit<Regras, 'examesMarcados'> = {
  exigirPedidoCompleto: false,
  idadeMin: null,
  idadeMax: null,
  inclusaoDe: null,
  inclusaoAte: null,
  solicitadaAte: null,
  ordem: ['data', 'idade'],
  dataMaisAntigosPrimeiro: true,
  idadeMaisVelhosPrimeiro: true,
  faixasPrioritarias: [],
  orcamento: null,
  modoOrcamento: 'parar',
};

/** O pacote do paciente cabe inteiro nos exames marcados? */
export function cabeNosMarcados(p: Paciente, marcados: Set<string>): boolean {
  return p.exames.every((e) => marcados.has(e));
}

export function passaFiltros(p: Paciente, r: Regras): boolean {
  if (r.idadeMin !== null && p.idadeAnos < r.idadeMin) return false;
  if (r.idadeMax !== null && p.idadeAnos >= r.idadeMax + 1) return false; // "até 59" inclui 59 anos e 11 meses
  if (r.inclusaoDe && p.dataInclusao < r.inclusaoDe) return false;
  if (r.inclusaoAte && p.dataInclusao > r.inclusaoAte) return false;
  if (r.solicitadaAte && p.dataSolicitadaMax > r.solicitadaAte) return false;
  if (r.exigirPedidoCompleto && p.foraDasListas > 0) return false;
  return true;
}

function faixaDe(p: Paciente, faixas: FaixaPrioritaria[]): number {
  const i = faixas.findIndex((f) => p.idadeAnos >= f.min && p.idadeAnos < f.max + 1);
  return i === -1 ? faixas.length : i;
}

export function ordenar(ps: Paciente[], r: Regras): Paciente[] {
  const cmp = (c: Criterio, a: Paciente, b: Paciente) => {
    if (c === 'data') {
      const d = a.dataInclusao.localeCompare(b.dataInclusao);
      return r.dataMaisAntigosPrimeiro ? d : -d;
    }
    const d = a.idadeAnos - b.idadeAnos;
    return r.idadeMaisVelhosPrimeiro ? -d : d;
  };
  return [...ps].sort(
    (a, b) =>
      faixaDe(a, r.faixasPrioritarias) - faixaDe(b, r.faixasPrioritarias) ||
      cmp(r.ordem[0], a, b) ||
      cmp(r.ordem[1], a, b) ||
      a.prontuario.localeCompare(b.prontuario),
  );
}

export type ItemFila = { paciente: Paciente; custo: number; posicao: number };

export type Resultado = {
  elegiveis: number;
  foraPorExame: number; // têm algum exame não marcado
  foraPorFiltro: number;
  contemplados: ItemFila[];
  naoContemplados: ItemFila[];
  custoContemplados: number;
  custoNaoContemplados: number;
  sobra: number | null;
  precosFaltando: string[];
};

export function simular(pacientes: Paciente[], precos: Precos, r: Regras): Resultado {
  const marcados = new Set(r.examesMarcados);
  const precosFaltando = r.examesMarcados.filter((e) => !(Number.isFinite(precos[e]) && (precos[e] as number) >= 0));

  let foraPorExame = 0;
  let foraPorFiltro = 0;
  const elegiveis: Paciente[] = [];
  for (const p of pacientes) {
    if (!cabeNosMarcados(p, marcados)) foraPorExame++;
    else if (!passaFiltros(p, r)) foraPorFiltro++;
    else elegiveis.push(p);
  }

  const fila = ordenar(elegiveis, r).map((p, i) => ({ paciente: p, custo: custoPaciente(p, precos), posicao: i + 1 }));

  const contemplados: ItemFila[] = [];
  const naoContemplados: ItemFila[] = [];
  let gasto = 0;
  if (r.orcamento === null || precosFaltando.length) {
    naoContemplados.push(...fila);
  } else {
    let parou = false;
    for (const it of fila) {
      if (!parou && gasto + it.custo <= r.orcamento + 1e-9) {
        contemplados.push(it);
        gasto += it.custo;
      } else {
        naoContemplados.push(it);
        if (r.modoOrcamento === 'parar') parou = true;
      }
    }
  }
  const soma = (xs: ItemFila[]) => xs.reduce((s, x) => s + x.custo, 0);
  return {
    elegiveis: elegiveis.length,
    foraPorExame,
    foraPorFiltro,
    contemplados,
    naoContemplados,
    custoContemplados: soma(contemplados),
    custoNaoContemplados: soma(naoContemplados),
    sobra: r.orcamento === null || precosFaltando.length ? null : r.orcamento - gasto,
    precosFaltando,
  };
}

export type LinhaPainel = { exame: string; pacientes: number; preco: number | undefined; custo: number | null };

/** Panorama sem filtro: quantos aguardam cada exame e quanto custa zerar. */
export function painel(pacientes: Paciente[], precos: Precos): LinhaPainel[] {
  const cont = new Map<string, number>();
  for (const p of pacientes) for (const e of p.exames) cont.set(e, (cont.get(e) ?? 0) + 1);
  return [...cont.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([exame, n]) => {
      const preco = precos[exame];
      return { exame, pacientes: n, preco, custo: Number.isFinite(preco) ? n * (preco as number) : null };
    });
}
