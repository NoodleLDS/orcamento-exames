import { useEffect, useState } from 'react';
import { dataBR, lerData } from '../lib/formato';

/** Data digitada livre: 15/08/2026, 08/2026, ago/2026 ou 2026. Mostra o que entendeu. */
export function DataCampo({
  valor,
  onChange,
  modo,
  placeholder,
}: {
  valor: string | null;
  onChange: (iso: string | null) => void;
  modo: 'inicio' | 'fim';
  placeholder: string;
}) {
  const [texto, setTexto] = useState(valor ? dataBR(valor) : '');
  useEffect(() => {
    if (valor === null) setTexto((t) => (lerData(t, modo) === null ? t : ''));
  }, [valor, modo]);
  const iso = lerData(texto, modo);
  const invalido = texto.trim() !== '' && iso === null;
  return (
    <span className="campo-data">
      <span className={`entrada ${invalido ? 'invalida' : ''}`}>
        <input
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={texto}
          aria-invalid={invalido}
          onChange={(e) => {
            const t = e.target.value;
            setTexto(t);
            onChange(lerData(t, modo));
          }}
        />
        {texto && (
          <button type="button" className="limpar" aria-label="Limpar data" onClick={() => { setTexto(''); onChange(null); }}>
            ×
          </button>
        )}
      </span>
      <small className={invalido ? 'erro' : ''}>{invalido ? 'data inválida' : iso ? `= ${dataBR(iso)}` : ' '}</small>
    </span>
  );
}

/** Idade inteira, de 0 a 130. Não aceita negativo nem decimal. */
export function IdadeCampo({ valor, onChange, placeholder }: { valor: number | null; onChange: (v: number | null) => void; placeholder?: string }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={130}
      step={1}
      className="campo-idade"
      value={valor ?? ''}
      placeholder={placeholder}
      onKeyDown={(e) => ['-', '+', 'e', 'E', ',', '.'].includes(e.key) && e.preventDefault()}
      onChange={(e) => {
        if (e.target.value === '') return onChange(null);
        const n = Math.trunc(Number(e.target.value));
        onChange(Number.isFinite(n) ? Math.min(130, Math.max(0, n)) : null);
      }}
    />
  );
}
