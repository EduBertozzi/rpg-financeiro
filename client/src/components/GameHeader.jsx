import { useNavigate, useLocation } from 'react-router-dom'
import useGameStore from '../store/gameStore'
import { Avatar } from './Avatars'

function formatMoney(value = 0) {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

function formatMoneyCompact(value = 0) {
  return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

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
  }

  return icons[name] || null
}

// Cor de cada lugar da cidade, igual aos prédios do mapa.
const TONES = {
  map: { bg: '#3DBE5A', edge: '#2B8C41', soft: '#E2F4E5' },
  bank: { bg: '#12B5A6', edge: '#0A7F75', soft: '#DDF4F1' },
  skills: { bg: '#8A5CF6', edge: '#6538C9', soft: '#EEE7FE' },
  admin: { bg: '#F2B53A', edge: '#C98A12', soft: '#FDF1D6' },
}

function MenuItem({ active, icon, label, description, onClick, expanded }) {
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
        className="grid h-12 w-12 place-items-center rounded-2xl transition-transform hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer"
      >
        <Icon name={icon} className="h-5 w-5" />
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
      <span style={tile} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-toy text-[18px] font-extrabold leading-tight text-[#24331F]">{label}</span>
        <span className="block truncate text-[12px] font-medium text-[#6B7A62]">{description}</span>
      </span>
    </button>
  )
}

function StatusCard({ icon, label, value, helper, tone = 'theme' }) {
  const color = tone === 'money' ? '#2B8C41' : tone === 'debt' ? '#C4283D' : '#2457C5'
  return (
    <div className="rounded-[20px] border-2 border-[#EFE6D3] bg-white p-3">
      <div className="flex items-center gap-2 text-[#8A9680]">
        <Icon name={icon} className="h-4 w-4" />
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em]">{label}</p>
      </div>
      <p className="mt-1.5 font-toy text-[19px] font-extrabold leading-tight tabular-nums" style={{ color }}>{value}</p>
      {helper && <p className="text-[11px] font-semibold text-[#8A9680]">{helper}</p>}
    </div>
  )
}

function CompactStat({ icon, value, color }) {
  return (
    <div className="flex flex-col items-center gap-0.5" style={{ color }}>
      <Icon name={icon} className="h-4 w-4" />
      <span className="font-toy text-[13px] font-extrabold leading-none tabular-nums">{value}</span>
    </div>
  )
}

export default function GameHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { character, room, user, logout, sidebarExpanded, setSidebarExpanded } = useGameStore()

  const path = location.pathname

  if (!character) return null

  const navItems = [
    { label: 'Mapa', path: '/map', icon: 'map', description: 'Cidade e ações principais' },
    { label: 'Banco', path: '/bank', icon: 'bank', description: 'Conta, caixinhas e ações' },
    { label: 'Universidade', path: '/skills', icon: 'skills', description: 'Constelação de habilidades' },
  ]

  const negative = Number(character.cash) < 0

  function handleLogout() {
    logout()
    navigate('/login')
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
        <div className="shrink-0 border-b-2 border-dashed border-[#EFE6D3] p-4">
          {sidebarExpanded ? (
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar id={character.avatarId} size={62} selected />
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#8A9680]">Morador</p>
                  <h2 className="truncate font-toy text-[22px] font-extrabold leading-tight">{character.name}</h2>
                  <p className="truncate text-xs font-medium text-[#6B7A62]">{character.course}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSidebarExpanded(false)}
                aria-label="Recolher menu"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border-2 border-[#EFE6D3] bg-white text-[#8A9680] transition-colors hover:text-[#24331F] cursor-pointer"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setSidebarExpanded(true)} title="Expandir" className="mx-auto flex justify-center cursor-pointer">
              <span className="relative">
                <Avatar id={character.avatarId} size={48} selected />
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#FFFDF7] bg-[#3DBE5A]" title="online" />
              </span>
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-5 pb-3">
            {sidebarExpanded ? (
              <div className="grid grid-cols-2 gap-3">
                <StatusCard
                  icon="wallet"
                  label="Caixa"
                  value={formatMoney(character.cash)}
                  helper={negative ? 'Cheque especial' : 'Saldo atual'}
                  tone={negative ? 'debt' : 'money'}
                />
                <StatusCard
                  icon="calendar"
                  label="Mês"
                  value={<>{Math.min(room?.currentTurn ?? 0, 12)}<span className="text-[#A9B19E]">/12</span></>}
                  helper="Progresso"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <CompactStat icon="wallet" value={formatMoneyCompact(character.cash)} color={negative ? '#C4283D' : '#2B8C41'} />
                <CompactStat icon="calendar" value={`${Math.min(room?.currentTurn ?? 0, 12)}/12`} color="#2457C5" />
              </div>
            )}

            <nav aria-label="Lugares">
              {sidebarExpanded && <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#8A9680]">Lugares</p>}
              <div className={sidebarExpanded ? 'space-y-2' : 'flex flex-col items-center gap-3'}>
                {navItems.map((item) => (
                  <MenuItem
                    key={item.path}
                    icon={item.icon}
                    label={item.label}
                    description={item.description}
                    active={path === item.path}
                    expanded={sidebarExpanded}
                    onClick={() => navigate(item.path)}
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
                    onClick={() => navigate('/admin')}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t-2 border-dashed border-[#EFE6D3] p-4">
          <button
            type="button"
            onClick={handleLogout}
            title="Sair"
            aria-label="Sair"
            className={[
              'flex items-center justify-center gap-2 rounded-2xl bg-[#FDE2E5] font-toy font-extrabold text-[#9F1D2F] shadow-[0_4px_0_#F5B8C0] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer',
              sidebarExpanded ? 'w-full px-4 py-2.5 text-[17px]' : 'mx-auto h-12 w-12',
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
