// Valores unitários da tabela CISALP enviada pela Célia (19/10/2026).
// Ficam como padrão; a tela de valores permite editar e o que for editado fica salvo no navegador.
export const PRECOS_CISALP: Record<string, number> = {
  Hemograma: 7.2,
  'Ácido úrico': 3.36,
  Cálcio: 3.36,
  'Colesterol total': 3.36,
  Creatinina: 3.36,
  'Curva glicêmica': 17.42,
  'Ferro sérico': 4.32,
  Glicemia: 3.36,
  HDL: 6.0,
  'Hemoglobina glicada': 16.4,
  LDL: 3.6,
  Potássio: 3.76,
  'Sangue oculto nas fezes': 2.4,
  Sódio: 3.36,
  'Triglicerídeos': 4.8,
  TGO: 3.56,
  TGP: 3.56,
  TSH: 15.0,
  Ureia: 3.46,
  'Vitamina B12': 20.4,
  'Vitamina D': 17.56,
  // Sem valor na tabela CISALP: regra definida = valor SIGTAP × 2 (SIGTAP competência 04/2026)
  Folato: 31.3, // 02.02.01.040-6 · SIGTAP R$ 15,65
  'Capacidade de fixação do ferro': 4.02, // 02.02.01.002-3 · SIGTAP R$ 2,01
  'Urina tipo I (EAS)': 7.4, // 02.02.05.001-7 · SIGTAP R$ 3,70
  'T4 livre': 23.2, // 02.02.06.038-1 · SIGTAP R$ 11,60
  // Exames incluídos em 26 e 27/10/2026 — tabela CISALP do laboratório SALK (27/10/2026)
  FSH: 15.6,
  CPK: 12.0,
  // Cultura + antibiograma são um pacote de R$ 12,00: o valor fica na cultura e o antibiograma sai a zero
  'Cultura de bactérias': 12.0,
  Antibiograma: 0,
  Microalbumina: 22.56,
  PSA: 22.56,
  Prolactina: 20.4,
  LH: 15.12,
  Testosterona: 25.2,
  'Testosterona livre': 28.2,
  Cortisol: 18.0,
  'PCR quantitativa': 16.8,
  PCR: 5.7,
  'Fator reumatoide': 4.8,
  'Gama GT': 4.8,
  'Fosfatase alcalina': 4.32,
  Fósforo: 3.36,
  Magnésio: 3.84,
  'Proteínas totais e frações': 3.6,
  Amilase: 4.07,
  Insulina: 13.2,
  'Paratormônio (PTH)': 17.0,
  'Peptídeo C': 27.74,
  'Clearance de creatinina': 6.0,
  VHS: 2.4,
  // Valores CISALP recebidos em 28/10/2026 (antes eram SIGTAP × 2)
  Ferritina: 23.0,
  T3: 20.0,
  T4: 15.0,
  Transferrina: 14.4,
};

/** Origem de cada valor padrão, para mostrar na tela. */
export const ORIGEM_PRECO: Record<string, string> = {
  Folato: 'SIGTAP R$ 15,65 × 2',
  'Capacidade de fixação do ferro': 'SIGTAP R$ 2,01 × 2',
  'Urina tipo I (EAS)': 'SIGTAP R$ 3,70 × 2',
  'T4 livre': 'SIGTAP R$ 11,60 × 2',
  'Cultura de bactérias': 'CISALP — pacote com antibiograma',
  Antibiograma: 'Incluído no pacote da cultura',
};

// Quantidades que estavam na tabela da Célia, para comparar com o que veio nos PDFs.
export const QTD_TABELA_CISALP: Record<string, number> = {
  Hemograma: 10625, 'Ácido úrico': 2401, Cálcio: 1304, 'Colesterol total': 9657, Creatinina: 9421,
  'Curva glicêmica': 660, 'Ferro sérico': 3719, Glicemia: 9528, HDL: 9528, 'Hemoglobina glicada': 8545,
  LDL: 9583, Potássio: 5165, 'Sangue oculto nas fezes': 2443, Sódio: 2528, 'Triglicerídeos': 9329,
  TGO: 9343, TGP: 5827, TSH: 9727, Ureia: 4424, 'Vitamina B12': 8217, 'Vitamina D': 8397,
};
