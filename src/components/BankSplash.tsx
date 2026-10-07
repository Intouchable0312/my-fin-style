import { useEffect, useState } from "react";
import { logoPaths } from "./LogoPaths";

export function BankSplash() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setVisible(false), reduced ? 450 : 2600);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return <div className="bank-splash" role="status" aria-label="Ouverture de Mon Compte">
    <svg className="bank-splash-logo" viewBox="-40 285 1080 460" aria-label="American Express" role="img">
      <g fillRule="evenodd">{logoPaths.map((d, i) => <path key={i} d={d} pathLength="1" />)}</g>
    </svg>
  </div>;
}