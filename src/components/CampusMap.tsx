// Schematic LNH campus map (not to scale). Building blocks are placeholders until LNH supplies the site plan.
type Pin = { id: string; name: string; building: string; mapX: number; mapY: number };

const BLOCKS: { x: number; y: number; w: number; h: number; label: string }[] = [
  { x: 34, y: 12, w: 30, h: 32, label: "Convention Center" },
  { x: 8, y: 30, w: 24, h: 30, label: "LNMC" },
  { x: 56, y: 8, w: 14, h: 16, label: "Surgical Tower" },
  { x: 64, y: 44, w: 22, h: 14, label: "Clinical Skills Centre" },
  { x: 18, y: 64, w: 26, h: 14, label: "College of Nursing" },
  { x: 74, y: 10, w: 20, h: 24, label: "Main Hospital · Radiology" },
  { x: 47, y: 52, w: 14, h: 14, label: "BSMT" },
];

export function CampusMap({ pins, active, dark, href, className }: { pins: Pin[]; active?: string | null; dark?: boolean; href?: (p: Pin) => string; className?: string }) {
  const c = dark
    ? { bg: "#071331", grid: "rgba(63,184,240,0.08)", block: "rgba(21,96,212,0.18)", stroke: "rgba(63,184,240,0.45)", text: "#9fb3d9", road: "rgba(255,255,255,0.08)", pin: "#3FB8F0", on: "#FF4D5E", label: "#ffffff" }
    : { bg: "#f1f5fb", grid: "rgba(10,46,110,0.06)", block: "#dfe8f6", stroke: "#9db3d8", text: "#4b5d7f", road: "#e3e8f0", pin: "#1560D4", on: "#D2192E", label: "#0A2E6E" };
  return (
    <svg viewBox="0 0 100 86" className={className} role="img" aria-label="Campus map with workshop venues">
      <defs>
        <pattern id={`g${dark ? "d" : "l"}`} width="4" height="4" patternUnits="userSpaceOnUse"><path d="M4 0H0V4" fill="none" stroke={c.grid} strokeWidth="0.2" /></pattern>
      </defs>
      <rect width="100" height="86" fill={c.bg} />
      <rect width="100" height="86" fill={`url(#g${dark ? "d" : "l"})`} />
      {/* roads */}
      <rect x="0" y="80" width="100" height="6" fill={c.road} />
      <rect x="32" y="46" width="3" height="34" fill={c.road} />
      <rect x="4" y="46" width="92" height="3" fill={c.road} />
      <text x="50" y="84" textAnchor="middle" fontSize="2.4" fill={c.text} letterSpacing="0.4">STADIUM ROAD · MAIN GATE ▲</text>
      {BLOCKS.map((b) => (
        <g key={b.label}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="1.6" fill={c.block} stroke={c.stroke} strokeWidth="0.3" />
          <text x={b.x + 1.5} y={b.y + 3.4} fontSize="2.1" fill={c.text} fontWeight="600">{b.label}</text>
        </g>
      ))}
      {pins.map((p) => {
        const on = p.id === active;
        const g = (
          <g key={p.id} transform={`translate(${p.mapX} ${p.mapY * 0.86})`} style={{ cursor: href ? "pointer" : undefined }}>
            <title>{`${p.name} — ${p.building}`}</title>
            {on && <circle r="4.2" fill={c.on} opacity="0.18"><animate attributeName="r" values="2.5;5;2.5" dur="2s" repeatCount="indefinite" /></circle>}
            <path d="M0 0 C -2.4 -3 -2.4 -5.6 0 -5.6 C 2.4 -5.6 2.4 -3 0 0 Z" fill={on ? c.on : c.pin} stroke="#fff" strokeWidth="0.35" />
            <circle cy="-3.9" r="0.8" fill="#fff" />
            {(on || (!active && pins.length <= 12)) && <text y="2.8" textAnchor="middle" fontSize={on ? 2.3 : 1.8} fontWeight={on ? 700 : 500} fill={on ? c.label : c.text}>{p.name}</text>}
          </g>
        );
        return href ? <a key={p.id} href={href(p)}>{g}</a> : g;
      })}
    </svg>
  );
}
