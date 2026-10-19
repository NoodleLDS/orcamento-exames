// Gera a base consolidada a partir do JSON de parse-node.ts e confere a ida e volta.
// Uso: npx tsx scripts/gerar-base.ts <relatorios.json> <saida.xlsx>
import fs from 'node:fs';
import * as XLSX from 'xlsx';
import type { Relatorio } from '../src/core/parseRelatorio';
import { lerBase, montarBase } from '../src/lib/base';

const [entrada, saida] = process.argv.slice(2);
const rs: Relatorio[] = JSON.parse(fs.readFileSync(entrada, 'utf8'));
const buf: Uint8Array = XLSX.write(montarBase(rs), { type: 'buffer', bookType: 'xlsx', compression: true });
fs.writeFileSync(saida, buf);
const volta = lerBase(buf);
const chave = (r: Relatorio[]) =>
  JSON.stringify(r.flatMap((x) => x.linhas).map((l) => [l.exame, l.prontuario, l.idadeAnos, l.dataCadastro, l.dataSolicitada, l.totalProcedimentos, l.cns]).sort());
console.log('relatórios', rs.length, '→', volta.length, '| linhas', rs.flatMap((r) => r.linhas).length, '→', volta.flatMap((r) => r.linhas).length);
console.log('ida e volta idêntica:', chave(rs) === chave(volta), '| avisos:', volta.flatMap((r) => r.avisos).length, '|', (buf.length / 1e6).toFixed(1), 'MB');
