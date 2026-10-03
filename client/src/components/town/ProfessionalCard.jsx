import { getAvatarById } from '../../data/avatarTheme'
import { giftById, registrationNumber } from '../../data/gifts'
import GiftIcon from './GiftIcon'

// Carteira profissional do personagem: vai se preenchendo durante a criação
// e ganha o carimbo no último passo.
export default function ProfessionalCard({ avatarId = 1, name, profession, gift, roomCode, stamped = false, className = '' }) {
  const avatar = getAvatarById(avatarId)
  const g = giftById(gift)
  const empty = 'text-[#A9B3C2]'

  return (
    <div className={`relative overflow-hidden rounded-[22px] bg-[#F7F4EC] text-[#1E2A3A] shadow-[0_8px_0_#D9CFBB,0_24px_40px_rgba(30,42,58,0.25)] ${className}`}>
      <div className="flex items-end justify-between gap-3 bg-[var(--theme-primary)] px-5 pb-3 pt-4 text-white transition-colors duration-300">
        <div>
          <p className="text-[9px] font-extrabold tracking-[0.26em] opacity-85">CARTEIRA PROFISSIONAL</p>
          <p className="font-toy text-xl font-extrabold leading-tight">Engenharia · Santa Rita</p>
        </div>
        <span className="mb-1 h-2.5 w-11 rounded-full bg-white/30" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 px-5 pb-4 pt-4">
        <div className="grid h-[116px] w-[96px] place-items-end overflow-hidden rounded-xl border-[3px] border-white bg-[#DDE6F5] shadow-[0_2px_0_#CBD5E4]">
          <img src={avatar.image} alt="" className="w-[120%] max-w-none" />
        </div>
        <dl className="grid min-w-0 content-start gap-2 font-mono">
          <Field label="Nome" value={name} placeholder="Seu nome" empty={empty} />
          <Field label="Profissão" value={profession} placeholder="Escolha a profissão" empty={empty} />
          <div className="grid gap-0.5">
            <dt className="text-[9px] uppercase tracking-[0.16em] text-[#6A7686]">Dom</dt>
            <dd className={`flex min-w-0 items-center gap-1.5 text-[13px] ${g ? '' : empty}`}>
              {g && <GiftIcon gift={g.id} size={18} />}
              <span className="truncate">{g?.name ?? 'Escolha no passo 2'}</span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-dashed border-[#CFC7B5] px-5 py-3 font-mono text-[11px] text-[#6A7686]">
        <span>Reg. {name ? registrationNumber(name) : 'SR-······'}</span>
        <span>Sala {roomCode || '······'}</span>
        <span>Jan–Dez</span>
      </div>

      {stamped && (
        <div
          className="pointer-events-none absolute bottom-10 right-4 rotate-[-12deg] rounded-lg border-[3px] border-[#1E9E4A] px-3 py-1 font-toy text-lg font-extrabold tracking-wide text-[#1E9E4A] opacity-90 animate-[stamp_.5s_cubic-bezier(.2,1.6,.4,1)_both]"
          aria-label="Carteira aprovada"
        >
          APROVADO
        </div>
      )}
    </div>
  )
}

function Field({ label, value, placeholder, empty }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-[9px] uppercase tracking-[0.16em] text-[#6A7686]">{label}</dt>
      <dd className={`truncate border-b-2 border-dashed border-[#C9D1DD] pb-0.5 text-[13px] ${value ? '' : empty}`}>{value || placeholder}</dd>
    </div>
  )
}
