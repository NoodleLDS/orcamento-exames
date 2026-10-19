import { useEffect, useRef, useState } from 'react';

const reduzir = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Número que "conta" do valor anterior até o novo (600 ms, desacelerando). */
export function Num({ valor, formato }: { valor: number; formato: (n: number) => string }) {
  const [mostrado, setMostrado] = useState(valor);
  const atual = useRef(valor);
  useEffect(() => {
    const de = atual.current;
    if (de === valor || reduzir() || !Number.isFinite(de) || !Number.isFinite(valor)) {
      atual.current = valor;
      setMostrado(valor);
      return;
    }
    const t0 = performance.now();
    let id = 0;
    const passo = (t: number) => {
      const k = Math.min(1, (t - t0) / 600);
      const e = 1 - Math.pow(1 - k, 3);
      const bruto = de + (valor - de) * e;
      const v = Number.isInteger(valor) ? Math.round(bruto) : bruto;
      atual.current = v;
      setMostrado(k === 1 ? valor : v);
      if (k < 1) id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [valor]);
  return <>{formato(mostrado)}</>;
}
