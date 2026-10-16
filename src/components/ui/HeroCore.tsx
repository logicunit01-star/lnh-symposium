/** "Digital heart" — an AI core with orbiting rings for AI, Robotics and Digitization and an ECG trace running through it. */
export function HeroCore({ className }: { className?: string }) {
  const ticks = Array.from({ length: 72 }, (_, i) => i);
  return (
    <svg viewBox="0 0 600 600" className={className} role="img" aria-label="AI, Robotics and Digitization orbiting a digital heart">
      <defs>
        <radialGradient id="core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="18%" stopColor="#3FB8F0" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#1560D4" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#040B1E" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ring" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#3FB8F0" />
          <stop offset="60%" stopColor="#1560D4" />
          <stop offset="100%" stopColor="#D2192E" />
        </linearGradient>
        <linearGradient id="ecg" x1="0" x2="1">
          <stop offset="0%" stopColor="#D2192E" stopOpacity="0" />
          <stop offset="45%" stopColor="#FF4D5E" />
          <stop offset="100%" stopColor="#3FB8F0" stopOpacity="0" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <circle cx="300" cy="300" r="230" fill="url(#core)" opacity="0.55" />
      <g className="origin-center animate-spinslow" style={{ transformOrigin: "300px 300px" }}>
        {ticks.map((i) => {
          const a = (i / ticks.length) * Math.PI * 2, r1 = 262, r2 = i % 6 === 0 ? 248 : 255;
          return <line key={i} x1={300 + Math.cos(a) * r1} y1={300 + Math.sin(a) * r1} x2={300 + Math.cos(a) * r2} y2={300 + Math.sin(a) * r2} stroke="#3FB8F0" strokeOpacity={i % 6 === 0 ? 0.8 : 0.3} strokeWidth="1.2" />;
        })}
      </g>
      <g style={{ transformOrigin: "300px 300px" }} className="animate-orbit">
        <ellipse cx="300" cy="300" rx="215" ry="80" fill="none" stroke="url(#ring)" strokeWidth="1.4" strokeOpacity="0.8" transform="rotate(-25 300 300)" />
        <circle cx="105" cy="390" r="7" fill="#3FB8F0" filter="url(#glow)" />
      </g>
      <g style={{ transformOrigin: "300px 300px" }} className="animate-orbit-rev">
        <ellipse cx="300" cy="300" rx="80" ry="215" fill="none" stroke="url(#ring)" strokeWidth="1.2" strokeOpacity="0.6" transform="rotate(35 300 300)" />
        <circle cx="420" cy="122" r="6" fill="#FF4D5E" filter="url(#glow)" />
      </g>
      <g style={{ transformOrigin: "300px 300px" }} className="animate-orbit-slow">
        <circle cx="300" cy="300" r="175" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeDasharray="2 8" />
        <circle cx="475" cy="300" r="5" fill="#ffffff" filter="url(#glow)" />
      </g>
      {/* hexagonal chip */}
      <g filter="url(#glow)">
        <polygon points="300,212 376,256 376,344 300,388 224,344 224,256" fill="#040B1E" fillOpacity="0.6" stroke="#3FB8F0" strokeWidth="1.5" />
        <polygon points="300,236 355,268 355,332 300,364 245,332 245,268" fill="none" stroke="#1560D4" strokeOpacity="0.8" />
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          return <g key={i}><line x1={300 + Math.cos(a) * 88} y1={300 + Math.sin(a) * 88} x2={300 + Math.cos(a) * 130} y2={300 + Math.sin(a) * 130} stroke="#3FB8F0" strokeOpacity="0.55" /><circle cx={300 + Math.cos(a) * 132} cy={300 + Math.sin(a) * 132} r="3.5" fill="#3FB8F0" /></g>;
        })}
      </g>
      {/* ECG line through the core */}
      <path className="animate-ecg" d="M40 300 H200 l14 -10 l12 10 h18 l10 -70 l14 130 l12 -80 l10 20 h26 l12 -12 l12 12 H560" fill="none" stroke="url(#ecg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" strokeDasharray="900" />
      <text x="300" y="306" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="22" fill="#ffffff" letterSpacing="2" opacity="0.92">LNH</text>
    </svg>
  );
}
