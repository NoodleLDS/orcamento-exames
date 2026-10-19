import type { Resultado } from '../core/simulacao';
import { dataBR, inteiro, pct, reais } from '../lib/formato';

// Duas séries, cores validadas (lightness, chroma, daltonismo, contraste) no fundo claro.
const COR_SIM = '#a8203a'; // contemplados (carmim)
const COR_NAO = '#c39226'; // não contemplados (ouro)

type Par = { rotulo: string; sim: number; nao: number };

function Legenda({ semOrcamento }: { semOrcamento: boolean }) {
  if (semOrcamento) return null;
  return (
    <div className="legenda">
      <span><i style={{ background: COR_SIM }} /> Contemplados</span>
      <span><i style={{ background: COR_NAO }} /> Não contemplados</span>
    </div>
  );
}

/** Barra única: orçamento × custo de atender todos os elegíveis. */
function BarraOrcamento({ r, orcamento }: { r: Resultado; orcamento: number }) {
  const necessidade = r.custoContemplados + r.custoNaoContemplados;
  const escala = Math.max(orcamento, necessidade) || 1;
  const w = (v: number) => `${(v / escala) * 100}%`;
  const deficit = necessidade - orcamento;
  return (
    <div className="g-orc">
      <div className="g-orc-trilho">
        <div className="g-seg" style={{ width: w(r.custoContemplados), background: COR_SIM }} title={`Contemplados: ${reais(r.custoContemplados)}`} />
        <div className="g-seg" style={{ width: w(r.custoNaoContemplados), background: COR_NAO }} title={`Não contemplados: ${reais(r.custoNaoContemplados)}`} />
        <div className="g-marca" style={{ left: w(orcamento) }} title={`Orçamento: ${reais(orcamento)}`}>
          <span>Orçamento {reais(orcamento)}</span>
        </div>
      </div>
      <div className="g-orc-rotulos">
        <span><b>{reais(r.custoContemplados)}</b> atende {inteiro(r.contemplados.length)} pacientes</span>
        {deficit > 0 ? (
          <span className="g-deficit">Faltam <b>{reais(deficit)}</b> para atender todos os {inteiro(r.elegiveis)} elegíveis</span>
        ) : (
          <span>Sobram <b>{reais(-deficit)}</b> depois de atender todos os elegíveis</span>
        )}
      </div>
    </div>
  );
}

function BarrasHorizontais({ dados, semOrcamento, unidade, curto }: { dados: Par[]; semOrcamento: boolean; unidade: string; curto?: boolean }) {
  const max = Math.max(1, ...dados.map((d) => d.sim + d.nao));
  return (
    <div className={`g-hbarras ${curto ? 'curto' : ''}`}>
      {dados.map((d) => {
        const tot = d.sim + d.nao;
        return (
          <div key={d.rotulo} className="g-hlinha" title={semOrcamento ? `${d.rotulo}: ${inteiro(tot)} ${unidade}` : `${d.rotulo}: ${inteiro(d.sim)} contemplados, ${inteiro(d.nao)} não (${pct(d.sim, tot)} atendido)`}>
            <span className="g-hrot">{d.rotulo}</span>
            <div className="g-htrilho">
              <div className="g-seg" style={{ width: `${(d.sim / max) * 100}%`, background: COR_SIM }} />
              <div className="g-seg" style={{ width: `${(d.nao / max) * 100}%`, background: semOrcamento ? '#b8b0ab' : COR_NAO }} />
            </div>
            <span className="g-hval">{semOrcamento ? inteiro(tot) : `${inteiro(d.sim)} / ${inteiro(tot)}`}</span>
          </div>
        );
      })}
    </div>
  );
}

function Colunas({ dados, semOrcamento }: { dados: Par[]; semOrcamento: boolean }) {
  const max = Math.max(1, ...dados.map((d) => d.sim + d.nao));
  return (
    <div className="g-colunas">
      {dados.map((d, i) => (
        <div
          key={d.rotulo}
          className={`g-coluna ${dados.length > 10 && i % 2 && i !== dados.length - 1 ? 'sem-rotulo' : ''}`}
          title={semOrcamento ? `${d.rotulo}: ${inteiro(d.sim + d.nao)} elegíveis` : `${d.rotulo}: ${inteiro(d.sim)} contemplados, ${inteiro(d.nao)} não`}
        >
          <div className="g-pilha">
            <div className="g-seg" style={{ height: `${(d.nao / max) * 100}%`, background: semOrcamento ? '#b8b0ab' : COR_NAO }} />
            <div className="g-seg" style={{ height: `${(d.sim / max) * 100}%`, background: COR_SIM }} />
          </div>
          <span>{d.rotulo}</span>
        </div>
      ))}
    </div>
  );
}

const FAIXAS: [string, number, number][] = [
  ['0–17', 0, 18], ['18–39', 18, 40], ['40–59', 40, 60], ['60–79', 60, 80], ['80+', 80, 200],
];

export function Graficos({ r, orcamento }: { r: Resultado; orcamento: number | null }) {
  const semOrcamento = orcamento === null || r.precosFaltando.length > 0;
  if (!r.elegiveis) return null;

  const faixas: Par[] = FAIXAS.map(([rotulo, a, b]) => {
    const dentro = (x: { paciente: { idadeAnos: number } }) => x.paciente.idadeAnos >= a && x.paciente.idadeAnos < b;
    return { rotulo, sim: r.contemplados.filter(dentro).length, nao: r.naoContemplados.filter(dentro).length };
  }).filter((f) => f.sim + f.nao > 0);

  const porMes = new Map<string, Par>();
  const somaMes = (lista: typeof r.contemplados, campo: 'sim' | 'nao') => {
    for (const i of lista) {
      const k = i.paciente.dataInclusao.slice(0, 7);
      const p = porMes.get(k) ?? { rotulo: k, sim: 0, nao: 0 };
      p[campo]++;
      porMes.set(k, p);
    }
  };
  somaMes(r.contemplados, 'sim');
  somaMes(r.naoContemplados, 'nao');
  const meses = [...porMes.values()].sort((a, b) => a.rotulo.localeCompare(b.rotulo)).map((m) => ({ ...m, rotulo: `${m.rotulo.slice(5)}/${m.rotulo.slice(2, 4)}` }));
  const ultimaData = r.contemplados.reduce((m, i) => (i.paciente.dataInclusao > m ? i.paciente.dataInclusao : m), '');

  const porExame = new Map<string, Par>();
  for (const [lista, campo] of [[r.contemplados, 'sim'], [r.naoContemplados, 'nao']] as const)
    for (const i of lista)
      for (const e of i.paciente.exames) {
        const p = porExame.get(e) ?? { rotulo: e, sim: 0, nao: 0 };
        p[campo]++;
        porExame.set(e, p);
      }
  const exames = [...porExame.values()].sort((a, b) => b.sim + b.nao - (a.sim + a.nao));
  const totalExamesSim = exames.reduce((s, e) => s + e.sim, 0);

  return (
    <section className="graficos">
      {!semOrcamento && orcamento !== null && (
        <div className="card">
          <h2>Orçamento × custo para atender todos os elegíveis</h2>
          <BarraOrcamento r={r} orcamento={orcamento} />
        </div>
      )}
      <div className="duas-g">
        <div className="card">
          <h2>{semOrcamento ? 'Elegíveis por faixa etária' : 'Atendimento por faixa etária'}</h2>
          <Legenda semOrcamento={semOrcamento} />
          <BarrasHorizontais dados={faixas} semOrcamento={semOrcamento} unidade="pacientes" curto />
        </div>
        <div className="card">
          <h2>{semOrcamento ? 'Elegíveis por mês de inclusão' : 'Atendimento por mês de inclusão na fila'}</h2>
          <Legenda semOrcamento={semOrcamento} />
          <Colunas dados={meses} semOrcamento={semOrcamento} />
          {!semOrcamento && ultimaData && <p className="ajuda">Último contemplado entrou na fila em {dataBR(ultimaData)}.</p>}
        </div>
      </div>
      <div className="card">
        <h2>{semOrcamento ? 'Exames dos elegíveis' : `Exames realizados com o orçamento: ${inteiro(totalExamesSim)}`}</h2>
        <Legenda semOrcamento={semOrcamento} />
        <BarrasHorizontais dados={exames} semOrcamento={semOrcamento} unidade="exames" />
      </div>
    </section>
  );
}
