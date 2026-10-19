import { useEffect, useMemo, useState } from 'react';
import type { Relatorio } from './core/parseRelatorio';
import { agruparPacientes, type Precos } from './core/pacientes';
import { painel, REGRAS_PADRAO, type Regras } from './core/simulacao';
import { ORIGEM_PRECO, PRECOS_CISALP, QTD_TABELA_CISALP } from './core/precos';
import { lerRelatorioPdf } from './lib/lerPdf';
import { baixarBase, lerBase } from './lib/base';
import { Num } from './ui/Num';
import { Simulador, type Cenario } from './ui/Simulador';
import { dataBR, inteiro, lerValor, pct, reais, valorParaCampo } from './lib/formato';
import './App.css';

type Aba = 'carregar' | 'panorama' | 'simulador' | 'valores';
const CHAVE_PRECOS = 'orcamento-exames:precos:v1';

function carregarPrecos(): Precos {
  try {
    const s = localStorage.getItem(CHAVE_PRECOS);
    if (s) return { ...PRECOS_CISALP, ...JSON.parse(s) };
  } catch {
    /* navegador sem armazenamento: segue com o padrão */
  }
  return { ...PRECOS_CISALP };
}
function salvarPrecos(p: Precos) {
  try {
    localStorage.setItem(CHAVE_PRECOS, JSON.stringify(p));
  } catch {
    /* ignora */
  }
}

export default function App() {
  const [aba, setAba] = useState<Aba>('carregar');
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [precos, setPrecosState] = useState<Precos>(carregarPrecos);
  const setPrecos = (p: Precos) => {
    setPrecosState(p);
    salvarPrecos(p);
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [aba]);

  const pacientes = useMemo(() => agruparPacientes(relatorios.flatMap((r) => r.linhas)), [relatorios]);
  const temDados = pacientes.length > 0;
  const exames = useMemo(() => painel(pacientes, {}).map((l) => l.exame), [pacientes]);
  const [regras, setRegras] = useState<Regras>({ ...REGRAS_PADRAO, examesMarcados: [] });
  const [conhecidos, setConhecidos] = useState<string[]>([]);
  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [apresentacao, setApresentacao] = useState(false);
  // exames que aparecem num novo carregamento entram marcados
  useEffect(() => {
    const novos = exames.filter((e) => !conhecidos.includes(e));
    if (novos.length) {
      setRegras((r) => ({ ...r, examesMarcados: [...r.examesMarcados.filter((e) => exames.includes(e)), ...novos] }));
      setConhecidos(exames);
    }
  }, [exames, conhecidos]);

  return (
    <div className="app">
      <div className="marca-dagua" aria-hidden style={{ backgroundImage: `url(${import.meta.env.BASE_URL}brasao-marca.png)` }} />
      <header className="topo">
       <div className="topo-in">
        <div className="marca">
          <div className="selo" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 3c-3.2 4.6-5.5 7.4-5.5 10.2a5.5 5.5 0 0 0 11 0C17.5 10.4 15.2 7.6 12 3z" fill="#fff" />
              <path d="M9.5 14.5h5" stroke="#f2cf5b" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1>Orçamento da fila de exames</h1>
            <p className="sub">
              Secretaria Municipal de Saúde de <b>Uberaba</b> · Fila Eletrônica de exames laboratoriais
            </p>
          </div>
        </div>
        <nav>
          {(
            [
              ['carregar', 'Arquivos'],
              ['panorama', 'Panorama'],
              ['simulador', 'Simulador'],
              ['valores', 'Valores'],
            ] as [Aba, string][]
          ).map(([k, t]) => (
            <button key={k} className={aba === k ? 'ativa' : ''} onClick={() => setAba(k)} disabled={!temDados && (k === 'panorama' || k === 'simulador')}>
              {t}
            </button>
          ))}
        </nav>
        <label className={`interruptor ${apresentacao ? 'on' : ''}`} title="Esconde nomes e prontuários da tela, para projetar em reunião">
          <input type="checkbox" checked={apresentacao} onChange={(e) => setApresentacao(e.target.checked)} />
          <span className="trilho"><span /></span>
          Modo apresentação
        </label>
       </div>
      </header>
      <main key={aba} className="entra">
        {aba === 'carregar' && <Carregar relatorios={relatorios} setRelatorios={setRelatorios} onPronto={() => setAba('panorama')} />}
        {aba === 'panorama' && temDados && <Panorama relatorios={relatorios} pacientes={pacientes} precos={precos} />}
        {aba === 'simulador' && temDados && (
          <Simulador
            pacientes={pacientes}
            precos={precos}
            regras={regras}
            setRegras={setRegras}
            cenarios={cenarios}
            setCenarios={setCenarios}
            apresentacao={apresentacao}
          />
        )}
        {aba === 'valores' && <Valores precos={precos} setPrecos={setPrecos} exames={[...new Set(pacientes.flatMap((p) => p.exames))]} />}
      </main>
      <footer>
        <p>Os arquivos são lidos só neste computador. Nenhum dado de paciente é enviado ou guardado.</p>
        <p className="aviso-oficial">Ferramenta de apoio à gestão da Fila Eletrônica · Secretaria Municipal de Saúde de Uberaba. Não é um canal oficial da Prefeitura.</p>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ Arquivos */

function Carregar({ relatorios, setRelatorios, onPronto }: { relatorios: Relatorio[]; setRelatorios: (r: Relatorio[]) => void; onPronto: () => void }) {
  const [status, setStatus] = useState<string>('');
  const [progresso, setProgresso] = useState(0);
  const [lendo, setLendo] = useState(false);
  const [erros, setErros] = useState<string[]>([]);

  async function ler(files: FileList | null) {
    if (!files?.length) return;
    setLendo(true);
    setErros([]);
    const novos = [...relatorios];
    const errosLocais: string[] = [];
    const lista = [...files].filter((f) => /\.(pdf|xlsx)$/i.test(f.name));
    const adicionar = (r: Relatorio) => {
      // mesmo procedimento carregado de novo: substitui (evita contar duas vezes)
      const j = novos.findIndex((x) => x.exame === r.exame);
      if (j >= 0) novos[j] = r;
      else novos.push(r);
    };
    for (let i = 0; i < lista.length; i++) {
      const f = lista[i];
      try {
        if (/\.xlsx$/i.test(f.name)) {
          setStatus(`Abrindo base ${f.name}…`);
          setProgresso((i + 0.5) / lista.length);
          await new Promise((ok) => setTimeout(ok, 30)); // deixa a tela mostrar o status
          lerBase(await f.arrayBuffer()).forEach(adicionar);
          continue;
        }
        const r = await lerRelatorioPdf(f, (p, t) => {
          setStatus(`Lendo ${i + 1} de ${lista.length}: ${f.name} — página ${p} de ${t}`);
          setProgresso((i + p / t) / lista.length);
        });
        if (!r.linhas.length) {
          errosLocais.push(`${f.name}: não encontrei pacientes. É o relatório "Pacientes na Fila Aguardando Agendamento"?`);
          continue;
        }
        adicionar(r);
      } catch (e) {
        errosLocais.push(`${f.name}: erro ao ler (${(e as Error).message})`);
      }
    }
    setRelatorios(novos);
    setErros(errosLocais);
    setStatus('');
    setProgresso(0);
    setLendo(false);
  }

  const avisos = relatorios.flatMap((r) => r.avisos);
  return (
    <section className="card">
      <h2>1. Carregue os relatórios da Fila Eletrônica</h2>
      <p>
        Use os PDFs <strong>"Pacientes na Fila Aguardando Agendamento"</strong>, um por exame. Pode selecionar todos de uma vez. Se o mesmo exame vier
        repetido, só a última versão é usada.
      </p>
      <p className="ajuda">
        Já tem a <strong>base consolidada</strong> (.xlsx salva por este app)? Escolha ela aqui: abre em segundos, sem reler os PDFs.
      </p>
      <label className={`drop ${lendo ? 'ocupado' : ''}`}>
        <input
          type="file"
          accept="application/pdf,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          multiple
          disabled={lendo}
          onChange={(e) => {
            ler(e.target.files);
            e.target.value = '';
          }}
        />
        {lendo ? (
          <>
            <span>{status || 'Abrindo…'}</span>
            <div className="progresso"><div style={{ width: `${Math.round(progresso * 100)}%` }} /></div>
            <small>{Math.round(progresso * 100)}%</small>
          </>
        ) : (
          <>
            <span>Clique para escolher os PDFs ou a base (.xlsx)</span>
            <small>Pode selecionar vários arquivos de uma vez</small>
          </>
        )}
      </label>
      {erros.map((e) => (
        <p key={e} className="alerta">{e}</p>
      ))}
      {relatorios.length > 0 && (
        <>
          <table className="tabela compacta">
            <thead>
              <tr>
                <th>Procedimento no relatório</th>
                <th className="n">Total declarado</th>
                <th className="n">Lidos</th>
                <th>Gerado em</th>
              </tr>
            </thead>
            <tbody>
              {[...relatorios].sort((a, b) => a.exame.localeCompare(b.exame)).map((r) => (
                <tr key={r.exame}>
                  <td>{r.exame}</td>
                  <td className="n">{r.totalDeclarado === null ? '—' : inteiro(r.totalDeclarado)}</td>
                  <td className={`n ${r.totalDeclarado !== null && r.totalDeclarado !== r.linhas.length ? 'ruim' : 'bom'}`}>{inteiro(r.linhas.length)}</td>
                  <td>{r.geradoEm}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {avisos.length > 0 && (
            <details className="avisos">
              <summary>{avisos.length} aviso(s) de leitura</summary>
              <ul>{avisos.map((a) => <li key={a}>{a}</li>)}</ul>
            </details>
          )}
          <div className="acoes">
            <button className="primario" onClick={onPronto} disabled={lendo}>Ver panorama</button>
            <button onClick={() => baixarBase(relatorios)} disabled={lendo} title="Um Excel com todas as listas lidas, para abrir rápido da próxima vez">
              Salvar base consolidada
            </button>
            <button onClick={() => setRelatorios([])} disabled={lendo}>Limpar tudo</button>
          </div>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ Panorama */

function Panorama({ relatorios, pacientes, precos }: { relatorios: Relatorio[]; pacientes: ReturnType<typeof agruparPacientes>; precos: Precos }) {
  const linhas = painel(pacientes, precos);
  const custoTotal = pacientes.reduce((s, p) => s + p.exames.reduce((a, e) => a + (precos[e] ?? 0), 0), 0);
  const semPreco = linhas.filter((l) => l.custo === null).map((l) => l.exame);
  const totalExames = linhas.reduce((s, l) => s + l.pacientes, 0);
  const comFora = pacientes.filter((p) => p.foraDasListas > 0).length;
  const maxN = Math.max(...linhas.map((l) => l.pacientes));

  // espera por mês de inclusão
  const porMes = new Map<string, number>();
  for (const p of pacientes) porMes.set(p.dataInclusao.slice(0, 7), (porMes.get(p.dataInclusao.slice(0, 7)) ?? 0) + 1);
  // preenche meses sem nenhuma inclusão, para o eixo não pular
  const chaves = [...porMes.keys()].sort();
  const meses: [string, number][] = [];
  if (chaves.length) {
    let [a, m] = chaves[0].split('-').map(Number);
    const [af, mf] = chaves[chaves.length - 1].split('-').map(Number);
    while (a < af || (a === af && m <= mf)) {
      const k = `${a}-${String(m).padStart(2, '0')}`;
      meses.push([k, porMes.get(k) ?? 0]);
      m++;
      if (m > 12) { m = 1; a++; }
    }
  }
  const maxMes = Math.max(...meses.map((m) => m[1]));
  const geradoEm = [...new Set(relatorios.map((r) => r.geradoEm.slice(0, 10)))].join(', ');

  const faixas: [string, number, number][] = [
    ['0–17', 0, 18], ['18–39', 18, 40], ['40–59', 40, 60], ['60–79', 60, 80], ['80+', 80, 200],
  ];

  return (
    <>
      <section className="kpis">
        <div className="kpi"><span>Pacientes aguardando</span><strong><Num valor={pacientes.length} formato={inteiro} /></strong><small>pessoas diferentes, por prontuário</small></div>
        <div className="kpi"><span>Exames aguardando</span><strong><Num valor={totalExames} formato={inteiro} /></strong><small>{relatorios.length} tipos de exame</small></div>
        <div className="kpi destaque"><span>Custo para zerar a fila</span><strong><Num valor={custoTotal} formato={reais} /></strong><small>{semPreco.length ? `sem valor: ${semPreco.join(', ')}` : 'com os valores da aba Valores'}</small></div>
        <div className="kpi"><span>Inclusão mais antiga</span><strong>{dataBR(meses[0]?.[0] + '-01').slice(3)}</strong><small>relatórios de {geradoEm}</small></div>
      </section>

      <section className="card">
        <h2>Por exame</h2>
        <table className="tabela">
          <thead>
            <tr>
              <th>Exame</th>
              <th className="n">Aguardando</th>
              <th className="barra-col"></th>
              <th className="n">Valor unit.</th>
              <th className="n">Custo para zerar</th>
              <th className="n" title="Quantidade que estava na tabela do CISALP">Qtd. na tabela CISALP</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const qt = QTD_TABELA_CISALP[l.exame];
              return (
                <tr key={l.exame}>
                  <td>{l.exame}</td>
                  <td className="n">{inteiro(l.pacientes)}</td>
                  <td className="barra-col"><div className="barra" style={{ width: `${(l.pacientes / maxN) * 100}%` }} /></td>
                  <td className="n">{reais(l.preco)}</td>
                  <td className="n">{reais(l.custo)}</td>
                  <td className={`n ${qt !== undefined && Math.abs(qt - l.pacientes) / l.pacientes > 0.1 ? 'ruim' : 'muted'}`}>{qt === undefined ? '—' : inteiro(qt)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td className="n">{inteiro(totalExames)}</td>
              <td></td>
              <td></td>
              <td className="n">{reais(custoTotal)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </section>

      <div className="duas">
        <section className="card">
          <h2>Pacientes por faixa etária</h2>
          <table className="tabela compacta">
            <tbody>
              {faixas.map(([nome, a, b]) => {
                const n = pacientes.filter((p) => p.idadeAnos >= a && p.idadeAnos < b).length;
                return (
                  <tr key={nome}>
                    <td>{nome} anos</td>
                    <td className="n">{inteiro(n)}</td>
                    <td className="n muted">{pct(n, pacientes.length)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        <section className="card">
          <h2>Pacientes por mês de inclusão na fila</h2>
          <div className="colunas">
            {meses.map(([m, n]) => (
              <div key={m} className="coluna" title={`${dataBR(m + '-01').slice(3)}: ${inteiro(n)} pacientes`}>
                <div className="col-barra" style={{ height: n ? `${Math.max(2, (n / maxMes) * 100)}%` : 0 }} />
                <span>{m.slice(5)}/{m.slice(2, 4)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {comFora > 0 && (
        <section className="card nota">
          <strong>Pedidos com procedimentos fora das listas carregadas:</strong> {inteiro(comFora)} pacientes ({pct(comFora, pacientes.length)}). O
          relatório informa o "Total de Procedimentos" de cada pedido, e esses pacientes têm mais procedimentos do que os que aparecem nas listas
          carregadas. No simulador dá para exigir pedido completo.
        </section>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ Valores */

function Valores({ precos, setPrecos, exames }: { precos: Precos; setPrecos: (p: Precos) => void; exames: string[] }) {
  const todos = [...new Set([...Object.keys(PRECOS_CISALP), ...exames])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const [rasc, setRasc] = useState<Record<string, string>>({});
  return (
    <section className="card">
      <h2>Valor unitário por exame</h2>
      <p>Padrão: tabela CISALP. Exames que não estão na tabela usam o valor SIGTAP × 2. O que você mudar aqui fica salvo neste navegador.</p>
      <table className="tabela compacta valores">
        <thead>
          <tr>
            <th>Exame</th>
            <th className="n">Valor (R$)</th>
            <th>Origem</th>
            <th>Nas listas?</th>
          </tr>
        </thead>
        <tbody>
          {todos.map((e) => {
            const alterado = precos[e] !== PRECOS_CISALP[e];
            return (
              <tr key={e}>
                <td>{e}</td>
                <td className="n">
                  <input
                    className="preco"
                    inputMode="decimal"
                    value={rasc[e] ?? valorParaCampo(precos[e])}
                    onChange={(ev) => setRasc({ ...rasc, [e]: ev.target.value })}
                    onBlur={() => {
                      if (rasc[e] === undefined) return;
                      const v = lerValor(rasc[e]);
                      setPrecos({ ...precos, [e]: v ?? undefined });
                      const { [e]: _, ...resto } = rasc;
                      setRasc(resto);
                    }}
                  />
                </td>
                <td className="muted">{alterado ? 'alterado' : ORIGEM_PRECO[e] ?? (PRECOS_CISALP[e] !== undefined ? 'CISALP' : '—')}</td>
                <td className="muted">{exames.includes(e) ? 'sim' : exames.length ? 'não carregado' : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="acoes">
        <button onClick={() => { setPrecos({ ...PRECOS_CISALP }); setRasc({}); }}>Voltar aos valores padrão</button>
      </div>
    </section>
  );
}
