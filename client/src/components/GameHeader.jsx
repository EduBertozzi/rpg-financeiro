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

function MenuItem({ active, icon, label, description, onClick, expanded }) {
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={label}
        aria-label={label}
        className={[
          'grid h-11 w-11 place-items-center rounded-2xl border transition-all duration-200 active:scale-95 cursor-pointer',
          active
            ? 'border-primary/60 bg-primary/20 text-white shadow-[0_0_16px_var(--theme-glow)]'
            : 'border-white/10 bg-white/[0.035] text-gray-400 hover:border-primary/50 hover:text-white',
        ].join(' ')}
      >
        <Icon name={icon} className="h-5 w-5" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border px-3 py-2 text-left cursor-pointer',
        'transition-all duration-200 active:scale-[0.98]',
        active
          ? 'border-primary/60 bg-primary/15 shadow-[0_0_20px_var(--theme-glow)]'
          : 'border-white/10 bg-white/[0.035] hover:border-primary/50 hover:bg-white/[0.07]',
      ].join(' ')}
    >
      {active && (
        <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-[var(--theme-secondary)] shadow-[0_0_12px_var(--theme-glow)]" />
      )}

      <div
        className={[
          'grid h-10 w-10 shrink-0 place-items-center rounded-2xl border transition-all duration-200',
          active
            ? 'border-primary/60 bg-primary/20 text-white'
            : 'border-white/10 bg-black/20 text-gray-400 group-hover:text-white',
        ].join(' ')}
      >
        <Icon name={icon} className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <p className="text-[15px] font-black text-white">{label}</p>
        <p className="mt-0.5 truncate text-[11px] font-medium text-gray-500">
          {description}
        </p>
      </div>
    </button>
  )
}

function StatusCard({ icon, label, value, helper, tone = 'theme' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 shadow-inner shadow-black/20">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-xl border border-white/10 bg-black/20 text-[var(--theme-secondary)]">
          <Icon name={icon} className="h-4 w-4" />
        </div>

        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-gray-500">
          {label}
        </p>
      </div>

      <p
        className={[
          'mt-2 text-base font-black',
          tone === 'money'
            ? 'text-emerald-300'
            : 'text-[var(--theme-secondary)]',
        ].join(' ')}
      >
        {value}
      </p>

      {helper && (
        <p className="mt-0.5 text-[11px] font-medium text-gray-500">
          {helper}
        </p>
      )}
    </div>
  )
}

function CompactStat({ icon, value, tone }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-black/20 ${tone}`}>
        <Icon name={icon} className="h-4 w-4" />
      </div>
      <span className={`text-[10px] font-black leading-none ${tone}`}>{value}</span>
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
    {
      label: 'Mapa',
      path: '/map',
      icon: 'map',
      description: 'Cidade e ações principais',
    },
    {
      label: 'Banco',
      path: '/bank',
      icon: 'bank',
      description: 'Reserva, renda fixa e dinheiro',
    },
    {
      label: 'Corretora',
      path: '/broker',
      icon: 'broker',
      description: 'Investimentos e risco',
    },
    {
      label: 'Skills',
      path: '/skills',
      icon: 'skills',
      description: 'Evolução do personagem',
    },
  ]

  function goTo(route) {
    navigate(route)
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside
      onMouseEnter={() => setSidebarExpanded(true)}
      onMouseLeave={() => setSidebarExpanded(false)}
      className={[
        'fixed left-0 top-0 z-40 h-screen border-r border-white/10 bg-[var(--theme-bg)]/92 backdrop-blur-2xl',
        'shadow-[8px_0_40px_rgba(0,0,0,0.4)] transition-[width] duration-300 ease-out',
        sidebarExpanded ? 'w-80' : 'w-20',
      ].join(' ')}
    >
      <div className="relative flex h-full flex-col overflow-hidden">
        <div className="pointer-events-none absolute left-[-25%] top-[-12%] h-72 w-72 rounded-full bg-[var(--theme-primary)]/30 blur-[95px]" />
        <div className="pointer-events-none absolute bottom-[-15%] right-[-25%] h-72 w-72 rounded-full bg-[var(--theme-secondary)]/20 blur-[95px]" />

        <div className="relative shrink-0 border-b border-white/10 p-4">
          {sidebarExpanded ? (
            <div className="flex items-start justify-between gap-4">
              <button
                type="button"
                onClick={() => setSidebarExpanded(false)}
                className="flex min-w-0 items-center gap-3 text-left cursor-pointer"
                title="Recolher"
              >
                <Avatar id={character.avatarId} size={66} selected />

                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[var(--theme-muted)]">
                    Jogador
                  </p>

                  <h2 className="mt-1 truncate text-xl font-black text-white">
                    {character.name}
                  </h2>

                  <p className="mt-0.5 truncate text-xs font-medium text-gray-400">
                    {character.course}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSidebarExpanded(false)}
                aria-label="Recolher HUD"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.035] text-gray-400 transition-all hover:border-primary/50 hover:text-white active:scale-95 cursor-pointer"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSidebarExpanded(true)}
              title="Expandir"
              className="mx-auto flex justify-center cursor-pointer"
            >
              <div className="relative">
                <Avatar id={character.avatarId} size={48} selected />
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--theme-bg)] bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]"
                  title="online"
                />
              </div>
            </button>
          )}
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto p-4 pr-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-4 pb-3">
            {sidebarExpanded ? (
              <div className="grid grid-cols-2 gap-3">
                <StatusCard
                  icon="wallet"
                  label="Caixa"
                  value={formatMoney(character.cash)}
                  helper="Saldo atual"
                  tone="money"
                />

                <StatusCard
                  icon="calendar"
                  label="Mês"
                  value={
                    <>
                      {room?.currentTurn ?? 0}
                      <span className="text-gray-500">/12</span>
                    </>
                  }
                  helper="Progresso"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <CompactStat icon="wallet" value={formatMoneyCompact(character.cash)} tone="text-emerald-300" />
                <CompactStat icon="calendar" value={`${room?.currentTurn ?? 0}/12`} tone="text-[var(--theme-secondary)]" />
              </div>
            )}

            <div>
              {sidebarExpanded && (
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-[var(--theme-muted)]">
                  Navegação
                </p>
              )}

              <div className={sidebarExpanded ? 'space-y-2' : 'flex flex-col items-center gap-2'}>
                {navItems.map((item) => (
                  <MenuItem
                    key={item.path}
                    icon={item.icon}
                    label={item.label}
                    description={item.description}
                    active={path === item.path}
                    expanded={sidebarExpanded}
                    onClick={() => goTo(item.path)}
                  />
                ))}
              </div>
            </div>

            {user?.role === 'admin' && (
              <div>
                {sidebarExpanded && (
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-yellow-200/70">
                    Admin
                  </p>
                )}

                <div className={sidebarExpanded ? '' : 'flex justify-center'}>
                  <MenuItem
                    icon="admin"
                    label="Painel Admin"
                    description="Gerenciar salas e jogo"
                    active={path === '/admin'}
                    expanded={sidebarExpanded}
                    onClick={() => goTo('/admin')}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="relative shrink-0 border-t border-white/10 bg-black/10 p-4">
          {sidebarExpanded ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 font-black text-red-200 transition-all hover:border-red-400/40 hover:bg-red-500/15 active:scale-[0.98] cursor-pointer"
            >
              <Icon name="logout" className="h-5 w-5" />
              Sair
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              title="Sair"
              aria-label="Sair"
              className="mx-auto grid h-11 w-11 place-items-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-200 transition-all hover:border-red-400/40 hover:bg-red-500/15 active:scale-95 cursor-pointer"
            >
              <Icon name="logout" className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
