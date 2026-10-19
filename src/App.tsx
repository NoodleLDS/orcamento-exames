import { useMemo, useState } from 'react';
import type { Relatorio } from './core/parseRelatorio';
import { agruparPacientes, type Precos } from './core/pacientes';
import { painel, REGRAS_PADRAO, simular, type Criterio, type Regras } from './core/simulacao';
import { ORIGEM_PRECO, PRECOS_CISALP, QTD_TABELA_CISALP } from './core/precos';
import { lerRelatorioPdf } from './lib/lerPdf';
import { exportarExcel } from './lib/exportar';
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

  const pacientes = useMemo(() => agruparPacientes(relatorios.flatMap((r) => r.linhas)), [relatorios]);
  const temDados = pacientes.length > 0;

  return (
    <div className="app">
      <header className="topo">
        <div>
          <h1>Orçamento da fila de exames</h1>
          <p className="sub">Secretaria Municipal de Saúde de Uberaba · Fila Eletrônica de exames laboratoriais</p>
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
      </header>
      <main>
        {aba === 'carregar' && <Carregar relatorios={relatorios} setRelatorios={setRelatorios} onPronto={() => setAba('panorama')} />}
        {aba === 'panorama' && temDados && <Panorama relatorios={relatorios} pacientes={pacientes} precos={precos} />}
        {aba === 'simulador' && temDados && <Simulador pacientes={pacientes} precos={precos} />}
        {aba === 'valores' && <Valores precos={precos} setPrecos={setPrecos} exames={[...new Set(pacientes.flatMap((p) => p.exames))]} />}
      </main>
      <footer>Os arquivos são lidos só neste computador. Nenhum dado de paciente é enviado ou guardado.</footer>
    </div>
  );
}

/* ------------------------------------------------------------------ Arquivos */

function Carregar({ relatorios, setRelatorios, onPronto }: { relatorios: Relatorio[]; setRelatorios: (r: Relatorio[]) => void; onPronto: () => void }) {
  const [status, setStatus] = useState<string>('');
  const [lendo, setLendo] = useState(false);
  const [erros, setErros] = useState<string[]>([]);

  async function ler(files: FileList | null) {
    if (!files?.length) return;
    setLendo(true);
    setErros([]);
    const novos = [...relatorios];
    const errosLocais: string[] = [];
    const lista = [...files].filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    for (let i = 0; i < lista.length; i++) {
      const f = lista[i];
      try {
        const r = await lerRelatorioPdf(f, (p, t) => setStatus(`Lendo ${i + 1} de ${lista.length}: ${f.name} — página ${p} de ${t}`));
        if (!r.linhas.length) {
          errosLocais.push(`${f.name}: não encontrei pacientes. É o relatório "Pacientes na Fila Aguardando Agendamento"?`);
          continue;
        }
        // mesmo procedimento carregado de novo: substitui (evita contar duas vezes)
        const j = novos.findIndex((x) => x.exame === r.exame);
        if (j >= 0) novos[j] = r;
        else novos.push(r);
      } catch (e) {
        errosLocais.push(`${f.name}: erro ao ler (${(e as Error).message})`);
      }
    }
    setRelatorios(novos);
    setErros(errosLocais);
    setStatus('');
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
      <label className={`drop ${lendo ? 'ocupado' : ''}`}>
        <input type="file" accept="application/pdf" multiple disabled={lendo} onChange={(e) => ler(e.target.files)} />
        {lendo ? status || 'Abrindo…' : 'Clique para escolher os PDFs'}
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
        <div className="kpi"><span>Pacientes aguardando</span><strong>{inteiro(pacientes.length)}</strong><small>pessoas diferentes, por prontuário</small></div>
        <div className="kpi"><span>Exames aguardando</span><strong>{inteiro(totalExames)}</strong><small>{relatorios.length} tipos de exame</small></div>
        <div className="kpi destaque"><span>Custo para zerar a fila</span><strong>{reais(custoTotal)}</strong><small>{semPreco.length ? `sem valor: ${semPreco.join(', ')}` : 'com os valores da aba Valores'}</small></div>
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

/* ------------------------------------------------------------------ Simulador */

function NumeroCampo({ valor, onChange, placeholder }: { valor: number | null; onChange: (v: number | null) => void; placeholder?: string }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={valor ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    />
  );
}

function Simulador({ pacientes, precos }: { pacientes: ReturnType<typeof agruparPacientes>; precos: Precos }) {
  const contagem = useMemo(() => painel(pacientes, {}), [pacientes]);
  const [regras, setRegras] = useState<Regras>(() => ({ ...REGRAS_PADRAO, examesMarcados: contagem.map((c) => c.exame) }));
  const [orcTexto, setOrcTexto] = useState('');
  const [ver, setVer] = useState<'contemplados' | 'nao'>('contemplados');
  const set = <K extends keyof Regras>(k: K, v: Regras[K]) => setRegras((r) => ({ ...r, [k]: v }));
  const marcados = new Set(regras.examesMarcados);
  const toggle = (e: string) => set('examesMarcados', marcados.has(e) ? regras.examesMarcados.filter((x) => x !== e) : [...regras.examesMarcados, e]);

  const r = useMemo(() => simular(pacientes, precos, regras), [pacientes, precos, regras]);

  const nomeCrit = (c: Criterio) => (c === 'data' ? 'Data de inclusão' : 'Idade');
  const descricao = (): [string, string][] => [
    ['Exames marcados', regras.examesMarcados.join(', ')],
    ['Exigir pedido completo', regras.exigirPedidoCompleto ? 'Sim' : 'Não'],
    ['Idade', `${regras.idadeMin ?? 'qualquer'} a ${regras.idadeMax ?? 'qualquer'}`],
    ['Inclusão na fila', `${regras.inclusaoDe ? dataBR(regras.inclusaoDe) : 'início'} a ${regras.inclusaoAte ? dataBR(regras.inclusaoAte) : 'hoje'}`],
    ['Data solicitada até', regras.solicitadaAte ? dataBR(regras.solicitadaAte) : 'sem limite'],
    ['Faixas prioritárias', regras.faixasPrioritarias.map((f) => `${f.min}–${f.max}`).join(', ') || 'nenhuma'],
    ['Prioridade', `${nomeCrit(regras.ordem[0])}, depois ${nomeCrit(regras.ordem[1])}`],
    ['Data de inclusão', regras.dataMaisAntigosPrimeiro ? 'mais antigos primeiro' : 'mais recentes primeiro'],
    ['Idade', regras.idadeMaisVelhosPrimeiro ? 'mais velhos primeiro' : 'mais novos primeiro'],
    ['Orçamento', reais(regras.orcamento)],
    ['Quando o próximo não cabe', regras.modoOrcamento === 'parar' ? 'para a fila ali' : 'pula e tenta os seguintes'],
  ];

  const lista = ver === 'contemplados' ? r.contemplados : r.naoContemplados;

  return (
    <div className="sim">
      <aside className="card controles">
        <h2>Regras</h2>

        <fieldset>
          <legend>
            Exames do orçamento
            <span className="mini">
              <button onClick={() => set('examesMarcados', contagem.map((c) => c.exame))}>todos</button>
              <button onClick={() => set('examesMarcados', [])}>nenhum</button>
            </span>
          </legend>
          <div className="checks">
            {contagem.map((c) => (
              <label key={c.exame} className={marcados.has(c.exame) ? 'on' : ''}>
                <input type="checkbox" checked={marcados.has(c.exame)} onChange={() => toggle(c.exame)} />
                <span>{c.exame}</span>
                <small>{inteiro(c.pacientes)}</small>
              </label>
            ))}
          </div>
          <p className="ajuda">Entra quem tem <strong>todos</strong> os seus exames dentro dos marcados.</p>
          <label className="linha">
            <input type="checkbox" checked={regras.exigirPedidoCompleto} onChange={(e) => set('exigirPedidoCompleto', e.target.checked)} />
            Exigir pedido completo (sem procedimentos fora das listas carregadas)
          </label>
        </fieldset>

        <fieldset>
          <legend>Filtros</legend>
          <div className="grade2">
            <label>Idade de<NumeroCampo valor={regras.idadeMin} onChange={(v) => set('idadeMin', v)} placeholder="0" /></label>
            <label>até<NumeroCampo valor={regras.idadeMax} onChange={(v) => set('idadeMax', v)} placeholder="120" /></label>
            <label>Inclusão de<input type="date" value={regras.inclusaoDe ?? ''} onChange={(e) => set('inclusaoDe', e.target.value || null)} /></label>
            <label>até<input type="date" value={regras.inclusaoAte ?? ''} onChange={(e) => set('inclusaoAte', e.target.value || null)} /></label>
            <label className="span2">
              Data solicitada até
              <input type="date" value={regras.solicitadaAte ?? ''} onChange={(e) => set('solicitadaAte', e.target.value || null)} />
              <small>Alguns pedidos têm data solicitada no futuro (exame pedido para mais adiante).</small>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Prioridade</legend>
          <label className="linha">
            Primeiro por
            <select
              value={regras.ordem[0]}
              onChange={(e) => {
                const c = e.target.value as Criterio;
                set('ordem', [c, c === 'data' ? 'idade' : 'data']);
              }}
            >
              <option value="data">data de inclusão</option>
              <option value="idade">idade</option>
            </select>
            depois por {regras.ordem[1] === 'data' ? 'data de inclusão' : 'idade'}
          </label>
          <label className="linha">
            Data:
            <select value={regras.dataMaisAntigosPrimeiro ? 'a' : 'r'} onChange={(e) => set('dataMaisAntigosPrimeiro', e.target.value === 'a')}>
              <option value="a">mais antigos na fila primeiro</option>
              <option value="r">mais recentes primeiro</option>
            </select>
          </label>
          <label className="linha">
            Idade:
            <select value={regras.idadeMaisVelhosPrimeiro ? 'v' : 'n'} onChange={(e) => set('idadeMaisVelhosPrimeiro', e.target.value === 'v')}>
              <option value="v">mais velhos primeiro</option>
              <option value="n">mais novos primeiro</option>
            </select>
          </label>
          <div className="faixas">
            <span>Faixas prioritárias (em ordem)</span>
            {regras.faixasPrioritarias.map((f, i) => (
              <div key={i} className="faixa">
                <b>{i + 1}º</b>
                <NumeroCampo valor={f.min} onChange={(v) => set('faixasPrioritarias', regras.faixasPrioritarias.map((x, j) => (j === i ? { ...x, min: v ?? 0 } : x)))} />
                a
                <NumeroCampo valor={f.max} onChange={(v) => set('faixasPrioritarias', regras.faixasPrioritarias.map((x, j) => (j === i ? { ...x, max: v ?? 120 } : x)))} />
                anos
                <button onClick={() => set('faixasPrioritarias', regras.faixasPrioritarias.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            <button className="mini-add" onClick={() => set('faixasPrioritarias', [...regras.faixasPrioritarias, { min: 60, max: 120 }])}>+ adicionar faixa</button>
            {regras.faixasPrioritarias.length > 0 && <small>Quem não está em nenhuma faixa vem depois de todas.</small>}
          </div>
        </fieldset>

        <fieldset>
          <legend>Orçamento</legend>
          <div className="orc">
            <span>R$</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="1.000.000,00"
              value={orcTexto}
              onChange={(e) => {
                setOrcTexto(e.target.value);
                set('orcamento', lerValor(e.target.value));
              }}
              onBlur={() => setOrcTexto(valorParaCampo(regras.orcamento))}
            />
          </div>
          <label className="linha">
            Quando o próximo da fila não cabe:
            <select value={regras.modoOrcamento} onChange={(e) => set('modoOrcamento', e.target.value as Regras['modoOrcamento'])}>
              <option value="parar">para ali (respeita a ordem)</option>
              <option value="pular">pula e tenta os seguintes</option>
            </select>
          </label>
        </fieldset>
      </aside>

      <section className="resultado">
        {r.precosFaltando.length > 0 && <p className="alerta">Sem valor para: {r.precosFaltando.join(', ')}. Preencha na aba Valores.</p>}
        <div className="kpis">
          <div className="kpi destaque">
            <span>Contemplados</span>
            <strong>{regras.orcamento === null ? '—' : inteiro(r.contemplados.length)}</strong>
            <small>{regras.orcamento === null ? 'digite o orçamento' : reais(r.custoContemplados)}</small>
          </div>
          <div className="kpi">
            <span>Sobra</span>
            <strong>{reais(r.sobra)}</strong>
            <small>{regras.orcamento !== null ? `${pct(r.custoContemplados, regras.orcamento)} do orçamento usado` : ''}</small>
          </div>
          <div className="kpi">
            <span>Elegíveis não contemplados</span>
            <strong>{inteiro(r.naoContemplados.length)}</strong>
            <small>faltaria {reais(r.custoNaoContemplados)}</small>
          </div>
          <div className="kpi">
            <span>Elegíveis</span>
            <strong>{inteiro(r.elegiveis)}</strong>
            <small>de {inteiro(pacientes.length)} na fila</small>
          </div>
        </div>
        <p className="funil">
          {inteiro(r.foraPorExame)} ficam de fora porque têm exame não marcado · {inteiro(r.foraPorFiltro)} pelos filtros
        </p>

        <div className="card">
          <div className="lista-topo">
            <div className="seg">
              <button className={ver === 'contemplados' ? 'ativa' : ''} onClick={() => setVer('contemplados')}>Contemplados ({inteiro(r.contemplados.length)})</button>
              <button className={ver === 'nao' ? 'ativa' : ''} onClick={() => setVer('nao')}>Não contemplados ({inteiro(r.naoContemplados.length)})</button>
            </div>
            <button className="primario" onClick={() => exportarExcel(r, regras, descricao())} disabled={!r.elegiveis}>Baixar Excel</button>
          </div>
          <table className="tabela compacta">
            <thead>
              <tr>
                <th className="n">#</th>
                <th>Prontuário</th>
                <th>Nome</th>
                <th className="n">Idade</th>
                <th>Inclusão</th>
                <th>Exames</th>
                <th className="n">Custo</th>
              </tr>
            </thead>
            <tbody>
              {lista.slice(0, 200).map((i) => (
                <tr key={i.paciente.prontuario}>
                  <td className="n muted">{i.posicao}</td>
                  <td>{i.paciente.prontuario}</td>
                  <td>{i.paciente.nome}</td>
                  <td className="n">{i.paciente.idadeTexto}</td>
                  <td>{dataBR(i.paciente.dataInclusao)}</td>
                  <td className="exames">{i.paciente.exames.join(', ')}</td>
                  <td className="n">{reais(i.custo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {lista.length > 200 && <p className="ajuda">Mostrando os 200 primeiros de {inteiro(lista.length)}. A lista completa vai no Excel.</p>}
        </div>
      </section>
    </div>
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
