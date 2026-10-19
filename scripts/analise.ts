// Números agregados (sem nomes) a partir do JSON gerado por parse-node.ts
import fs from 'node:fs';
import type { Relatorio } from '../src/core/parseRelatorio';
import { agruparPacientes, custoPaciente } from '../src/core/pacientes';
import { painel, REGRAS_PADRAO, simular } from '../src/core/simulacao';
import { PRECOS_CISALP, QTD_TABELA_CISALP } from '../src/core/precos';

const rs: Relatorio[] = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const linhas = rs.flatMap((r) => r.linhas);
const ps = agruparPacientes(linhas);
const f = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
console.log('linhas', f(linhas.length), '| pacientes', f(ps.length));
console.log('nomes curtos:', [...new Set(ps.flatMap((p) => p.exames))].length);
let tot = 0;
for (const l of painel(ps, PRECOS_CISALP)) {
  tot += l.custo ?? 0;
  const q = QTD_TABELA_CISALP[l.exame];
  console.log(`${l.exame.padEnd(32)} ${String(l.pacientes).padStart(6)}  tabela ${q ?? '-'}  dif ${q ? f(((l.pacientes - q) / q) * 100) + '%' : ''}  custo ${f(l.custo ?? NaN)}`);
}
console.log('CUSTO ZERAR (todos 26):', f(tot));
const so21 = painel(ps, PRECOS_CISALP).filter((l) => QTD_TABELA_CISALP[l.exame] !== undefined).reduce((s, l) => s + (l.custo ?? 0), 0);
console.log('CUSTO ZERAR (21 da tabela, qtd PDF):', f(so21));
const fora = ps.filter((p) => p.foraDasListas > 0);
console.log('pacientes com proc fora das listas', fora.length, f((fora.length / ps.length) * 100) + '%');
const dist = new Map<number, number>();
for (const p of fora) dist.set(Math.min(p.foraDasListas, 6), (dist.get(Math.min(p.foraDasListas, 6)) ?? 0) + 1);
console.log('dist fora', [...dist].sort((a, b) => a[0] - b[0]));
const negs = linhas.length; void negs;
const custos = ps.map((p) => custoPaciente(p, PRECOS_CISALP)).sort((a, b) => a - b);
console.log('custo por paciente: mediana', f(custos[custos.length >> 1]), 'max', f(custos[custos.length - 1]));
const ex = ps.map((p) => p.exames.length).sort((a, b) => a - b);
console.log('exames por paciente: mediana', ex[ex.length >> 1]);
const todos = painel(ps, {}).map((l) => l.exame);
for (const orc of [1_000_000, 1_053_285.28]) {
  const r = simular(ps, PRECOS_CISALP, { ...REGRAS_PADRAO, examesMarcados: todos, orcamento: orc });
  console.log(`orc ${f(orc)}: contemplados ${r.contemplados.length} custo ${f(r.custoContemplados)} sobra ${f(r.sobra!)} nao ${r.naoContemplados.length} falta ${f(r.custoNaoContemplados)}`);
  const ult = r.contemplados[r.contemplados.length - 1]?.paciente.dataInclusao;
  console.log('   ultimo contemplado incluido em', ult);
}
const t21 = todos.filter((e) => QTD_TABELA_CISALP[e] !== undefined);
const r21 = simular(ps, PRECOS_CISALP, { ...REGRAS_PADRAO, examesMarcados: t21, orcamento: 1_000_000 });
console.log(`só 21 marcados, 1M: elegiveis ${r21.elegiveis} foraExame ${r21.foraPorExame} contemplados ${r21.contemplados.length} sobra ${f(r21.sobra!)}`);
const rc = simular(ps, PRECOS_CISALP, { ...REGRAS_PADRAO, examesMarcados: todos, orcamento: 1_000_000, exigirPedidoCompleto: true });
console.log(`pedido completo, todos: elegiveis ${rc.elegiveis}`);
console.log('solicitada futura (>2026-10-19):', ps.filter((p) => p.dataSolicitadaMax > '2026-10-19').length);
console.log('idade em meses:', ps.filter((p) => p.idadeTexto.endsWith('M')).length, '| <18:', ps.filter((p) => p.idadeAnos < 18).length);
