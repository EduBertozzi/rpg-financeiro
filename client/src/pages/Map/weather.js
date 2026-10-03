// Estações e clima do mapa, mês a mês, no calendário do Brasil.
// É só visual e igual para toda a sala (depende só do mês da partida).

const GREEN = { main: ['#2F9E44', '#51CF66'], muted: ['#6FA873', '#8CC08D'] }
const AUTUMN = { main: ['#E8742C', '#F2B53A'], muted: ['#D9925A', '#E8B76A'] }
const LATE_AUTUMN = { main: ['#C9562A', '#E8742C'], muted: ['#C47A52', '#D9925A'] }
const WINTER = { main: ['#2B7A4B', '#3F9466'], muted: ['#5E8E70', '#7AA287'] }
const DRY = { main: ['#6E9A3E', '#94B85A'], muted: ['#8FA672', '#A8B98A'] }
const IPE = { main: ['#F2C230', '#FFD84D'], muted: ['#8CC08D', '#A8D4A2'], alt: ['#E85A9C', '#FF8CC0'] }
const SPRING = { main: ['#3CB55A', '#7BDB7F'], muted: ['#7DB97F', '#9BCD98'] }

export const WEATHER = [
  { month: 1, season: 'Verão', label: 'Chuva de verão', icon: '🌧', fx: 'rain', tint: 'rgba(60,90,140,0.16)', trees: GREEN },
  { month: 2, season: 'Verão', label: 'Tempestade', icon: '⛈', fx: 'storm', tint: 'rgba(30,40,80,0.3)', trees: GREEN },
  { month: 3, season: 'Verão', label: 'Sol e confete', icon: '🎉', fx: 'confetti', tint: null, trees: GREEN },
  { month: 4, season: 'Outono', label: 'Folhas caindo', icon: '🍂', fx: 'leaves', tint: 'rgba(240,150,60,0.1)', trees: AUTUMN },
  { month: 5, season: 'Outono', label: 'Céu limpo e vento', icon: '🍁', fx: 'leaves', tint: 'rgba(230,130,50,0.12)', trees: LATE_AUTUMN },
  { month: 6, season: 'Inverno', label: 'Neblina e Festa Junina', icon: '🌫', fx: 'fog', tint: 'rgba(225,235,245,0.25)', trees: WINTER, deco: 'flags' },
  { month: 7, season: 'Inverno', label: 'Frio e neve de brincadeira', icon: '❄', fx: 'snow', tint: 'rgba(210,228,255,0.25)', trees: WINTER, snow: true },
  { month: 8, season: 'Inverno', label: 'Seco e com vento', icon: '💨', fx: 'wind', tint: 'rgba(230,210,170,0.12)', trees: DRY },
  { month: 9, season: 'Primavera', label: 'Ipês floridos', icon: '🌸', fx: 'petals', tint: null, trees: IPE },
  { month: 10, season: 'Primavera', label: 'Garoa leve', icon: '🌦', fx: 'drizzle', tint: 'rgba(120,150,190,0.1)', trees: SPRING },
  { month: 11, season: 'Primavera', label: 'Chuva de fim de tarde', icon: '🌧', fx: 'rain', tint: 'rgba(60,90,140,0.14)', trees: SPRING },
  { month: 12, season: 'Verão', label: 'Sol e luzinhas de Natal', icon: '🎄', fx: 'sparkle', tint: null, trees: GREEN, deco: 'lights' },
]

// Clima do mês da partida (1 a 12). Fora disso (sala esperando), tempo bom.
export const weatherFor = (month) => WEATHER.find((w) => w.month === month) ?? null

// Cores de uma árvore: as do mapa (muted) ou as de destaque, e a cor
// alternativa (ipê rosa) em metade delas, escolhida pela posição.
export function treeColors(weather, { muted = false, u = 0, v = 0 } = {}) {
  const set = weather?.trees ?? GREEN
  if (set.alt && !muted && Math.round(u + v) % 2 === 0) return set.alt
  return muted ? set.muted : set.main
}

// Quantas partículas cada tipo de clima desenha (proporcional à área).
export const PARTICLES = { rain: 260, storm: 380, drizzle: 120, snow: 140, leaves: 46, petals: 60, confetti: 120, wind: 50, sparkle: 70, fog: 0 }
