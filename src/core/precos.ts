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
  Ferritina: 31.18, // 02.02.01.038-4 · SIGTAP R$ 15,59
  Transferrina: 8.24, // 02.02.01.066-0 · SIGTAP R$ 4,12
  'Capacidade de fixação do ferro': 4.02, // 02.02.01.002-3 · SIGTAP R$ 2,01
  'Urina tipo I (EAS)': 7.4, // 02.02.05.001-7 · SIGTAP R$ 3,70
  T3: 17.42, // 02.02.06.039-0 · SIGTAP R$ 8,71
  T4: 17.52, // 02.02.06.037-3 · SIGTAP R$ 8,76
  'T4 livre': 23.2, // 02.02.06.038-1 · SIGTAP R$ 11,60
  // Exames incluídos em 26/10/2026 (SIGTAP; PSA conferido na competência 10/2026)
  FSH: 15.78, // 02.02.06.023-3 · SIGTAP R$ 7,89
  Antibiograma: 9.96, // 02.02.08.001-3 · SIGTAP R$ 4,98
  CPK: 7.36, // 02.02.01.032-5 · SIGTAP R$ 3,68
  'Cultura de bactérias': 11.24, // 02.02.08.008-0 · SIGTAP R$ 5,62
  Microalbumina: 16.24, // 02.02.05.009-2 · SIGTAP R$ 8,12
  PSA: 32.84, // 02.02.03.010-5 · SIGTAP R$ 16,42
};

/** Origem de cada valor padrão, para mostrar na tela. */
export const ORIGEM_PRECO: Record<string, string> = {
  Folato: 'SIGTAP R$ 15,65 × 2',
  Ferritina: 'SIGTAP R$ 15,59 × 2',
  Transferrina: 'SIGTAP R$ 4,12 × 2',
  'Capacidade de fixação do ferro': 'SIGTAP R$ 2,01 × 2',
  'Urina tipo I (EAS)': 'SIGTAP R$ 3,70 × 2',
  T3: 'SIGTAP R$ 8,71 × 2',
  T4: 'SIGTAP R$ 8,76 × 2',
  'T4 livre': 'SIGTAP R$ 11,60 × 2',
  FSH: 'SIGTAP R$ 7,89 × 2',
  Antibiograma: 'SIGTAP R$ 4,98 × 2',
  CPK: 'SIGTAP R$ 3,68 × 2',
  'Cultura de bactérias': 'SIGTAP R$ 5,62 × 2',
  Microalbumina: 'SIGTAP R$ 8,12 × 2',
  PSA: 'SIGTAP R$ 16,42 × 2',
};

// Quantidades que estavam na tabela da Célia, para comparar com o que veio nos PDFs.
export const QTD_TABELA_CISALP: Record<string, number> = {
  Hemograma: 10625, 'Ácido úrico': 2401, Cálcio: 1304, 'Colesterol total': 9657, Creatinina: 9421,
  'Curva glicêmica': 660, 'Ferro sérico': 3719, Glicemia: 9528, HDL: 9528, 'Hemoglobina glicada': 8545,
  LDL: 9583, Potássio: 5165, 'Sangue oculto nas fezes': 2443, Sódio: 2528, 'Triglicerídeos': 9329,
  TGO: 9343, TGP: 5827, TSH: 9727, Ureia: 4424, 'Vitamina B12': 8217, 'Vitamina D': 8397,
};
