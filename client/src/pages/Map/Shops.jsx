import { PLOT, iso } from './geometry'
import { BASE_Z, INSET, SHOP_HEIGHT } from './shopLayout'

// Os 6 prédios do jogo desenhados no próprio estilo do jogo (formas simples,
// cores chapadas com um brilho leve, cantos arredondados), na geometria
// isométrica do mapa: base creme com gramado do tamanho do quarteirão, a
// casinha em cima, um símbolo brilhante no telhado e a plaquinha de madeira.

const STROKE = { stroke: '#24331F', strokeOpacity: 0.14, strokeWidth: 1.5, strokeLinejoin: 'round' }

const P = (u, v, z = 0) => {
  const [x, y] = iso(u, v)
  return [x, y - z]
}
const poly = (...list) => list.map((p) => P(...p).map((n) => n.toFixed(1)).join(',')).join(' ')

// paleta de cada prédio: paredes (frente clara, lado na sombra), telhado,
// toldo (cor + branco) e porta
const THEME = {
  bank: { wall: ['#FBF8F2', '#DCD3C2'], roof: ['#5B8EEB', '#2F5FC4'], door: '#2F5FC4' },
  mercadinho: { wall: ['#FFF3DC', '#E7D3A9'], roof: ['#7DCB55', '#4B9A2C'], awning: '#5CB848', door: '#A9693A' },
  utilities: { wall: ['#FFF2C9', '#E8CF86'], roof: ['#F5BC42', '#C98A12'], awning: '#F2B53A', door: '#2F7FE0' },
  internet: { wall: ['#EAF8FB', '#C1E2EB'], roof: ['#33BDD6', '#0E8FA6'], awning: '#2BB8D2', door: '#0E8FA6' },
  leisure: { wall: ['#FFEAF4', '#F0C3D8'], roof: ['#F27AB5', '#C2337F'], awning: '#F06AAE', door: '#8A2C5E' },
}

// a base creme: (a, b) = canto de trás, s = lado
const plinthOf = (pu, pv) => ({ a: pu + INSET, b: pv + INSET, s: PLOT - 2 * INSET })

// Gradientes usados pelos desenhos (uma vez, no <defs> do mapa).
export function ShopDefs() {
  return (
    <>
      <radialGradient id="shop-gold" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#FFF4B8" /><stop offset=".55" stopColor="#F7C844" /><stop offset="1" stopColor="#D4930F" /></radialGradient>
      <radialGradient id="shop-red" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#FFB8AE" /><stop offset=".55" stopColor="#EF4E3E" /><stop offset="1" stopColor="#B4241B" /></radialGradient>
      <radialGradient id="shop-orange" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#FFE2A8" /><stop offset=".55" stopColor="#FFA42B" /><stop offset="1" stopColor="#D8700C" /></radialGradient>
      <radialGradient id="shop-green" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#E0F8BC" /><stop offset=".55" stopColor="#8CD34C" /><stop offset="1" stopColor="#4C982A" /></radialGradient>
      <radialGradient id="shop-blue" cx=".38" cy=".45" r=".8"><stop offset="0" stopColor="#C4EEFF" /><stop offset=".55" stopColor="#3DB5F2" /><stop offset="1" stopColor="#1477C9" /></radialGradient>
      <radialGradient id="shop-bulb" cx=".4" cy=".35" r=".75"><stop offset="0" stopColor="#FFFCE0" /><stop offset=".55" stopColor="#FFE15C" /><stop offset="1" stopColor="#F2A812" /></radialGradient>
      <radialGradient id="shop-leaf" cx=".4" cy=".3" r=".85"><stop offset="0" stopColor="#A9E57C" /><stop offset=".6" stopColor="#77C750" /><stop offset="1" stopColor="#4F9E3D" /></radialGradient>
      <radialGradient id="shop-glow"><stop offset="0" stopColor="#FFE68A" stopOpacity=".7" /><stop offset="1" stopColor="#FFE68A" stopOpacity="0" /></radialGradient>
      <linearGradient id="shop-trunk" x1="0" x2="1"><stop offset="0" stopColor="#6E4426" /><stop offset=".45" stopColor="#B07A4A" /><stop offset="1" stopColor="#5E3A20" /></linearGradient>
    </>
  )
}

// ── peças ────────────────────────────────────────────────────────────────

// caixa isométrica: (u, v) canto de trás, du × dv de chão, de z até z + h
function Box({ u, v, du, dv, z, h, top, left, right, stroke = true }) {
  const s = stroke ? STROKE : {}
  return (
    <>
      <polygon points={poly([u, v + dv, z], [u + du, v + dv, z], [u + du, v + dv, z + h], [u, v + dv, z + h])} fill={left} {...s} />
      <polygon points={poly([u + du, v, z], [u + du, v + dv, z], [u + du, v + dv, z + h], [u + du, v, z + h])} fill={right} {...s} />
      <polygon points={poly([u, v, z + h], [u + du, v, z + h], [u + du, v + dv, z + h], [u, v + dv, z + h])} fill={top} {...s} />
    </>
  )
}

// a base creme do quarteirão com o gramado em cima
function Plinth({ pu, pv }) {
  const { a, b, s } = plinthOf(pu, pv)
  const g = 9
  return (
    <>
      <Box u={a} v={b} du={s} dv={s} z={0} h={BASE_Z} top="#F7EBD5" left="#E9D7B5" right="#D6BE94" />
      <polygon points={poly([a + g, b + g, BASE_Z], [a + s - g, b + g, BASE_Z], [a + s - g, b + s - g, BASE_Z], [a + g, b + s - g, BASE_Z])} fill="#8FD45F" stroke="#B8E78E" strokeWidth="4" strokeLinejoin="round" />
    </>
  )
}

function Bushes({ pu, pv, lit }) {
  const { a, b, s } = plinthOf(pu, pv)
  const [x1, y1] = P(a + 12, b + s - 18, BASE_Z)
  const [x2, y2] = P(a + 24, b + s - 9, BASE_Z)
  return (
    <g>
      <circle cx={x1} cy={y1 - 8} r="10" fill="#4FA63F" />
      <circle cx={x1 - 3} cy={y1 - 11} r="4" fill="#7CCB55" opacity=".7" />
      <circle cx={x2} cy={y2 - 6} r="7.5" fill="#5DB84B" />
      <circle cx={x2 + 9} cy={y2 - 1} r="2.6" fill={lit ? '#FFD6E8' : '#FF8CC6'} />
      <circle cx={x2 - 11} cy={y2 + 2} r="2.2" fill="#FFFFFF" />
    </g>
  )
}

// plaquinha de madeira no gramado da frente, com o ícone do prédio
function Signpost({ pu, pv, icon }) {
  const { a, b, s } = plinthOf(pu, pv)
  const [x, y] = P(a + s - 12, b + s - 16, BASE_Z)
  return (
    <g>
      <rect x={x - 2.5} y={y - 32} width="5" height="32" rx="2" fill="#8A5A33" />
      <rect x={x - 19} y={y - 47} width="38" height="23" rx="6" fill="#C08A55" stroke="#8A5A33" strokeWidth="2.5" />
      <g transform={`translate(${x} ${y - 35.5})`} stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {icon === 'coin' && <><circle r="6.5" /><path d="M0 -3.5 V3.5" /></>}
        {icon === 'cart' && <><path d="M-8 -5 h3 l3 8 h9 l2.5 -6 h-13" /><circle cx="-1" cy="5.5" r="1" fill="#fff" /><circle cx="6" cy="5.5" r="1" fill="#fff" /></>}
        {icon === 'bolt' && <path d="M2 -7 L-4 1 H1 L-2 7 L5 -1 H0 Z" fill="#fff" strokeWidth="1" />}
        {icon === 'wifi' && <><path d="M-8 -1 A11 11 0 0 1 8 -1 M-4.5 2.5 A6 6 0 0 1 4.5 2.5" /><circle cx="0" cy="5.5" r="1.2" fill="#fff" /></>}
        {icon === 'star' && <path d="M0 -7 l2 4.3 4.7 .5 -3.5 3.2 1 4.6 -4.2 -2.4 -4.2 2.4 1 -4.6 -3.5 -3.2 4.7 -.5z" fill="#fff" strokeWidth="1" />}
        {icon === 'check' && <path d="M-6 0 l4 4 8 -8" strokeWidth="3" />}
      </g>
    </g>
  )
}

// sombra suave da casinha no gramado
function ContactShadow({ u, v, d }) {
  return <polygon points={poly([u - 2, v + 6, BASE_Z], [u + d + 8, v + 6, BASE_Z], [u + d + 8, v + d + 10, BASE_Z], [u - 2, v + d + 10, BASE_Z])} fill="#24331F" opacity=".13" />
}

// janela num plano: na frente (+v, eixo u) ou no lado (+u, eixo v)
function Window({ plane, at, a1, a2, z1, z2, lit }) {
  const glass = lit ? '#FFE08A' : '#CFEAF6'
  const corners = plane === 'front'
    ? [[a1, at, z1], [a2, at, z1], [a2, at, z2], [a1, at, z2]]
    : [[at, a1, z1], [at, a2, z1], [at, a2, z2], [at, a1, z2]]
  const mid = (a1 + a2) / 2
  const zm = (z1 + z2) / 2
  const bar = plane === 'front'
    ? [[mid, at, z1], [mid, at, z2], [a1, at, zm], [a2, at, zm]]
    : [[at, mid, z1], [at, mid, z2], [at, a1, zm], [at, a2, zm]]
  const [b1, b2, b3, b4] = bar.map((p) => P(...p))
  return (
    <g>
      <polygon points={poly(...corners)} fill={glass} stroke="#FFFFFF" strokeWidth="3" strokeLinejoin="round" />
      <path d={`M${b1} L${b2} M${b3} L${b4}`} stroke="#FFFFFF" strokeWidth="2" opacity=".85" />
      {lit && <polygon points={poly(...corners)} fill="#FFE08A" opacity=".35" style={{ filter: 'blur(3px)' }} />}
    </g>
  )
}

// porta em arco na frente (+v)
function Door({ at, u1, u2, z1, z2, fill }) {
  const bl = P(u1, at, z1)
  const br = P(u2, at, z1)
  const tl = P(u1, at, z2)
  const tr = P(u2, at, z2)
  const c = P((u1 + u2) / 2, at, z2 + (u2 - u1) * 0.62)
  const knob = P(u2 - (u2 - u1) * 0.22, at, (z1 + z2) / 2)
  return (
    <g>
      <path d={`M${bl} L${tl} Q${c} ${tr} L${br} Z`} fill={fill} {...STROKE} />
      <circle cx={knob[0]} cy={knob[1]} r="1.8" fill="#FFE08A" />
    </g>
  )
}

// toldo listrado na frente, inclinado para fora
function Awning({ u, at, d, zTop, color }) {
  const n = 5
  const out = 12
  const zb = zTop - 11
  const w = (d - 8) / n
  return (
    <g>
      {Array.from({ length: n }, (_, k) => {
        const a = u + 4 + k * w
        return <polygon key={k} points={poly([a, at, zTop], [a + w, at, zTop], [a + w, at + out, zb], [a, at + out, zb])} fill={k % 2 ? '#FFFFFF' : color} {...STROKE} />
      })}
      {Array.from({ length: n }, (_, k) => {
        const [cx, cy] = P(u + 4 + (k + 0.5) * w, at + out, zb)
        return <ellipse key={`s${k}`} cx={cx} cy={cy + 1} rx={w * 0.55} ry="4" fill={k % 2 ? '#FFFFFF' : color} {...STROKE} />
      })}
    </g>
  )
}

// ── símbolos do telhado (em pixels, a partir do centro do telhado) ──────────

function Coin({ x, y }) {
  return (
    <g transform={`translate(${x} ${y - 30})`}>
      <circle r="40" fill="url(#shop-glow)" />
      <circle r="22" fill="url(#shop-gold)" stroke="#C98A12" strokeWidth="3" />
      <circle r="16" fill="none" stroke="#FFE38A" strokeWidth="2" />
      <path d="M6 -8 C2 -12 -7 -11 -7 -5 C-7 2 7 -1 7 6 C7 12 -3 13 -8 8 M0 -15 V15" stroke="#8A5A0B" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <ellipse cx="-8" cy="-11" rx="6" ry="3.5" transform="rotate(-30 -8 -11)" fill="#FFFFFF" opacity=".75" />
    </g>
  )
}

function Star({ x, y, r = 20 }) {
  const p = Array.from({ length: 10 }, (_, k) => {
    const a = -Math.PI / 2 + (k * Math.PI) / 5
    const rr = k % 2 ? r * 0.46 : r
    return `${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`
  }).join(' ')
  return (
    <g transform={`translate(${x} ${y - 28})`}>
      <circle r={r * 1.9} fill="url(#shop-glow)" />
      <polygon points={p} fill="url(#shop-gold)" stroke="#C98A12" strokeWidth="2.5" strokeLinejoin="round" />
      <ellipse cx={-r * 0.3} cy={-r * 0.35} rx={r * 0.25} ry={r * 0.14} transform={`rotate(-30 ${-r * 0.3} ${-r * 0.35})`} fill="#FFFFFF" opacity=".8" />
    </g>
  )
}

// Enfeite da casa do Lazer conforme o mês (o lazer do calendário).
function LeisureDeco({ month, x, y, pu, pv }) {
  const { a, b, s } = plinthOf(pu, pv)
  const [lx, ly] = P(a + 10, b + s - 22, BASE_Z) // gramado da frente, à esquerda
  switch (month) {
    case 1: // Ano Novo na praia: guarda-sol e boia
      return (
        <g>
          <rect x={lx - 1.5} y={ly - 40} width="3" height="40" fill="#8A5A33" />
          <path d={`M${lx - 22} ${ly - 36} Q${lx} ${ly - 62} ${lx + 22} ${ly - 36} Z`} fill="#FF6B6B" stroke="#FFFFFF" strokeWidth="2" />
          <path d={`M${lx - 8} ${ly - 38} Q${lx} ${ly - 60} ${lx + 8} ${ly - 38}`} fill="#FFFFFF" />
          <ellipse cx={lx + 26} cy={ly - 4} rx="11" ry="6" fill="none" stroke="#2BB8D2" strokeWidth="5" />
        </g>
      )
    case 2: // Carnaval: confete e serpentina
      return (
        <g>
          {[[-30, -70, '#F06AAE'], [24, -78, '#2BB8D2'], [-14, -92, '#F5BC42'], [34, -58, '#7DCB55'], [-36, -48, '#8A5CF6'], [10, -98, '#EF4E3E']].map(([dx, dy, c], k) => <rect key={k} x={x + dx} y={y + dy} width="6" height="6" rx="1.5" fill={c} transform={`rotate(${k * 35} ${x + dx} ${y + dy})`} />)}
          <path d={`M${x - 40} ${y - 30} q10 -14 20 0 q10 14 20 0 q10 -14 20 0 q10 14 20 0`} stroke="#F5BC42" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )
    case 3: // Dia do Consumidor: etiquetas de oferta
      return (
        <g>
          {[[lx - 4, ly - 26, '#EF4E3E'], [lx + 18, ly - 14, '#F5BC42']].map(([tx, ty, c], k) => (
            <g key={k} transform={`rotate(${k ? 12 : -14} ${tx} ${ty})`}>
              <path d={`M${tx - 12} ${ty - 8} h18 l7 8 l-7 8 h-18 z`} fill={c} stroke="#FFFFFF" strokeWidth="2" />
              <circle cx={tx + 8} cy={ty} r="2" fill="#FFFFFF" />
            </g>
          ))}
        </g>
      )
    case 4: // Páscoa: ovos no gramado
      return (
        <g>
          {[[lx - 6, ly - 4, '#F06AAE'], [lx + 12, ly + 2, '#7DCB55'], [lx + 28, ly - 6, '#5B8EEB']].map(([ex, ey, c], k) => (
            <g key={k}>
              <ellipse cx={ex} cy={ey - 9} rx="7" ry="9.5" fill={c} stroke="#FFFFFF" strokeWidth="1.5" />
              <path d={`M${ex - 6} ${ey - 9} q3 -3 6 0 q3 3 6 0`} stroke="#FFFFFF" strokeWidth="1.8" fill="none" />
            </g>
          ))}
        </g>
      )
    case 5: // jantar a dois: coração e luzinhas
      return (
        <g>
          <path d={`M${x - 34} ${y - 70} c4 -10 18 -10 18 2 c0 -12 14 -12 18 -2 c3 9 -9 18 -18 24 c-9 -6 -21 -15 -18 -24z`} fill="#EF4E3E" stroke="#FFFFFF" strokeWidth="2" />
        </g>
      )
    case 6: // festa junina: bandeirinhas
      return (
        <g>
          <path d={`M${x - 58} ${y - 6} Q${x} ${y + 10} ${x + 58} ${y - 6}`} stroke="#8A5A33" strokeWidth="1.5" fill="none" />
          {Array.from({ length: 7 }, (_, k) => {
            const t = (k + 0.5) / 7
            const fx = x - 58 + 116 * t
            const fy = y - 6 + 16 * 4 * t * (1 - t) * 0.5
            const c = ['#EF4E3E', '#F5BC42', '#2BB8D2', '#7DCB55', '#F06AAE', '#8A5CF6', '#FF8A3D'][k]
            return <path key={k} d={`M${fx - 6} ${fy} L${fx + 6} ${fy} L${fx} ${fy + 11} Z`} fill={c} />
          })}
        </g>
      )
    case 8: // festival de música: notas
      return (
        <g fill="#8A5CF6">
          <path d={`M${x - 36} ${y - 60} v-18 l12 -3 v18`} stroke="#8A5CF6" strokeWidth="2.5" fill="none" />
          <ellipse cx={x - 39} cy={y - 60} rx="4.5" ry="3.5" />
          <ellipse cx={x - 27} cy={y - 63} rx="4.5" ry="3.5" />
          <path d={`M${x + 34} ${y - 76} v-16`} stroke="#2BB8D2" strokeWidth="2.5" />
          <ellipse cx={x + 31} cy={y - 76} rx="4.5" ry="3.5" fill="#2BB8D2" />
        </g>
      )
    case 9: // kart: bandeira quadriculada
      return (
        <g>
          <rect x={lx - 1.5} y={ly - 44} width="3" height="44" fill="#6B7280" />
          <g transform={`translate(${lx + 1.5} ${ly - 44})`}>
            {Array.from({ length: 12 }, (_, k) => <rect key={k} x={(k % 4) * 6} y={Math.floor(k / 4) * 6} width="6" height="6" fill={(k + Math.floor(k / 4)) % 2 ? '#FFFFFF' : '#24331F'} />)}
          </g>
        </g>
      )
    case 10: // Halloween: abóbora no gramado
      return (
        <g transform={`translate(${lx + 8} ${ly - 12})`}>
          <ellipse rx="14" ry="11" fill="url(#shop-orange)" stroke="#B85A0A" strokeWidth="1.5" />
          <path d="M-5 -11 v22 M5 -11 v22" stroke="#C9650C" strokeWidth="1.5" opacity=".6" />
          <rect x="-2" y="-16" width="4" height="6" rx="1.5" fill="#4C982A" />
          <path d="M-7 -2 l3 -3 l3 3z M1 -2 l3 -3 l3 3z M-6 4 q6 4 12 0" fill="#5C2A00" stroke="#5C2A00" strokeWidth="1" />
        </g>
      )
    case 11: // Black Friday: faixa preta com etiqueta vermelha
      return (
        <g transform={`translate(${lx + 10} ${ly - 22}) rotate(-8)`}>
          <rect x="-20" y="-11" width="40" height="22" rx="5" fill="#24331F" />
          <path d="M-4 -6 h12 l5 6 l-5 6 h-12 z" fill="#EF4E3E" />
          <circle cx="7" cy="0" r="1.6" fill="#FFFFFF" />
        </g>
      )
    case 12: // Natal: pinheiro enfeitado
      return (
        <g transform={`translate(${lx + 4} ${ly})`}>
          <rect x="-3" y="-8" width="6" height="8" fill="#8A5A33" />
          <path d="M0 -50 L16 -22 H8 L20 -6 H-20 L-8 -22 H-16 Z" fill="#3E8A39" />
          {[[-6, -20, '#EF4E3E'], [7, -14, '#F5BC42'], [-2, -32, '#2BB8D2'], [9, -26, '#F06AAE']].map(([bx, by, c], k) => <circle key={k} cx={bx} cy={by} r="2.6" fill={c} />)}
          <path d="M0 -58 l2.5 5 5.5 .6 -4 3.7 1.1 5.4 -5.1 -2.8 -5.1 2.8 1.1 -5.4 -4 -3.7 5.5 -.6z" fill="url(#shop-gold)" />
        </g>
      )
    default:
      return null
  }
}

// ── os prédios: cada um com o seu formato ───────────────────────────────────

// coluna redonda (em pixels): base em (x, y), altura h
function Column({ x, y, h, r = 4.5 }) {
  return (
    <g>
      <rect x={x - r} y={y - h} width={r * 2} height={h} fill="#FFFFFF" {...STROKE} />
      <rect x={x + r * 0.2} y={y - h} width={r * 0.8} height={h} fill="#E6E0D4" />
      <rect x={x - r - 2} y={y - h - 4} width={r * 2 + 4} height="5" rx="1.5" fill="#F1ECE2" {...STROKE} />
      <rect x={x - r - 2} y={y - 3} width={r * 2 + 4} height="4" rx="1.5" fill="#F1ECE2" {...STROKE} />
    </g>
  )
}

// cilindro em pixels: chão em (x, y), raio r, altura h
function Cylinder({ x, y, r, h, body, top, stripes }) {
  const ry = r / 2
  return (
    <g>
      <path d={`M${x - r} ${y - h} V${y} A${r} ${ry} 0 0 0 ${x + r} ${y} V${y - h} Z`} fill={body} {...STROKE} />
      {stripes && Array.from({ length: 6 }, (_, k) => {
        // listras verticais só na metade da frente
        const t1 = -1 + (k * 2) / 6
        const t2 = t1 + 1 / 6
        const x1 = x + r * t1
        const x2 = x + r * t2
        return <path key={k} d={`M${x1} ${y - h} V${y + ry * Math.sqrt(1 - t1 * t1)} L${x2} ${y + ry * Math.sqrt(Math.max(0, 1 - t2 * t2))} V${y - h} Z`} fill={stripes} />
      })}
      <path d={`M${x + r * 0.35} ${y - h} V${y + ry * 0.93} L${x + r * 0.95} ${y + ry * 0.3} V${y - h} Z`} fill="#24331F" opacity=".1" />
      <ellipse cx={x} cy={y - h} rx={r} ry={ry} fill={top} {...STROKE} />
    </g>
  )
}

// Inabank: banco clássico — escadaria larga, colunas grossas, frontão com a
// moeda, porta de cofre, letreiro azul e um caixa eletrônico do lado
function BankShop({ pu, pv, lit }) {
  const t = THEME.bank
  const { a, b } = plinthOf(pu, pv)
  const z = BASE_Z
  const u = a + 14
  const v = b + 6
  const du = 78
  const dv = 70
  const zc = z + 15 // chão do banco, em cima dos degraus
  const H = SHOP_HEIGHT.bank // altura das colunas
  const zt = zc + H // topo das colunas
  const front = v + dv
  const side = u + du
  const [px, py] = P(u + du / 2, front + 4, zt + 17) // centro do frontão
  const [cx, cy] = P(u + du / 2, v + dv / 2, zt + 34)
  const [dx, dy] = P(u + du / 2, front - 14, zc + H * 0.34) // centro da porta de cofre
  const [sx, sy] = P(u + du / 2, front - 14, zc + H * 0.8) // letreiro
  return (
    <g pointerEvents="none">
      <Plinth pu={pu} pv={pv} />
      {/* escadaria larga, descendo para a frente */}
      <Box u={u - 8} v={v - 6} du={du + 16} dv={dv + 22} z={z} h={5} top="#F4EFE5" left="#E2D9C8" right="#CFC4AF" />
      <Box u={u - 4} v={v - 4} du={du + 8} dv={dv + 14} z={z + 5} h={5} top="#F8F4EC" left="#E6DECF" right="#D3C8B5" />
      <Box u={u - 1} v={v - 2} du={du + 2} dv={dv + 6} z={z + 10} h={5} top="#FBF8F2" left="#E9E2D4" right="#D6CDBB" />
      {/* salão atrás das colunas */}
      <Box u={u + 8} v={v + 6} du={du - 18} dv={dv - 20} z={zc} h={H} top={t.wall[0]} left="#EEF3FC" right="#C9D6EE" />
      <Window plane="side" at={side - 10} a1={v + 14} a2={v + 26} z1={zc + H * 0.3} z2={zc + H * 0.72} lit={lit} />
      <Window plane="side" at={side - 10} a1={v + 32} a2={v + 44} z1={zc + H * 0.3} z2={zc + H * 0.72} lit={lit} />
      {/* porta de cofre redonda e o letreiro azul com a moeda */}
      <ellipse cx={dx} cy={dy} rx="13" ry="15" fill="#B8C3D6" stroke="#8592AA" strokeWidth="2" />
      <ellipse cx={dx} cy={dy} rx="9.5" ry="11" fill="#D6DEEA" stroke="#C98A12" strokeWidth="2.5" />
      <path d={`M${dx - 6} ${dy} H${dx + 6} M${dx} ${dy - 7} V${dy + 7}`} stroke="#8592AA" strokeWidth="2" strokeLinecap="round" />
      <circle cx={dx} cy={dy} r="2.5" fill="#C98A12" />
      <rect x={sx - 20} y={sy - 7} width="40" height="14" rx="4" fill={t.door} stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx={sx} cy={sy} r="4.5" fill="url(#shop-gold)" />
      {/* colunas grossas: 3 do lado e 4 na frente */}
      {[0.14, 0.5, 0.86].map((f) => {
        const [x, y] = P(side - 4, v + dv * f, zc)
        return <Column key={`s${f}`} x={x} y={y} h={H} r={5.5} />
      })}
      {[0.06, 0.3, 0.7, 0.94].map((f) => {
        const [x, y] = P(u + du * f, front - 4, zc)
        return <Column key={`f${f}`} x={x} y={y} h={H} r={5.5} />
      })}
      {/* arquitrave e telhado de duas águas, com o frontão virado para a frente */}
      <Box u={u - 4} v={v - 4} du={du + 8} dv={dv + 8} z={zt} h={8} top="#E9EFFB" left="#FBF8F2" right="#DCD3C2" />
      <polygon points={poly([u - 5, v - 5, zt + 8], [u + du / 2, v - 5, zt + 32], [u + du / 2, front + 5, zt + 32], [u - 5, front + 5, zt + 8])} fill={t.roof[1]} {...STROKE} />
      <polygon points={poly([u + du / 2, v - 5, zt + 32], [side + 5, v - 5, zt + 8], [side + 5, front + 5, zt + 8], [u + du / 2, front + 5, zt + 32])} fill={t.roof[0]} {...STROKE} />
      <polygon points={poly([u - 5, front + 5, zt + 8], [side + 5, front + 5, zt + 8], [u + du / 2, front + 5, zt + 32])} fill="#FBF8F2" stroke={t.roof[1]} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={px} cy={py} r="9" fill="url(#shop-gold)" stroke="#C98A12" strokeWidth="1.8" />
      <path d={`M${px + 2.6} ${py - 3.5} C${px + 1} ${py - 5} ${px - 3} ${py - 4.5} ${px - 3} ${py - 2} C${px - 3} ${py + 1} ${px + 3} ${py - 0.5} ${px + 3} ${py + 2.5} C${px + 3} ${py + 5} ${px - 1} ${py + 5.5} ${px - 3.4} ${py + 3.5} M${px} ${py - 6.5} V${py + 6.5}`} stroke="#8A5A0B" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <Coin x={cx} y={cy - 6} />
      {/* caixa eletrônico do lado da escadaria */}
      {(() => {
        const au = side + 10
        const av = front - 2
        const [mx, my] = P(au + 5, av + 6, z + 18)
        return (
          <g>
            <Box u={au} v={av} du={10} dv={12} z={z} h={24} top="#3B6FD0" left="#2F5FC4" right="#234A9C" />
            <rect x={mx - 6} y={my - 4} width="8" height="6" rx="1" fill={lit ? '#BDF0FF' : '#9FD8F0'} />
          </g>
        )
      })()}
      <Signpost pu={pu} pv={pv} icon="coin" />
    </g>
  )
}

// Mercadinho: loja baixa e larga, toldo grande, placa com maçã e banquinhas de fruta
function MarketShop({ pu, pv, lit }) {
  const t = THEME.mercadinho
  const { a, b, s } = plinthOf(pu, pv)
  const z = BASE_Z
  const u = a + 8
  const v = b + 6
  const du = 92
  const dv = 62
  const H = SHOP_HEIGHT.mercadinho
  const front = v + dv
  const side = u + du
  const [bx, by] = P(u + du / 2, front - 6, z + H + 26) // centro da placa
  const crate = (cu, cv, k) => {
    const [x, y] = P(cu, cv, z + 9)
    const colors = [['url(#shop-red)', 'url(#shop-orange)', 'url(#shop-red)'], ['url(#shop-green)', 'url(#shop-green)', 'url(#shop-orange)']][k]
    return (
      <g key={k}>
        <Box u={cu - 9} v={cv - 7} du={18} dv={14} z={z} h={9} top="#D9A066" left="#C08A55" right="#A9733F" />
        {colors.map((c, i) => <circle key={i} cx={x - 7 + i * 7} cy={y - 4 - (i === 1 ? 3 : 0)} r="4.6" fill={c} />)}
      </g>
    )
  }
  return (
    <g pointerEvents="none">
      <Plinth pu={pu} pv={pv} />
      <ContactShadow u={u} v={v} d={Math.max(du, dv)} />
      <Box u={u} v={v} du={du} dv={dv} z={z} h={H} top={t.wall[0]} left={t.wall[0]} right={t.wall[1]} />
      <Window plane="side" at={side} a1={v + dv * 0.2} a2={v + dv * 0.75} z1={z + H * 0.3} z2={z + H * 0.66} lit={lit} />
      <Window plane="front" at={front} a1={u + du * 0.06} a2={u + du * 0.36} z1={z + H * 0.22} z2={z + H * 0.58} lit={lit} />
      <Door at={front} u1={u + du * 0.44} u2={u + du * 0.62} z1={z} z2={z + H * 0.5} fill={t.door} />
      <Window plane="front" at={front} a1={u + du * 0.7} a2={u + du * 0.94} z1={z + H * 0.22} z2={z + H * 0.58} lit={lit} />
      <Awning u={u} at={front} d={du} zTop={z + H * 0.8} color={t.awning} />
      {/* telhado reto com mureta e a placa com a maçã */}
      <Box u={u - 3} v={v - 3} du={du + 6} dv={dv + 6} z={z + H} h={6} top={t.roof[0]} left={t.roof[1]} right={t.roof[1]} />
      <polygon points={poly([u + 16, front - 6, z + H + 6], [side - 16, front - 6, z + H + 6], [side - 16, front - 6, z + H + 34], [u + 16, front - 6, z + H + 34])} fill="#FFFDF7" stroke={t.roof[1]} strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx={bx - 1} cy={by + 2} r="9" fill="url(#shop-red)" />
      <path d={`M${bx - 1} ${by - 7} q1 -5 6 -6`} stroke="#4C982A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx={bx - 4} cy={by - 1} rx="2.6" ry="1.6" fill="#FFFFFF" opacity=".8" />
      {/* banquinhas de fruta na calçada da frente */}
      {crate(a + 22, b + s - 14, 0)}
      {crate(a + 50, b + s - 10, 1)}
      <Signpost pu={pu} pv={pv} icon="cart" />
    </g>
  )
}

// Água e Luz: escritório pequeno, caixa-d'água e um poste com a lâmpada acesa
function UtilityShop({ pu, pv, lit }) {
  const t = THEME.utilities
  const { a, b } = plinthOf(pu, pv)
  const z = BASE_Z
  const u = a + 30
  const v = b + 34
  const du = 58
  const dv = 50
  const H = SHOP_HEIGHT.utilities
  const front = v + dv
  const side = u + du
  const [tx, ty] = P(a + 24, b + 22, z) // pé da caixa-d'água
  const [lx, ly] = P(a + 96, b + 22, z) // pé do poste
  return (
    <g pointerEvents="none">
      <Plinth pu={pu} pv={pv} />
      {/* caixa-d'água em pernas, atrás */}
      <g>
        {[-14, -5, 5, 14].map((dx) => <rect key={dx} x={tx + dx - 2} y={ty - 58} width="4" height="58" fill="#8A94A3" />)}
        <path d={`M${tx - 14} ${ty - 40} L${tx + 14} ${ty - 22} M${tx + 14} ${ty - 40} L${tx - 14} ${ty - 22}`} stroke="#8A94A3" strokeWidth="2" />
        <Cylinder x={tx} y={ty - 56} r={22} h={34} body="url(#shop-blue)" top="#7FD0F7" />
        <path d={`M${tx - 23} ${ty - 90} L${tx} ${ty - 106} L${tx + 23} ${ty - 90} Z`} fill="#1477C9" {...STROKE} />
        <path d={`M${tx} ${ty - 82} C${tx + 5} ${ty - 75} ${tx + 6} ${ty - 72} ${tx + 6} ${ty - 69} A6 6 0 0 1 ${tx - 6} ${ty - 69} C${tx - 6} ${ty - 72} ${tx - 5} ${ty - 75} ${tx} ${ty - 82} Z`} fill="#FFFFFF" />
      </g>
      {/* poste com a lâmpada */}
      <g>
        <rect x={lx - 3} y={ly - 92} width="6" height="92" rx="2" fill="#8A5A33" />
        <rect x={lx - 16} y={ly - 82} width="32" height="4" rx="2" fill="#8A5A33" />
        <path d={`M${lx - 14} ${ly - 78} q14 10 28 0`} stroke="#24331F" strokeOpacity=".5" strokeWidth="1.5" fill="none" />
        <circle cx={lx} cy={ly - 104} r={lit ? 26 : 18} fill="url(#shop-glow)" />
        <rect x={lx - 5} y={ly - 96} width="10" height="6" rx="2" fill="#9AA3AE" />
        <circle cx={lx} cy={ly - 106} r="11" fill="url(#shop-bulb)" {...STROKE} />
        <ellipse cx={lx - 4} cy={ly - 110} rx="3" ry="2" fill="#FFFFFF" opacity=".85" />
      </g>
      <ContactShadow u={u} v={v} d={Math.max(du, dv)} />
      <Box u={u} v={v} du={du} dv={dv} z={z} h={H} top={t.wall[0]} left={t.wall[0]} right={t.wall[1]} />
      <Window plane="side" at={side} a1={v + dv * 0.2} a2={v + dv * 0.8} z1={z + H * 0.36} z2={z + H * 0.7} lit={lit} />
      <Window plane="front" at={front} a1={u + du * 0.08} a2={u + du * 0.36} z1={z + H * 0.3} z2={z + H * 0.62} lit={lit} />
      <Door at={front} u1={u + du * 0.52} u2={u + du * 0.8} z1={z} z2={z + H * 0.56} fill={t.door} />
      <Box u={u - 3} v={v - 3} du={du + 6} dv={dv + 6} z={z + H} h={6} top={t.roof[0]} left={t.roof[1]} right={t.roof[1]} />
      {/* raio no alto da fachada */}
      {(() => {
        const [x, y] = P(u + du * 0.5, front, z + H * 0.86)
        return <path d={`M${x + 2} ${y - 8} L${x - 5} ${y + 1} H${x} L${x - 2} ${y + 8} L${x + 6} ${y - 1} H${x + 1} Z`} fill="#F2A812" stroke="#C98A12" strokeWidth="1" />
      })()}
      <Signpost pu={pu} pv={pv} icon="bolt" />
    </g>
  )
}

// Internet e Celular: loja com parabólica e uma torre de celular ao lado
function TelecomShop({ pu, pv, lit }) {
  const t = THEME.internet
  const { a, b } = plinthOf(pu, pv)
  const z = BASE_Z
  const u = a + 34
  const v = b + 22
  const du = 62
  const dv = 62
  const H = SHOP_HEIGHT.internet
  const front = v + dv
  const side = u + du
  const [tx, ty] = P(a + 16, b + 26, z) // pé da torre
  const top = ty - 132
  const [dx, dy] = P(u + du * 0.6, v + dv * 0.4, z + H + 6) // parabólica
  return (
    <g pointerEvents="none">
      <Plinth pu={pu} pv={pv} />
      {/* torre de treliça */}
      <g stroke="#8A94A3" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d={`M${tx - 14} ${ty} L${tx - 3} ${top} M${tx + 14} ${ty} L${tx + 3} ${top}`} />
        {[0.15, 0.35, 0.55, 0.75].map((f, k) => {
          const y1 = ty - (ty - top) * f
          const y2 = ty - (ty - top) * (f + 0.2)
          const w1 = 14 - 11 * f
          const w2 = 14 - 11 * (f + 0.2)
          return <path key={k} d={`M${tx - w1} ${y1} L${tx + w2} ${y2} M${tx + w1} ${y1} L${tx - w2} ${y2} M${tx - w1} ${y1} H${tx + w1}`} strokeWidth="1.6" />
        })}
      </g>
      <rect x={tx - 12} y={top + 8} width="7" height="16" rx="2" fill="#EAF8FB" {...STROKE} />
      <rect x={tx + 5} y={top + 8} width="7" height="16" rx="2" fill="#EAF8FB" {...STROKE} />
      <circle cx={tx} cy={top - 4} r={lit ? 7 : 4.5} fill="#EF4E3E" opacity={lit ? 0.9 : 1} />
      <path d={`M${tx - 20} ${top - 14} A26 26 0 0 1 ${tx + 20} ${top - 14} M${tx - 11} ${top - 9} A15 15 0 0 1 ${tx + 11} ${top - 9}`} stroke="#0E8FA6" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <ContactShadow u={u} v={v} d={du} />
      <Box u={u} v={v} du={du} dv={dv} z={z} h={H} top={t.wall[0]} left={t.wall[0]} right={t.wall[1]} />
      <Window plane="side" at={side} a1={v + dv * 0.18} a2={v + dv * 0.44} z1={z + H * 0.36} z2={z + H * 0.7} lit={lit} />
      <Window plane="side" at={side} a1={v + dv * 0.56} a2={v + dv * 0.82} z1={z + H * 0.36} z2={z + H * 0.7} lit={lit} />
      <Door at={front} u1={u + du * 0.18} u2={u + du * 0.42} z1={z} z2={z + H * 0.5} fill={t.door} />
      <Window plane="front" at={front} a1={u + du * 0.54} a2={u + du * 0.9} z1={z + H * 0.24} z2={z + H * 0.58} lit={lit} />
      <Awning u={u} at={front} d={du} zTop={z + H * 0.8} color={t.awning} />
      <Box u={u - 3} v={v - 3} du={du + 6} dv={dv + 6} z={z + H} h={6} top={t.roof[0]} left={t.roof[1]} right={t.roof[1]} />
      {/* parabólica no telhado */}
      <rect x={dx - 2} y={dy - 16} width="4" height="16" fill="#9AA3AE" />
      <ellipse cx={dx + 2} cy={dy - 22} rx="15" ry="10" transform={`rotate(-30 ${dx + 2} ${dy - 22})`} fill="#F4F7FA" {...STROKE} />
      <circle cx={dx + 6} cy={dy - 25} r="2.5" fill="#9AA3AE" />
      <Signpost pu={pu} pv={pv} icon="wifi" />
    </g>
  )
}

// Lazer: tenda de circo redonda e listrada, com bandeirinha e o enfeite do mês
function LeisureShop({ pu, pv, lit, month }) {
  const t = THEME.leisure
  const { a, b, s } = plinthOf(pu, pv)
  const z = BASE_Z
  const [cx, cy] = P(a + s / 2 + 4, b + s / 2 - 2, z)
  const r = 44
  const h = SHOP_HEIGHT.leisure
  const apex = cy - h - 56
  return (
    <g pointerEvents="none">
      <Plinth pu={pu} pv={pv} />
      <ellipse cx={cx} cy={cy + 4} rx={r + 6} ry={(r + 6) / 2} fill="#24331F" opacity=".13" />
      <Cylinder x={cx} y={cy} r={r} h={h} body="#FFFFFF" top="#FFEAF4" stripes={t.awning} />
      {/* entrada em arco */}
      <path d={`M${cx - 12} ${cy + r / 2 - 2} V${cy + r / 2 - 26} Q${cx} ${cy + r / 2 - 42} ${cx + 12} ${cy + r / 2 - 26} V${cy + r / 2 - 2} Z`} fill={t.door} {...STROKE} />
      {lit && <path d={`M${cx - 9} ${cy + r / 2 - 4} V${cy + r / 2 - 25} Q${cx} ${cy + r / 2 - 37} ${cx + 9} ${cy + r / 2 - 25} V${cy + r / 2 - 4} Z`} fill="#FFE08A" opacity=".55" />}
      {/* telhado cônico listrado com beiral recortado */}
      {Array.from({ length: 8 }, (_, k) => {
        const t1 = -1 + (k * 2) / 8
        const t2 = t1 + 2 / 8
        const p1 = [cx + (r + 8) * t1, cy - h + ((r + 8) / 2) * Math.sqrt(Math.max(0, 1 - t1 * t1))]
        const p2 = [cx + (r + 8) * t2, cy - h + ((r + 8) / 2) * Math.sqrt(Math.max(0, 1 - t2 * t2))]
        return <path key={k} d={`M${cx} ${apex} L${p1[0]} ${p1[1]} L${p2[0]} ${p2[1]} Z`} fill={k % 2 ? '#FFFFFF' : t.roof[0]} {...STROKE} />
      })}
      {Array.from({ length: 8 }, (_, k) => {
        const tm = -1 + ((k + 0.5) * 2) / 8
        const x = cx + (r + 8) * tm
        const y = cy - h + ((r + 8) / 2) * Math.sqrt(Math.max(0, 1 - tm * tm))
        return <circle key={`b${k}`} cx={x} cy={y + 2} r="6.5" fill={k % 2 ? '#FFFFFF' : t.roof[0]} {...STROKE} />
      })}
      <path d={`M${cx + 10} ${apex + 14} L${cx + 30} ${cy - h + 4}`} stroke="#FFFFFF" strokeWidth="5" opacity=".35" strokeLinecap="round" />
      {/* mastro com bandeirinha (ou o enfeite do mês no lugar da estrela) */}
      <rect x={cx - 1.5} y={apex - 22} width="3" height="24" fill="#8A5A33" />
      <path d={`M${cx + 1.5} ${apex - 22} l20 6 l-20 6 z`} fill={t.roof[1]} />
      {month !== 7 && month !== 10 && <Star x={cx} y={apex - 2} r={14} />}
      {month === 7 && (
        <g transform={`translate(${cx} ${apex - 30})`}>
          <circle r="26" fill="url(#shop-glow)" />
          <path d="M0 14 L-14 -12 Q0 -18 14 -12 Z" fill="#FFD27A" stroke="#C98A12" strokeWidth="2" strokeLinejoin="round" />
          {[[-4, -6], [5, -4], [0, 3]].map(([px, py], k) => <circle key={k} cx={px} cy={py} r="2.6" fill="#EF4E3E" />)}
        </g>
      )}
      {month === 10 && (
        <g transform={`translate(${cx} ${apex - 30})`}>
          <circle r="26" fill="url(#shop-glow)" />
          <ellipse rx="15" ry="12" fill="url(#shop-orange)" stroke="#B85A0A" strokeWidth="1.5" />
          <path d="M-7 -3 l3 -4 l3 4z M1 -3 l3 -4 l3 4z M-7 4 q7 5 14 0" fill="#5C2A00" stroke="#5C2A00" strokeWidth="1" />
        </g>
      )}
      <LeisureDeco month={month} x={cx} y={cy - h} pu={pu} pv={pv} />
      <Bushes pu={pu} pv={pv} lit={lit} />
      <Signpost pu={pu} pv={pv} icon="star" />
    </g>
  )
}

// A Árvore de habilidades no centro: mesma base, tronco, copa e frutos de ouro.
function SkillTreeShop({ pu, pv, lit }) {
  const [cx, cy] = P(pu + PLOT / 2, pv + PLOT / 2, BASE_Z)
  const canopy = [[0, -104, 44], [-34, -88, 34], [34, -88, 34], [-20, -124, 30], [22, -126, 30], [0, -74, 32]]
  const fruits = [[-24, -100], [18, -114], [30, -86], [-6, -82], [-34, -78], [4, -132], [12, -96]]
  return (
    <g pointerEvents="none">
      <Plinth pu={pu} pv={pv} />
      <ellipse cx={cx} cy={cy + 2} rx="40" ry="14" fill="#24331F" opacity=".14" />
      <path d={`M${cx - 16} ${cy + 4} Q${cx - 9} ${cy - 2} ${cx - 8} ${cy - 26} L${cx - 6} ${cy - 62} L${cx + 6} ${cy - 62} L${cx + 8} ${cy - 26} Q${cx + 9} ${cy - 2} ${cx + 16} ${cy + 4} Z`} fill="url(#shop-trunk)" {...STROKE} />
      <path d={`M${cx - 4} ${cy - 10} q-2 -20 1 -40 M${cx + 4} ${cy - 16} q2 -18 -1 -34`} stroke="#4A2C16" strokeOpacity=".35" strokeWidth="2" fill="none" strokeLinecap="round" />
      <g>{canopy.map(([dx, dy, r], k) => <circle key={k} cx={cx + dx} cy={cy + dy + 8} r={r} fill="#3E8A39" />)}</g>
      <g>{canopy.map(([dx, dy, r], k) => <circle key={k} cx={cx + dx} cy={cy + dy} r={r} fill="url(#shop-leaf)" />)}</g>
      <circle cx={cx - 12} cy={cy - 124} r="17" fill="#F2FDE2" opacity=".18" />
      {fruits.map(([dx, dy], k) => (
        <g key={k}>
          <circle cx={cx + dx} cy={cy + dy} r="13" fill="url(#shop-glow)" opacity={lit ? 1 : 0.7} />
          <circle cx={cx + dx} cy={cy + dy} r="7.5" fill="url(#shop-gold)" stroke="#C98A12" strokeWidth="1.5" />
          <ellipse cx={cx + dx - 2.5} cy={cy + dy - 3} rx="2.4" ry="1.5" fill="#FFFFFF" opacity=".8" />
        </g>
      ))}
      <Bushes pu={pu} pv={pv} lit={lit} />
      <Signpost pu={pu} pv={pv} icon="check" />
    </g>
  )
}

// O desenho do prédio `id` no lote que começa em (pu, pv).
export default function ShopArt({ id, pu, pv, lit = false, month = 0 }) {
  if (id === 'university') return <SkillTreeShop pu={pu} pv={pv} lit={lit} />
  if (id === 'bank') return <BankShop pu={pu} pv={pv} lit={lit} />
  if (id === 'mercadinho') return <MarketShop pu={pu} pv={pv} lit={lit} />
  if (id === 'utilities') return <UtilityShop pu={pu} pv={pv} lit={lit} />
  if (id === 'internet') return <TelecomShop pu={pu} pv={pv} lit={lit} />
  if (id === 'leisure') return <LeisureShop pu={pu} pv={pv} lit={lit} month={month} />
  return null
}
