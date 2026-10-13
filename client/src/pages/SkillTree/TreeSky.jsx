// Fundo da Árvore de habilidades: céu de manhã, nuvens passando, morros e
// grama, e algumas folhas caindo devagar (sem Math.random no render).
const CLOUDS = [
  { top: '8%', w: 180, d: 70, delay: -10 },
  { top: '18%', w: 120, d: 90, delay: -50 },
  { top: '5%', w: 140, d: 110, delay: -80 },
]
const LEAVES = [
  { left: '12%', d: 14, delay: 0, c: '#7CC451' },
  { left: '30%', d: 18, delay: -6, c: '#F2B53A' },
  { left: '58%', d: 16, delay: -3, c: '#6CC64A' },
  { left: '74%', d: 20, delay: -11, c: '#9BD86A' },
  { left: '88%', d: 15, delay: -8, c: '#F2B53A' },
]

export default function TreeSky() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(#BEE7FB_0%,#E3F5FC_45%,#F3FAEC_70%)]" />
      <div className="absolute right-[8%] top-[6%] h-24 w-24 rounded-full bg-[#FFE68A] opacity-80 blur-[2px] shadow-[0_0_80px_30px_rgba(255,230,138,0.55)]" />
      {CLOUDS.map((c, i) => (
        <span key={i} className="ts-cloud absolute" style={{ top: c.top, width: c.w, animationDuration: `${c.d}s`, animationDelay: `${c.delay}s` }}>
          <span className="block h-10 rounded-full bg-white/90" />
          <span className="absolute -top-5 left-[22%] block h-12 w-[44%] rounded-full bg-white/90" />
        </span>
      ))}
      <svg className="absolute inset-x-0 bottom-0 h-[38%] w-full" viewBox="0 0 1000 300" preserveAspectRatio="none">
        <path d="M0 140 C160 80 300 120 440 100 C600 76 760 60 1000 110 L1000 300 L0 300 Z" fill="#CDEBB0" />
        <path d="M0 200 C200 150 360 190 520 170 C700 148 840 160 1000 180 L1000 300 L0 300 Z" fill="#A9DC84" />
        <path d="M0 250 C240 228 520 246 760 236 C860 232 940 238 1000 242 L1000 300 L0 300 Z" fill="#8CCD62" />
      </svg>
      {LEAVES.map((l, i) => (
        <span key={i} className="ts-leaf absolute top-[-4%] h-3 w-2 rounded-[60%_0_60%_0]" style={{ left: l.left, background: l.c, animationDuration: `${l.d}s`, animationDelay: `${l.delay}s` }} />
      ))}
    </div>
  )
}
