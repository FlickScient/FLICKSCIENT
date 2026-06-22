// @ts-nocheck
export default function CircularProgress({ pct, size = 130, stroke = 10, label, sublabel }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ - (pct / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1c1c26" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EAB308" strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute text-center pointer-events-none">
        <div className="text-2xl font-black text-yellow-500">{pct}%</div>
        {label    && <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{label}</div>}
        {sublabel && <div className="text-[8px] text-gray-600">{sublabel}</div>}
      </div>
    </div>
  );
}
