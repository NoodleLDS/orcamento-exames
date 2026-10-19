import { useMemo, useState } from 'react';
import type { Paciente, Precos } from '../core/pacientes';
import { painel, simular, type Criterio, type Regras, type Resultado } from '../core/simulacao';
import { descreverCenario } from '../core/descricao';
import { exportarExcel, examesAComprar } from '../lib/exportar';
import { dataBR, inteiro, lerValor, pct, reais, valorParaCampo } from '../lib/formato';
import { DataCampo, IdadeCampo } from './Campos';
import { Graficos } from './Graficos';
import { Num } from './Num';

export type Cenario = {
  id: number;
  nome: string;
  frase: string;
  orcamento: number | null;
  examesMarcados: number;
  elegiveis: number;
  contemplados: number;
  custo: number;
  saldo: number | null;
  ultimaInclusao: string;
  exames: number;
};

function resumir(id: number, nome: string, regras: Regras, r: Resultado, frase: string): Cenario {
  const sem = regras.orcamento === null || r.precosFaltando.length > 0;
  return {
    id,
    nome,
    frase,
    orcamento: regras.orcamento,
    examesMarcados: regras.examesMarcados.length,
    elegiveis: r.elegiveis,
    contemplados: sem ? 0 : r.contemplados.length,
    custo: sem ? 0 : r.custoContemplados,
    saldo: sem ? null : (regras.orcamento as number) - (r.custoContemplados + r.custoNaoContemplados),
    ultimaInclusao: r.contemplados.reduce((m, i) => (i.paciente.dataInclusao > m ? i.paciente.dataInclusao : m), ''),
    exames: r.contemplados.reduce((s, i) => s + i.paciente.exames.length, 0),
  };
}

function Passo({ n, titulo, ajuda, children, extra, className = '' }: { n: number; titulo: string; ajuda: React.ReactNode; children: React.ReactNode; extra?: React.ReactNode; className?: string }) {
  return (
    <fieldset className={`passo ${className}`}>
      <legend>
        <span className="passo-n">{n}</span>
        <span className="passo-t">{titulo}</span>
        {extra}
      </legend>
      <p className="passo-ajuda">{ajuda}</p>
      {children}
    </fieldset>
  );
}

type Props = {
  pacientes: Paciente[];
  precos: Precos;
  regras: Regras;
  setRegras: React.Dispatch<React.SetStateAction<Regras>>;
  cenarios: Cenario[];
  setCenarios: React.Dispatch<React.SetStateAction<Cenario[]>>;
  apresentacao: boolean;
};

export function Simulador({ pacientes, precos, regras, setRegras, cenarios, setCenarios, apresentacao }: Props) {
  const contagem = useMemo(() => painel(pacientes, {}), [pacientes]);
  const [orcTexto, setOrcTexto] = useState(() => valorParaCampo(regras.orcamento));
  const [ver, setVer] = useState<'contemplados' | 'nao'>('contemplados');
  const [listaAberta, setListaAberta] = useState(() => typeof window === 'undefined' || window.innerWidth > 900);
  const set = <K extends keyof Regras>(k: K, v: Regras[K]) => setRegras((r) => ({ ...r, [k]: v }));
  const marcados = new Set(regras.examesMarcados);
  const toggle = (e: string) => set('examesMarcados', marcados.has(e) ? regras.examesMarcados.filter((x) => x !== e) : [...regras.examesMarcados, e]);

  const r = useMemo(() => simular(pacientes, precos, regras), [pacientes, precos, regras]);
  const frase = descreverCenario(regras, r, contagem.length);
  const semOrcamento = regras.orcamento === null || r.precosFaltando.length > 0;
  const lista = semOrcamento ? r.naoContemplados : ver === 'contemplados' ? r.contemplados : r.naoContemplados;
  const idadeInvertida = regras.idadeMin !== null && regras.idadeMax !== null && regras.idadeMin > regras.idadeMax;
  const datasInvertidas = !!(regras.inclusaoDe && regras.inclusaoAte && regras.inclusaoDe > regras.inclusaoAte);
  const datasFila = useMemo(() => {
    const ds = pacientes.map((p) => p.dataInclusao).filter(Boolean).sort();
    return [ds[0], ds[ds.length - 1]];
  }, [pacientes]);

  const nomeCrit = (c: Criterio) => (c === 'data' ? 'Data de inclusão' : 'Idade');
  const descricao = (): [string, string][] => [
    ['Exames comprados', regras.examesMarcados.join(', ')],
    ['Exigir pedido completo', regras.exigirPedidoCompleto ? 'Sim' : 'Não'],
    ['Idade', `${regras.idadeMin ?? 'qualquer'} a ${regras.idadeMax ?? 'qualquer'}`],
    ['Entrada na fila', `${regras.inclusaoDe ? dataBR(regras.inclusaoDe) : 'desde o início'} a ${regras.inclusaoAte ? dataBR(regras.inclusaoAte) : 'hoje'}`],
    ['Data solicitada até', regras.solicitadaAte ? dataBR(regras.solicitadaAte) : 'sem limite'],
    ['Faixas prioritárias', regras.faixasPrioritarias.map((f) => `${f.min}–${f.max}`).join(', ') || 'nenhuma'],
    ['Prioridade', `${nomeCrit(regras.ordem[0])}, depois ${nomeCrit(regras.ordem[1])}`],
    ['Data de inclusão', regras.dataMaisAntigosPrimeiro ? 'mais antigos primeiro' : 'mais recentes primeiro'],
    ['Idade', regras.idadeMaisVelhosPrimeiro ? 'mais velhos primeiro' : 'mais novos primeiro'],
    ['Orçamento', reais(regras.orcamento)],
    ['Quando o próximo não cabe', regras.modoOrcamento === 'parar' ? 'para a fila ali' : 'pula e tenta os seguintes'],
  ];

  const guardar = () => {
    const id = (cenarios.at(-1)?.id ?? 0) + 1;
    setCenarios((cs) => [...cs.slice(-3), resumir(id, `Cenário ${String.fromCharCode(64 + (((id - 1) % 26) + 1))}`, regras, r, frase)]);
  };
  const compra = semOrcamento ? [] : examesAComprar(r, precos);

  return (
    <div className="sim">
      <aside className="card controles nao-imprime">
        <h2>Regras da simulação</h2>
        <p className="intro-regras">
          O programa monta uma fila com quem pode ser atendido (passos 2 e 3), ordena essa fila (passo 4) e vai pagando os exames de cada paciente,
          do primeiro ao último, até o dinheiro acabar (passo 1). Ninguém é atendido pela metade.
        </p>

        <Passo n={1} titulo="Quanto dinheiro tem" ajuda="Digite o valor do orçamento. Aceita 1.000.000, 1 milhão ou 500 mil." className="campo-orc">
          <div className="orc">
            <span>R$</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="ex.: 1.000.000"
              value={orcTexto}
              onChange={(e) => {
                setOrcTexto(e.target.value);
                set('orcamento', lerValor(e.target.value));
              }}
              onBlur={() => regras.orcamento !== null && setOrcTexto(valorParaCampo(regras.orcamento))}
            />
          </div>
          {orcTexto.trim() && regras.orcamento === null ? (
            <p className="alerta pequeno">Não entendi esse valor. Use, por exemplo, 1.000.000 ou 1 milhão.</p>
          ) : (
            regras.orcamento !== null && <p className="ajuda">= {reais(regras.orcamento)}</p>
          )}
          <label className="bloco">
            <span>Se o próximo da fila custar mais do que sobrou</span>
            <select value={regras.modoOrcamento} onChange={(e) => set('modoOrcamento', e.target.value as Regras['modoOrcamento'])}>
              <option value="parar">parar ali — ninguém passa na frente</option>
              <option value="pular">pular e usar a sobra com quem vem depois</option>
            </select>
          </label>
        </Passo>

        <Passo
          n={2}
          titulo="Quais exames serão comprados"
          ajuda={
            <>
              Só entra quem tem <b>todos</b> os seus exames marcados. Ex.: quem espera hemograma e TSH só entra se os dois estiverem marcados. O número ao lado é
              quantos pacientes esperam aquele exame.
            </>
          }
          extra={
            <span className="mini">
              <button onClick={() => set('examesMarcados', contagem.map((c) => c.exame))}>todos</button>
              <button onClick={() => set('examesMarcados', [])}>nenhum</button>
            </span>
          }
        >
          <details className="lista-exames" open={listaAberta} onToggle={(e) => setListaAberta((e.target as HTMLDetailsElement).open)}>
            <summary>
              <span>
                {regras.examesMarcados.length === contagem.length ? `Todos os ${contagem.length} exames marcados` : `${regras.examesMarcados.length} de ${contagem.length} exames marcados`}
              </span>
              <small className="muted">{listaAberta ? 'recolher' : 'ver e editar'}</small>
            </summary>
          <div className="checks">
            {contagem.map((c) => (
              <label key={c.exame} className={marcados.has(c.exame) ? 'on' : ''}>
                <input type="checkbox" checked={marcados.has(c.exame)} onChange={() => toggle(c.exame)} />
                <span>{c.exame}</span>
                <small>{inteiro(c.pacientes)}</small>
              </label>
            ))}
          </div>
          </details>
          <label className="linha">
            <input type="checkbox" checked={regras.exigirPedidoCompleto} onChange={(e) => set('exigirPedidoCompleto', e.target.checked)} />
            <span>
              Só quem tem o pedido inteiro nestas listas
              <small className="sub-ajuda">Tira quem tem no pedido algum procedimento que não veio nos relatórios carregados (ex.: sorologias).</small>
            </span>
          </label>
        </Passo>

        <Passo n={3} titulo="Quem pode entrar" ajuda="Filtros opcionais. Deixe em branco para não filtrar.">
          <div className="filtro">
            <span className="filtro-t">Idade</span>
            <div className="entre">
              <IdadeCampo valor={regras.idadeMin} onChange={(v) => set('idadeMin', v)} placeholder="0" />
              <span>a</span>
              <IdadeCampo valor={regras.idadeMax} onChange={(v) => set('idadeMax', v)} placeholder="120" />
              <span>anos</span>
            </div>
            {idadeInvertida && <p className="alerta pequeno">A idade inicial está maior que a final: ninguém vai entrar.</p>}
          </div>
          <div className="filtro">
            <span className="filtro-t">Entrou na fila</span>
            <div className="entre datas">
              <DataCampo valor={regras.inclusaoDe} onChange={(v) => set('inclusaoDe', v)} modo="inicio" placeholder="de dd/mm/aaaa" />
              <DataCampo valor={regras.inclusaoAte} onChange={(v) => set('inclusaoAte', v)} modo="fim" placeholder="até dd/mm/aaaa" />
            </div>
            <small className="sub-ajuda">
              Pode digitar só mês e ano (08/2026) ou só o ano. A fila carregada vai de {dataBR(datasFila[0])} a {dataBR(datasFila[1])}.
            </small>
            {datasInvertidas && <p className="alerta pequeno">A data inicial está depois da final: ninguém vai entrar.</p>}
          </div>
          <div className="filtro">
            <span className="filtro-t">Exame pedido para até</span>
            <div className="entre datas">
              <DataCampo valor={regras.solicitadaAte} onChange={(v) => set('solicitadaAte', v)} modo="fim" placeholder="dd/mm/aaaa" />
            </div>
            <small className="sub-ajuda">
              Alguns médicos pedem o exame para uma data futura (ex.: retorno em 3 meses). Use para deixar de fora quem só precisa do exame depois dessa data.
            </small>
          </div>
        </Passo>

        <Passo n={4} titulo="Quem é atendido primeiro" ajuda="Define a ordem da fila. O dinheiro é usado de cima para baixo.">
          <label className="bloco">
            <span>Critério principal</span>
            <select
              value={regras.ordem[0]}
              onChange={(e) => {
                const c = e.target.value as Criterio;
                set('ordem', [c, c === 'data' ? 'idade' : 'data']);
              }}
            >
              <option value="data">tempo de espera na fila</option>
              <option value="idade">idade</option>
            </select>
            <small className="sub-ajuda">Em caso de empate, usa o outro critério.</small>
          </label>
          <div className="grade2">
            <label className="bloco">
              <span>Tempo de espera</span>
              <select value={regras.dataMaisAntigosPrimeiro ? 'a' : 'r'} onChange={(e) => set('dataMaisAntigosPrimeiro', e.target.value === 'a')}>
                <option value="a">quem espera há mais tempo</option>
                <option value="r">quem entrou por último</option>
              </select>
            </label>
            <label className="bloco">
              <span>Idade</span>
              <select value={regras.idadeMaisVelhosPrimeiro ? 'v' : 'n'} onChange={(e) => set('idadeMaisVelhosPrimeiro', e.target.value === 'v')}>
                <option value="v">mais velhos</option>
                <option value="n">mais novos</option>
              </select>
            </label>
          </div>
          <div className="faixas">
            <span>Faixas de idade na frente da fila (opcional)</span>
            <small className="sub-ajuda">Ex.: 60 a 120 anos em 1º lugar. Dentro de cada faixa vale a ordem acima; quem não está em nenhuma faixa vem depois.</small>
            {regras.faixasPrioritarias.map((f, i) => (
              <div key={i} className="faixa">
                <b>{i + 1}º</b>
                <IdadeCampo valor={f.min} onChange={(v) => set('faixasPrioritarias', regras.faixasPrioritarias.map((x, j) => (j === i ? { ...x, min: v ?? 0 } : x)))} />
                a
                <IdadeCampo valor={f.max} onChange={(v) => set('faixasPrioritarias', regras.faixasPrioritarias.map((x, j) => (j === i ? { ...x, max: v ?? 120 } : x)))} />
                anos
                <button aria-label="Remover faixa" onClick={() => set('faixasPrioritarias', regras.faixasPrioritarias.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            <button className="mini-add" onClick={() => set('faixasPrioritarias', [...regras.faixasPrioritarias, { min: 60, max: 120 }])}>+ adicionar faixa</button>
          </div>
        </Passo>
      </aside>

      <section className="resultado">
        <div className="so-imprime cab-impressao">
          <h1>Orçamento da fila de exames — resumo do cenário</h1>
          <p>Secretaria Municipal de Saúde de Uberaba · gerado em {new Date().toLocaleString('pt-BR')}</p>
        </div>
        {r.precosFaltando.length > 0 && <p className="alerta">Sem valor para: {r.precosFaltando.join(', ')}. Preencha na aba Valores.</p>}

        <div className="frase">
          <p>{frase}</p>
          <div className="frase-acoes nao-imprime">
            <button onClick={guardar} title="Guarda os números deste cenário para comparar com outros">Guardar para comparar</button>
            <button onClick={() => window.print()} title="Abre a impressão; escolha 'Salvar como PDF'">Imprimir resumo / PDF</button>
          </div>
        </div>

        <div className="kpis">
          <div className="kpi destaque">
            <span>Contemplados</span>
            <strong>{semOrcamento ? '—' : <Num valor={r.contemplados.length} formato={inteiro} />}</strong>
            <small>{semOrcamento ? 'digite o orçamento' : `${reais(r.custoContemplados)} · ${pct(r.custoContemplados, regras.orcamento ?? 0)} do orçamento`}</small>
          </div>
          {(() => {
            const saldo = semOrcamento ? null : (regras.orcamento as number) - (r.custoContemplados + r.custoNaoContemplados);
            const falta = saldo !== null && saldo < 0;
            return (
              <div className={`kpi ${falta ? 'kpi-falta' : saldo !== null ? 'kpi-sobra' : ''}`}>
                <span>{saldo === null ? 'Saldo' : falta ? 'Falta para atender todos os elegíveis' : 'Sobra após atender todos os elegíveis'}</span>
                <strong>{saldo === null ? '—' : <>{falta ? '− ' : ''}<Num valor={Math.abs(saldo)} formato={reais} /></>}</strong>
                <small>{saldo === null ? 'orçamento − custo dos elegíveis' : `orçamento ${reais(regras.orcamento)} − custo ${reais(r.custoContemplados + r.custoNaoContemplados)}`}</small>
              </div>
            );
          })()}
          <div className="kpi">
            <span>Elegíveis não contemplados</span>
            <strong>{semOrcamento ? '—' : <Num valor={r.naoContemplados.length} formato={inteiro} />}</strong>
            <small>
              {semOrcamento
                ? `custo de todos os elegíveis: ${reais(r.custoNaoContemplados)}`
                : r.naoContemplados.length
                  ? `custariam ${reais(r.custoNaoContemplados)}`
                  : `todos atendidos · sobra não usada ${reais(r.sobra)}`}
            </small>
          </div>
          <div className="kpi">
            <span>Elegíveis</span>
            <strong><Num valor={r.elegiveis} formato={inteiro} /></strong>
            <small>de {inteiro(pacientes.length)} na fila</small>
          </div>
        </div>
        <p className="funil">
          Ficam de fora: {inteiro(r.foraPorExame)} porque esperam algum exame não marcado · {inteiro(r.foraPorFiltro)} pelos filtros de idade e data
        </p>

        {cenarios.length > 0 && (
          <div className="card cenarios">
            <div className="lista-topo">
              <h2>Comparação de cenários</h2>
              <button className="nao-imprime" onClick={() => setCenarios([])}>Limpar</button>
            </div>
            <div className="tabela-rolagem">
              <table className="tabela compacta">
                <thead>
                  <tr>
                    <th>Cenário</th>
                    <th className="n">Orçamento</th>
                    <th className="n">Exames</th>
                    <th className="n">Elegíveis</th>
                    <th className="n">Contemplados</th>
                    <th className="n">Custo</th>
                    <th className="n">Falta / sobra</th>
                    <th className="n">Último na fila</th>
                    <th className="nao-imprime"></th>
                  </tr>
                </thead>
                <tbody>
                  {cenarios.map((c) => (
                    <tr key={c.id} title={c.frase}>
                      <td>
                        <input
                          className="nome-cenario"
                          value={c.nome}
                          aria-label="Nome do cenário"
                          onChange={(e) => setCenarios((cs) => cs.map((x) => (x.id === c.id ? { ...x, nome: e.target.value } : x)))}
                        />
                      </td>
                      <td className="n">{reais(c.orcamento)}</td>
                      <td className="n">{c.examesMarcados}</td>
                      <td className="n">{inteiro(c.elegiveis)}</td>
                      <td className="n"><b>{inteiro(c.contemplados)}</b></td>
                      <td className="n">{reais(c.custo)}</td>
                      <td className={`n ${c.saldo !== null && c.saldo < 0 ? 'ruim' : 'bom'}`}>{c.saldo === null ? '—' : `${c.saldo < 0 ? '− ' : ''}${reais(Math.abs(c.saldo))}`}</td>
                      <td className="n">{c.ultimaInclusao ? dataBR(c.ultimaInclusao) : '—'}</td>
                      <td className="nao-imprime"><button aria-label="Remover cenário" onClick={() => setCenarios((cs) => cs.filter((x) => x.id !== c.id))}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="ajuda nao-imprime">Passe o mouse sobre um cenário para ver as regras dele. Dá para renomear clicando no nome. Guarda até 4.</p>
          </div>
        )}

        <Graficos r={r} orcamento={regras.orcamento} />

        {compra.length > 0 && (
          <div className="card compra">
            <h2>Exames a comprar com este orçamento</h2>
            <div className="tabela-rolagem">
              <table className="tabela compacta">
                <thead>
                  <tr><th>Exame</th><th className="n">Quantidade</th><th className="n">Valor unitário</th><th className="n">Total</th></tr>
                </thead>
                <tbody>
                  {compra.map((c) => (
                    <tr key={c.exame}><td>{c.exame}</td><td className="n">{inteiro(c.qtd)}</td><td className="n">{reais(c.unit)}</td><td className="n">{reais(c.total)}</td></tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td className="n">{inteiro(compra.reduce((s, c) => s + c.qtd, 0))}</td>
                    <td></td>
                    <td className="n">{reais(compra.reduce((s, c) => s + c.total, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <div className="card lista-pacientes nao-imprime">
          <div className="lista-topo">
            {semOrcamento ? (
              <div className="seg"><button className="ativa">Elegíveis, em ordem ({inteiro(r.elegiveis)})</button></div>
            ) : (
              <div className="seg">
                <button className={ver === 'contemplados' ? 'ativa' : ''} onClick={() => setVer('contemplados')}>Contemplados ({inteiro(r.contemplados.length)})</button>
                <button className={ver === 'nao' ? 'ativa' : ''} onClick={() => setVer('nao')}>Não contemplados ({inteiro(r.naoContemplados.length)})</button>
              </div>
            )}
            <button className="primario" onClick={() => exportarExcel(r, precos, descricao(), frase, apresentacao)} disabled={!r.elegiveis}>
              Baixar Excel{apresentacao ? ' (sem nomes)' : ''}
            </button>
          </div>
          {apresentacao ? (
            <div className="oculto">
              <b>Lista de pacientes oculta</b>
              <span>Modo apresentação ligado: nomes e prontuários não aparecem na tela. Desligue no topo da página para ver a lista.</span>
            </div>
          ) : (
            <>
              <div className="tabela-rolagem">
                <table className="tabela compacta">
                  <thead>
                    <tr>
                      <th className="n">#</th>
                      <th>Prontuário</th>
                      <th>Nome</th>
                      <th className="n">Idade</th>
                      <th>Na fila desde</th>
                      <th className="col-exames">Exames</th>
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
                        <td className="exames col-exames">{i.paciente.exames.join(', ')}</td>
                        <td className="n">{reais(i.custo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {lista.length > 200 && <p className="ajuda">Mostrando os 200 primeiros de {inteiro(lista.length)}. A lista completa vai no Excel.</p>}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
