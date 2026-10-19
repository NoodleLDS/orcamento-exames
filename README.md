# Orçamento da fila de exames

Simulador de orçamento para a Fila Eletrônica de exames laboratoriais da Secretaria Municipal de Saúde de Uberaba.

Você carrega os relatórios **"Pacientes na Fila Aguardando Agendamento"** (PDF, um por exame), marca quais exames entram no orçamento, ajusta os filtros e a prioridade, e o app mostra quantos pacientes são contemplados, quanto custa, quanto sobra e a lista nominal (exportável em Excel).

## Privacidade

Os PDFs são lidos **no navegador de quem está usando**. Nenhum dado de paciente é enviado para servidor, gravado no repositório ou guardado no navegador. Só os valores dos exames ficam salvos (localStorage). O `.gitignore` bloqueia PDF, XLSX e CSV.

## Regras

1. As listas são juntadas pelo **prontuário**. Cada paciente fica com o conjunto dos exames que aguarda.
2. **Elegível**: todos os exames do paciente estão entre os marcados. Quem tem algum exame não marcado fica de fora, porque o pedido dele não seria atendido por inteiro.
3. **Filtros**: idade, data de inclusão e data solicitada.
4. **Data de inclusão**: a mais antiga entre os exames do paciente.
5. **Prioridade**: faixas etárias prioritárias (opcional), depois data de inclusão e idade, na ordem e no sentido escolhidos.
6. **Orçamento**: percorre a fila na ordem de prioridade e soma os custos. Por padrão para no primeiro paciente que não cabe; também pode pular esse e tentar os seguintes.
7. **Pedido completo** (opcional): cada pedido informa o "Total de Procedimentos". Com essa opção ligada, entra só quem não tem procedimento fora das listas carregadas.

## Valores

O padrão é a tabela do CISALP. Exames que não estão nela usam o valor SIGTAP × 2 (competência 04/2026). Tudo pode ser editado na aba **Valores**.

## Desenvolvimento

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes da lógica (src/core)
npm run build
npx tsx scripts/parse-node.ts <pasta-com-pdfs> saida.json   # valida o parser fora do navegador
```

A lógica fica em `src/core/` e não depende de React:

- `parseRelatorio.ts` lê o relatório da Fila Eletrônica.
- `pacientes.ts` agrupa as linhas por prontuário.
- `simulacao.ts` faz a elegibilidade, a prioridade e o orçamento.

## Publicação

Cada push na `main` publica no GitHub Pages pelo workflow `.github/workflows/deploy.yml`. No repositório, vá em **Settings → Pages → Source: GitHub Actions**.
