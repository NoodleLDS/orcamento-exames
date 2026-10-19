// Nomes curtos para os procedimentos como aparecem no cabeçalho do relatório.
// A chave é o texto do relatório normalizado (sem acento, minúsculo).

export const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const NOMES_CURTOS: [RegExp, string][] = [
  [/hemograma/, 'Hemograma'],
  [/hemoglobina glicosilada|hemoglobina glicada/, 'Hemoglobina glicada'],
  [/curva glicemica|tolerancia a glicose|sobrecarga de glicose/, 'Curva glicêmica'],
  [/glicose/, 'Glicemia'],
  [/sangue oculto/, 'Sangue oculto nas fezes'],
  [/calcio/, 'Cálcio'],
  [/transaminase glutamico-oxalacetica|\btgo\b/, 'TGO'],
  [/transaminase glutamico-piruvica|\btgp\b/, 'TGP'],
  [/tireoestimulante|\btsh\b/, 'TSH'],
  [/tiroxina livre|\bt4 livre\b/, 'T4 livre'],
  [/tiroxina|\bt4\b/, 'T4'],
  [/triiodotironina|\bt3\b/, 'T3'],
  [/hidroxivitamina d|vitamina d/, 'Vitamina D'],
  [/vitamina b12|cianocobalamina/, 'Vitamina B12'],
  [/folato|acido folico/, 'Folato'],
  [/fixacao do ferro/, 'Capacidade de fixação do ferro'],
  [/transferrina/, 'Transferrina'],
  [/ferritina/, 'Ferritina'],
  [/ferro serico/, 'Ferro sérico'],
  [/triglicerideos/, 'Triglicerídeos'],
  [/colesterol hdl/, 'HDL'],
  [/colesterol ldl/, 'LDL'],
  [/colesterol total/, 'Colesterol total'],
  [/ureia/, 'Ureia'],
  [/creatinina/, 'Creatinina'],
  [/acido urico/, 'Ácido úrico'],
  [/caracteres fisicos, elementos/, 'Urina tipo I (EAS)'],
  [/potassio/, 'Potássio'],
  [/sodio/, 'Sódio'],
];

export function nomeCurto(procedimento: string): string {
  const n = normalizar(procedimento);
  for (const [re, nome] of NOMES_CURTOS) if (re.test(n)) return nome;
  return procedimento.replace(/^Dosagem De /i, '');
}
