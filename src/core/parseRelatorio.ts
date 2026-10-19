// Lê o relatório "Pacientes na Fila Aguardando Agendamento" (Sistema de Fila Eletrônica / Codiub)
// a partir dos itens de texto que o pdf.js devolve. Função pura: não depende de pdf.js nem do navegador.

export type TextItem = { str: string; x: number; y: number };

export type LinhaFila = {
  exame: string;
  prontuario: string;
  nome: string;
  idadeAnos: number; // idade em anos (meses/dias viram fração)
  idadeTexto: string; // como veio no relatório, ex.: "82 A", "7 M"
  cns: string;
  dataCadastro: string; // ISO yyyy-mm-dd
  dataSolicitada: string; // ISO yyyy-mm-dd
  risco: string;
  unidadeSolicitada: string;
  totalProcedimentos: number | null;
};

export type Relatorio = {
  exame: string;
  totalDeclarado: number | null;
  geradoEm: string;
  linhas: LinhaFila[];
  avisos: string[];
};

const RE_REGISTRO = /^\s*(\d+\/\d+)\s+-\s+(.*)$/;
const RE_IDADE = /^\s*(\d+)\s*([AMD])\s*$/;
const RE_DATA = /^\s*(\d{2})\/(\d{2})\/(\d{4})\s*$/;

function isoData(s: string): string | null {
  const m = RE_DATA.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function idadeEmAnos(n: number, u: string): number {
  if (u === 'M') return n / 12;
  if (u === 'D') return n / 365;
  return n;
}

// Colunas do relatório (coordenada x em pontos PDF). Larguras folgadas de propósito.
const X_IDADE: [number, number] = [215, 262];
const X_CADASTRO: [number, number] = [460, 512];
const X_SOLICITADA: [number, number] = [513, 570];

const dentro = (x: number, [a, b]: [number, number]) => x >= a && x <= b;

export function parseRelatorio(paginas: TextItem[][], nomeArquivo = ''): Relatorio {
  let exame = '';
  let totalDeclarado: number | null = null;
  let geradoEm = '';
  const linhas: LinhaFila[] = [];
  const avisos: string[] = [];

  for (const itens of paginas) {
    let atual: (LinhaFila & { y: number }) | null = null;

    for (const it of itens) {
      const s = it.str.trim();
      if (!s) continue;

      if (!exame && s.startsWith('Procedimento:')) exame = s.replace('Procedimento:', '').trim();
      if (totalDeclarado === null && s.startsWith('Total de Pacientes:')) {
        totalDeclarado = Number(s.replace(/\D/g, ''));
        continue;
      }
      if (!geradoEm && /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(s)) geradoEm = s;

      const reg = RE_REGISTRO.exec(s);
      if (reg && it.x < 60) {
        atual = {
          exame: '',
          prontuario: reg[1],
          nome: reg[2].trim(),
          idadeAnos: NaN,
          idadeTexto: '',
          cns: '',
          dataCadastro: '',
          dataSolicitada: '',
          risco: '',
          unidadeSolicitada: '',
          totalProcedimentos: null,
          y: it.y,
        };
        linhas.push(atual);
        continue;
      }
      if (!atual) continue;

      const mesmaLinha = Math.abs(it.y - atual.y) < 3;
      if (mesmaLinha) {
        const id = RE_IDADE.exec(s);
        if (id && dentro(it.x, X_IDADE)) {
          atual.idadeTexto = `${id[1]} ${id[2]}`;
          atual.idadeAnos = idadeEmAnos(Number(id[1]), id[2]);
          continue;
        }
        const d = isoData(s);
        if (d && dentro(it.x, X_CADASTRO)) atual.dataCadastro = d;
        else if (d && dentro(it.x, X_SOLICITADA)) atual.dataSolicitada = d;
        continue;
      }
      if (s.startsWith('CNS:')) atual.cns = s.replace('CNS:', '').replace(/\D/g, '');
      else if (s.startsWith('Unid. Solicitada:')) atual.unidadeSolicitada = s.replace('Unid. Solicitada:', '').trim();
      else if (s.includes('Prioridade/Grau de Risco:')) atual.risco = s.split('Prioridade/Grau de Risco:')[1].trim();
      else if (s.startsWith('Total de Procedimentos:')) atual.totalProcedimentos = Number(s.replace(/\D/g, ''));
    }
  }

  for (const l of linhas) {
    l.exame = exame;
    delete (l as Partial<LinhaFila & { y: number }>).y;
    const faltando = [
      !l.idadeTexto && 'idade',
      !l.dataCadastro && 'data de cadastro',
      !l.cns && 'CNS',
    ].filter(Boolean);
    if (faltando.length) avisos.push(`${nomeArquivo}: prontuário ${l.prontuario} sem ${faltando.join(', ')}`);
  }
  if (!exame) avisos.push(`${nomeArquivo}: não encontrei o nome do procedimento no cabeçalho`);
  if (totalDeclarado !== null && totalDeclarado !== linhas.length) {
    avisos.push(
      `${nomeArquivo}: o relatório diz ${totalDeclarado} pacientes, mas li ${linhas.length}. Confira se o PDF está completo.`,
    );
  }
  return { exame, totalDeclarado, geradoEm, linhas, avisos };
}
