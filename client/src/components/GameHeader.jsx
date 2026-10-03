import { useNavigate, useLocation } from 'react-router-dom'
import useGameStore from '../store/gameStore'
import { Avatar } from './Avatars'
import { TASK_EVENT, monthTasks, worthSeries, worthNow, sparkPoints, pointsLeft } from './sidebarData'
import { useRolling, useStanding } from './hudHooks'
import { sfx, setSoundOn, useSoundOn } from '../services/sound'

const brl = (value = 0) => `R$ ${Math.round(Number(value)).toLocaleString('pt-BR')}`
const compact = (value = 0) => Math.round(Number(value)).toLocaleString('pt-BR')
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function Icon({ name, className = 'h-5 w-5' }) {
  const commonProps = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  const icons = {
    map: (
      <svg {...commonProps}>
        <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" />
        <path d="M9 3v15" />
        <path d="M15 6v15" />
      </svg>
    ),
    bank: (
      <svg {...commonProps}>
        <path d="M3 10h18" />
        <path d="M5 10V8l7-4 7 4v2" />
        <path d="M6 10v8" />
        <path d="M10 10v8" />
        <path d="M14 10v8" />
        <path d="M18 10v8" />
        <path d="M4 18h16" />
        <path d="M3 21h18" />
      </svg>
    ),
    broker: (
      <svg {...commonProps}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M7 15l3-3 3 2 5-7" />
        <path d="M15 7h3v3" />
      </svg>
    ),
    skills: (
      <svg {...commonProps}>
        <path d="M12 2l2.2 6.1L20 10.3l-5.1 3.6.2 6.1L12 15.9 8.9 20l.2-6.1L4 10.3l5.8-2.2L12 2z" />
      </svg>
    ),
    close: (
      <svg {...commonProps}>
        <path d="M18 6L6 18" />
        <path d="M6 6l12 12" />
      </svg>
    ),
    logout: (
      <svg {...commonProps}>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M21 19V5a2 2 0 0 0-2-2h-5" />
      </svg>
    ),
    admin: (
      <svg {...commonProps}>
        <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 .9-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6.9h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6.9z" />
      </svg>
    ),
    wallet: (
      <svg {...commonProps}>
        <path d="M19 7V6a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V7" />
        <path d="M17 14h.01" />
      </svg>
    ),
    calendar: (
      <svg {...commonProps}>
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <path d="M3 10h18" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
      </svg>
    ),
    soundOn: (
      <svg {...commonProps}>
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
      </svg>
    ),
    soundOff: (
      <svg {...commonProps}>
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        <path d="m17 9 5 6M22 9l-5 6" />
      </svg>
    ),
    dilemma: (
      <svg {...commonProps}>
        <path d="M3 7h18v12H3z" />
        <path d="m3 7 9 7 9-7" />
      </svg>
    ),
    leisure: (
      <svg {...commonProps}>
        <path d="M12 3v3M5 12H3M21 12h-2M6 6l1.5 1.5M18 6l-1.5 1.5" />
        <circle cx="12" cy="13" r="4" />
        <path d="M8 21h8" />
      </svg>
    ),
    food: (
      <svg {...commonProps}>
        <path d="M4 5h2l2 10h10l2-7H7" />
        <circle cx="10" cy="19" r="1.5" />
        <circle cx="17" cy="19" r="1.5" />
      </svg>
    ),
    utilities: (
      <svg {...commonProps}>
        <path d="M13 3 5 14h6l-1 7 8-11h-6z" />
      </svg>
    ),
    internet: (
      <svg {...commonProps}>
        <path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
        <circle cx="12" cy="19.5" r="1" />
      </svg>
    ),
  }

  return icons[name] || null
}

function Badge({ n }) {
  return (
    <span className="hud-badge absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full border-2 border-[#FFFDF7] bg-[#EC4899] px-1 text-[11px] font-extrabold leading-none text-white" aria-label={`${n} para gastar`}>
      {n}
    </span>
  )
}

// Cor de cada lugar da cidade, igual aos prédios do mapa.
const TONES = {
  map: { bg: '#3DBE5A', edge: '#2B8C41', soft: '#E2F4E5' },
  bank: { bg: '#12B5A6', edge: '#0A7F75', soft: '#DDF4F1' },
  skills: { bg: '#8A5CF6', edge: '#6538C9', soft: '#EEE7FE' },
  admin: { bg: '#F2B53A', edge: '#C98A12', soft: '#FDF1D6' },
}

function MenuItem({ active, icon, label, description, onClick, expanded, badge = 0 }) {
  const tone = TONES[icon] ?? TONES.map
  const tile = active
    ? { background: tone.bg, color: '#fff', boxShadow: `0 4px 0 ${tone.edge}` }
    : { background: tone.soft, color: tone.edge }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={label}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        style={tile}
        className="relative grid h-12 w-12 place-items-center rounded-2xl transition-transform hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer"
      >
        <Icon name={icon} className="h-5 w-5" />
        {badge > 0 && <Badge n={badge} />}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={[
        'flex w-full items-center gap-3 rounded-[20px] border-2 px-2.5 py-2 text-left transition-transform hover:-translate-y-0.5 cursor-pointer',
        active ? 'bg-white' : 'border-transparent hover:bg-white/70',
      ].join(' ')}
      style={active ? { borderColor: tone.bg, boxShadow: `0 4px 0 ${tone.bg}` } : undefined}
    >
      <span style={tile} className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl">
        <Icon name={icon} className="h-5 w-5" />
        {badge > 0 && <Badge n={badge} />}
      </span>
      <span className="min-w-0">
        <span className="block font-toy text-[18px] font-extrabold leading-tight text-[#24331F]">{label}</span>
        <span className="block truncate text-[12px] font-medium text-[#6B7A62]">{description}</span>
      </span>
    </button>
  )
}


const LABEL = 'text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8A9680]'

function Spark({ series }) {
  const p = sparkPoints(series, { w: 240, h: 40 })
  if (!p) return null
  return (
    <svg viewBox="0 0 240 40" preserveAspectRatio="none" className="mt-1.5 block h-10 w-full" aria-label="Patrimônio mês a mês">
      {Array.from({ length: 12 }, (_, i) => {
        const x = 4 + (i * 232) / 11
        return <line key={i} x1={x} x2={x} y1="4" y2="36" stroke="#EFE6D3" strokeWidth="1" />
      })}
      <polygon points={p.area} fill="var(--theme-secondary)" opacity="0.35" />
      <polyline points={p.line} fill="none" stroke="var(--theme-primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={p.last.x} cy={p.last.y} r="4" fill="var(--theme-primary)" stroke="#fff" strokeWidth="2" />
    </svg>
  )
}

// Patrimônio com o gráfico do ano e o saldo da conta embaixo.
function WorthCard({ character }) {
  const series = worthSeries(character.snapshots)
  const now = worthNow(series, character.cash)
  const worth = useRolling(now.value)
  const cash = useRolling(character.cash)
  const negative = Number(character.cash) < 0
  return (
    <div data-tour="saldo" className="rounded-[20px] border-2 border-[#EFE6D3] bg-white p-3">
      <p className={LABEL}>Patrimônio</p>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-toy text-[26px] font-extrabold leading-none tabular-nums">{brl(worth)}</span>
        {now.delta !== null && (
          <span className={`text-[12px] font-extrabold ${now.delta >= 0 ? 'text-[#2B8C41]' : 'text-[#C4283D]'}`}>
            {now.delta >= 0 ? '▲' : '▼'} {brl(Math.abs(now.delta))} na virada
          </span>
        )}
      </div>
      {series.length > 1 ? <Spark series={series} /> : <p className="mt-1 text-[11px] font-semibold text-[#A9B19E]">O gráfico começa na primeira virada.</p>}
      <div className="mt-2 flex items-baseline justify-between border-t-2 border-dashed border-[#EFE6D3] pt-2 text-[13px] text-[#6B7A62]">
        <span>{negative ? 'Cheque especial' : 'Saldo na conta'}</span>
        <b data-hud="cash" className={`tabular-nums ${negative ? 'text-[#C4283D]' : 'text-[#24331F]'}`}>{brl(cash)}</b>
      </div>
    </div>
  )
}

// O mês: as tarefas em ícones e quantos da turma já encerraram.
function MonthCard({ turn, tasks, standing, onTask }) {
  const total = standing?.total ?? 0
  const ready = standing?.ready ?? 0
  return (
    <div data-tour="mes" className="grid gap-2.5 rounded-[20px] border-2 border-[#EFE6D3] bg-white p-3">
      <div className="flex items-baseline justify-between">
        <b className="font-toy text-[19px] font-extrabold">{MONTHS[turn - 1]}</b>
        <span className="text-[12px] font-extrabold text-[#A9B19E]">{turn}/12</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {tasks.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTask(t.id)}
            title={`${t.label}${t.done ? ' · feito' : ' · falta'}`}
            aria-label={`${t.label}: ${t.done ? 'feito' : 'falta'}`}
            className={[
              'relative grid aspect-square place-items-center rounded-[14px] border-2 transition-transform hover:-translate-y-0.5 cursor-pointer',
              t.done ? 'border-[var(--theme-primary)] bg-[color-mix(in_srgb,var(--theme-secondary)_22%,white)] text-[var(--theme-primary)]' : 'border-dashed border-[#E2D6BE] bg-[#FFFDF5] text-[#A9B19E]',
            ].join(' ')}
          >
            <Icon name={t.id} className="h-[18px] w-[18px]" />
            {t.done && (
              <span className="absolute -right-1 -top-1 grid h-3.5 w-3.5 place-items-center rounded-full border-2 border-white bg-[#2B8C41]">
                <svg viewBox="0 0 16 16" className="h-2 w-2" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3L12.5 5" /></svg>
              </span>
            )}
          </button>
        ))}
      </div>
      {total > 0 && (
        <div className="grid gap-1">
          <div className="flex justify-between text-[12px] font-bold text-[#6B7A62]">
            <span>Turma</span>
            <b className="text-[#24331F]">{ready} de {total} {ready === 1 ? 'pronto' : 'prontos'}</b>
          </div>
          <div className="flex gap-[3px]" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <i key={i} className={`h-2 flex-1 rounded transition-colors duration-500 ${i < ready ? 'bg-[#3DBE5A]' : 'bg-[#EFE6D3]'}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RankChip({ standing }) {
  if (!standing?.total) return null
  if (!standing.rank) return <span className="mt-2 inline-block rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-extrabold">Ranking a partir de fevereiro</span>
  return (
    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 py-1 pl-1 pr-2.5 text-[12px] font-extrabold" title="Posição pelo patrimônio da última virada">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-[#FFD45C] text-[11px] text-[#5C3B00]">{standing.rank}</span>
      {standing.rank}º de {standing.total} na sala
    </span>
  )
}

export default function GameHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { character, room, user, logout, sidebarExpanded, setSidebarExpanded } = useGameStore()
  const soundOn = useSoundOn()
  const playing = room?.status === 'active'
  const standing = useStanding(room?.id, playing && user?.role !== 'admin')

  const path = location.pathname

  if (!character) return null

  const turn = playing ? Math.min(room?.currentTurn ?? 0, 12) : 0
  const tasks = monthTasks(character.eventLog, turn)
  const doneCount = tasks.filter((t) => t.done).length
  const points = pointsLeft(character.skillPoints)
  const negative = Number(character.cash) < 0

  const navItems = [
    { label: 'Mapa', path: '/map', icon: 'map', description: 'Cidade e tarefas do mês' },
    { label: 'Banco', path: '/bank', icon: 'bank', description: 'Conta, caixinhas e ações' },
    { label: 'Universidade', path: '/skills', icon: 'skills', description: points ? `${points} ${points === 1 ? 'ponto' : 'pontos'} para gastar` : 'Constelação de habilidades', badge: points },
  ]

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const go = (to) => {
    sfx.click()
    navigate(to)
  }

  // ícone de tarefa: no mapa abre direto; nas outras telas volta para o mapa
  const openTask = (id) => {
    sfx.click()
    if (path !== '/map') navigate('/map')
    setTimeout(() => window.dispatchEvent(new CustomEvent(TASK_EVENT, { detail: { id } })), path === '/map' ? 0 : 400)
  }

  const toggleSound = () => {
    setSoundOn(!soundOn)
    if (!soundOn) setTimeout(sfx.pop, 0)
  }

  return (
    <aside
      onMouseEnter={() => setSidebarExpanded(true)}
      onMouseLeave={() => setSidebarExpanded(false)}
      className={[
        'fixed left-0 top-0 z-40 h-screen bg-[#FFFDF7] text-[#24331F]',
        'shadow-[6px_0_0_#E2D6BE,12px_0_40px_rgba(36,51,31,0.18)] transition-[width] duration-300 ease-out',
        sidebarExpanded ? 'w-80' : 'w-20',
      ].join(' ')}
    >
      <div className="relative flex h-full flex-col overflow-hidden">
        {sidebarExpanded ? (
          <div className="relative shrink-0 bg-[linear-gradient(135deg,var(--theme-primary),color-mix(in_srgb,var(--theme-primary)_65%,var(--theme-secondary)))] px-4 pb-6 pt-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar id={character.avatarId} size={58} selected />
                <div className="min-w-0">
                  <h2 className="truncate font-toy text-[22px] font-extrabold leading-tight">{character.name}</h2>
                  <p className="truncate text-xs font-medium text-white/85">{character.course}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSidebarExpanded(false)}
                aria-label="Recolher menu"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white/20 text-white transition-colors hover:bg-white/30 cursor-pointer"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>
            <RankChip standing={standing} />
            <span className="absolute inset-x-0 -bottom-px h-3.5 rounded-t-[14px] bg-[#FFFDF7]" />
          </div>
        ) : (
          <div className="shrink-0 border-b-2 border-dashed border-[#EFE6D3] p-4">
            <button type="button" onClick={() => setSidebarExpanded(true)} title="Expandir" className="relative mx-auto flex justify-center cursor-pointer">
              <Avatar id={character.avatarId} size={48} selected />
              {standing?.rank && (
                <span className="absolute -bottom-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-[#FFFDF7] bg-[#FFD45C] px-1 text-[10px] font-extrabold text-[#5C3B00]" title={`${standing.rank}º de ${standing.total} na sala`}>
                  {standing.rank}º
                </span>
              )}
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-4 pb-3">
            {sidebarExpanded ? (
              <>
                <WorthCard character={character} />
                {turn > 0 && <MonthCard turn={turn} tasks={tasks} standing={standing} onTask={openTask} />}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div data-tour="saldo" className="flex flex-col items-center gap-0.5" style={{ color: negative ? '#C4283D' : '#2B8C41' }}>
                  <Icon name="wallet" className="h-4 w-4" />
                  <CompactCash value={character.cash} />
                </div>
                {turn > 0 && (
                  <div data-tour="mes" className="flex flex-col items-center gap-1" title={`${MONTHS[turn - 1]}: ${doneCount} de ${tasks.length} tarefas`}>
                    <TaskRing done={doneCount} total={tasks.length} />
                    <span className="font-toy text-[12px] font-extrabold leading-none text-[#6B7A62]">{turn}/12</span>
                  </div>
                )}
              </div>
            )}

            <nav aria-label="Lugares" data-tour="lugares">
              {sidebarExpanded && <p className={`mb-2 ${LABEL}`}>Lugares</p>}
              <div className={sidebarExpanded ? 'space-y-1.5' : 'flex flex-col items-center gap-3'}>
                {navItems.map((item) => (
                  <MenuItem
                    key={item.path}
                    icon={item.icon}
                    label={item.label}
                    description={item.description}
                    badge={item.badge}
                    active={path === item.path}
                    expanded={sidebarExpanded}
                    onClick={() => go(item.path)}
                  />
                ))}
              </div>
            </nav>

            {user?.role === 'admin' && (
              <div>
                {sidebarExpanded && <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#C98A12]">Admin</p>}
                <div className={sidebarExpanded ? '' : 'flex justify-center'}>
                  <MenuItem
                    icon="admin"
                    label="Painel Admin"
                    description="Gerenciar salas e jogo"
                    active={path === '/admin'}
                    expanded={sidebarExpanded}
                    onClick={() => go('/admin')}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`flex shrink-0 gap-2 border-t-2 border-dashed border-[#EFE6D3] p-4 ${sidebarExpanded ? '' : 'flex-col items-center'}`}>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            title={soundOn ? 'Desligar o som' : 'Ligar o som'}
            aria-label={soundOn ? 'Desligar o som' : 'Ligar o som'}
            className={[
              'flex items-center justify-center gap-2 rounded-2xl border-2 border-[#EFE6D3] bg-white font-toy font-extrabold text-[#6B7A62] transition-transform hover:-translate-y-0.5 cursor-pointer',
              sidebarExpanded ? 'flex-1 px-3 py-2 text-[15px]' : 'h-12 w-12',
            ].join(' ')}
          >
            <Icon name={soundOn ? 'soundOn' : 'soundOff'} className="h-5 w-5" />
            {sidebarExpanded && (soundOn ? 'Som ligado' : 'Som desligado')}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title="Sair"
            aria-label="Sair"
            className={[
              'flex items-center justify-center gap-2 rounded-2xl bg-[#FDE2E5] font-toy font-extrabold text-[#9F1D2F] shadow-[0_4px_0_#F5B8C0] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer',
              sidebarExpanded ? 'px-4 py-2 text-[15px]' : 'h-12 w-12',
            ].join(' ')}
          >
            <Icon name="logout" className="h-5 w-5" />
            {sidebarExpanded && 'Sair'}
          </button>
        </div>
      </div>
    </aside>
  )
}

function CompactCash({ value }) {
  const shown = useRolling(value)
  return <span data-hud="cash" className="font-toy text-[13px] font-extrabold leading-none tabular-nums">{compact(shown)}</span>
}

// Anel de progresso das tarefas do mês (barra recolhida).
function TaskRing({ done, total }) {
  const r = 15
  const c = 2 * Math.PI * r
  const k = total ? done / total : 0
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden="true">
      <circle cx="20" cy="20" r={r} fill="none" stroke="#EFE6D3" strokeWidth="5" />
      <circle cx="20" cy="20" r={r} fill="none" stroke={k === 1 ? '#3DBE5A' : 'var(--theme-primary)'} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${c * k} ${c}`} transform="rotate(-90 20 20)" className="transition-[stroke-dasharray] duration-500" />
      <text x="20" y="24.5" textAnchor="middle" className="fill-[#24331F] font-toy text-[12px] font-extrabold">{done}</text>
    </svg>
  )
}
