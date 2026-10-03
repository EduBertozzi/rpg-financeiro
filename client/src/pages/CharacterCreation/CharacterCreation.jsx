import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'
import { AVATARS, applyAvatarTheme } from '../../data/avatarTheme'
import { GIFTS, PROFESSIONS, giftById } from '../../data/gifts'
import TownBackdrop from '../../components/town/TownBackdrop'
import GiftIcon from '../../components/town/GiftIcon'
import ProfessionalCard from '../../components/town/ProfessionalCard'
import { TOY_BUTTON, TOY_CARD, TOY_ERROR, TOY_GHOST, TOY_INPUT, TOY_LABEL } from '../../components/town/toy'

const STEPS = ['Quem é você', 'Seu dom', 'Sua carteira']

export default function CharacterCreation() {
  const navigate = useNavigate()
  const { setCharacter, setRoom } = useGameStore()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', avatarId: 1, course: PROFESSIONS[0], gift: '', roomCode: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (patch) => setForm((current) => ({ ...current, ...patch }))

  useEffect(() => {
    applyAvatarTheme(form.avatarId)
  }, [form.avatarId])

  const canGoStep2 = Boolean(form.name.trim() && form.course && form.roomCode.trim())
  const canGoStep3 = Boolean(form.gift)
  const gift = giftById(form.gift)

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const { data: room } = await api.get(`/rooms/${form.roomCode.trim()}`)
      const { data: character } = await api.post('/characters', {
        roomId: room.id,
        name: form.name.trim(),
        avatarId: form.avatarId,
        course: form.course,
        gift: form.gift,
      })
      const { data: fullCharacter } = await api.get(`/characters/${character.id}`)
      setRoom(room)
      setCharacter(fullCharacter)
      applyAvatarTheme(fullCharacter.avatarId || form.avatarId)
      setTimeout(() => navigate('/map'), 100)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar personagem')
    } finally {
      setLoading(false)
    }
  }

  const card = (
    <ProfessionalCard
      avatarId={form.avatarId}
      name={form.name.trim()}
      profession={form.course}
      gift={form.gift}
      roomCode={form.roomCode.trim()}
      stamped={step === 3}
    />
  )

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-10">
      <TownBackdrop />

      <section className={`${TOY_CARD} relative z-10 mx-auto w-full max-w-5xl p-6 sm:p-8 animate-fade-in-up`}>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold tracking-[0.22em] text-[#6B7A62]">FECHA O MÊS · NOVO MORADOR DE SANTA RITA</p>
            <h1 className="font-toy text-4xl font-extrabold leading-tight text-[#24331F]">Criar personagem</h1>
          </div>
          <ol className="flex flex-wrap gap-2" aria-label="Passos">
            {STEPS.map((label, i) => {
              const n = i + 1
              const state = n === step ? 'bg-[#3DBE5A] text-white shadow-[0_3px_0_#2B8C41]' : n < step ? 'bg-[#E2F4E5] text-[#2B8C41]' : 'bg-[#F1EBDD] text-[#8A9680]'
              return (
                <li key={label} aria-current={n === step ? 'step' : undefined} className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 font-toy text-[15px] font-extrabold ${state}`}>
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-white/30 text-xs">{n < step ? '✓' : n}</span>
                  {label}
                </li>
              )
            })}
          </ol>
        </header>

        <div className="mt-7">
          {step === 1 && (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="grid content-start gap-6">
                <fieldset className="grid gap-3">
                  <legend className="mb-3 font-toy text-2xl font-extrabold">Escolha seu personagem</legend>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
                    {AVATARS.map((a) => {
                      const selected = form.avatarId === a.id
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => set({ avatarId: a.id })}
                          aria-pressed={selected}
                          className={`grid justify-items-center gap-1.5 rounded-[20px] border-[3px] bg-white px-1.5 pb-2 pt-2.5 transition-transform hover:-translate-y-0.5 cursor-pointer ${selected ? 'border-[#3DBE5A] shadow-[0_5px_0_#3DBE5A]' : 'border-[#EFE6D3]'}`}
                        >
                          <span className="grid h-16 w-16 place-items-end overflow-hidden rounded-full bg-[#DDE6F5]">
                            <img src={a.image} alt="" className="w-[115%] max-w-none" />
                          </span>
                          <span className="text-center text-[12px] font-extrabold leading-tight">{a.name}</span>
                          <span className="text-center text-[10.5px] leading-tight text-[#6B7A62]">{a.archetype}</span>
                        </button>
                      )
                    })}
                  </div>
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label htmlFor="cc-name" className={`${TOY_LABEL} sm:col-span-2`}>
                    Nome
                    <input id="cc-name" value={form.name} onChange={(e) => set({ name: e.target.value })} className={TOY_INPUT} placeholder="Como você quer ser chamado?" maxLength={40} />
                  </label>
                  <label htmlFor="cc-profession" className={TOY_LABEL}>
                    Profissão
                    <select id="cc-profession" value={form.course} onChange={(e) => set({ course: e.target.value })} className={`${TOY_INPUT} cursor-pointer`}>
                      {PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                  <label htmlFor="cc-room" className={TOY_LABEL}>
                    Código da sala
                    <input id="cc-room" value={form.roomCode} onChange={(e) => set({ roomCode: e.target.value.toUpperCase() })} className={`${TOY_INPUT} font-mono tracking-[0.2em]`} placeholder="ABC123" maxLength={10} />
                  </label>
                </div>

                <button type="button" onClick={() => setStep(2)} disabled={!canGoStep2} className={TOY_BUTTON}>
                  Próximo: escolher o dom
                </button>
              </div>

              <aside className="grid content-start gap-3">
                <p className="text-xs font-extrabold tracking-[0.18em] text-[#6B7A62]">SUA CARTEIRA PROFISSIONAL</p>
                <div className="rotate-[-1.5deg]">{card}</div>
                <p className="text-sm text-[#6B7A62]">Ela vai se preenchendo enquanto você monta o personagem.</p>
              </aside>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-6">
              <div>
                <h2 className="font-toy text-3xl font-extrabold">Qual é o seu dom?</h2>
                <p className="text-[#6B7A62]">Escolha pelo seu jeito de jogar. Você escolhe só um, e não dá para trocar depois.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {GIFTS.map((g) => {
                  const selected = form.gift === g.id
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => set({ gift: g.id })}
                      aria-pressed={selected}
                      className="grid content-start justify-items-start gap-3 rounded-[24px] border-[3px] bg-white p-5 text-left transition-transform hover:-translate-y-1 cursor-pointer"
                      style={{ borderColor: selected ? g.color : '#EFE6D3', boxShadow: selected ? `0 6px 0 ${g.color}` : undefined }}
                    >
                      <GiftIcon gift={g.id} size={76} />
                      <span className="font-toy text-[22px] font-extrabold leading-tight">{g.name}</span>
                      <span className="text-[15px] leading-snug text-[#4A5A42]">{g.effect}</span>
                      <span className="rounded-full px-3 py-1 text-xs font-extrabold" style={{ background: `color-mix(in srgb, ${g.color} 16%, #fff)` }}>
                        {g.style}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setStep(1)} className={TOY_GHOST}>Voltar</button>
                <button type="button" onClick={() => setStep(3)} disabled={!canGoStep3} className={`${TOY_BUTTON} flex-1`}>
                  Próximo: ver a carteira
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="mx-auto w-full max-w-[440px] rotate-[-2deg]">{card}</div>
              <div className="grid gap-5">
                <div>
                  <h2 className="font-toy text-3xl font-extrabold">Tudo pronto, {form.name.trim().split(' ')[0]}!</h2>
                  <p className="text-[#6B7A62]">Você acabou de se formar e se mudou para Santa Rita. Agora é cuidar do dinheiro por 12 meses.</p>
                </div>
                <dl className="grid gap-2 rounded-[20px] border-2 border-[#EFE6D3] bg-white p-4 text-[15px]">
                  <Row label="Salário" value="R$ 7.000 por mês" />
                  <Row label="Saldo inicial" value="Salário de janeiro + um PIX da família" />
                  <Row label="Profissão" value={form.course} />
                  <Row label="Dom" value={gift?.name} />
                  <Row label="Sala" value={form.roomCode.trim()} mono />
                </dl>
                {error && <p className={TOY_ERROR}>{error}</p>}
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setStep(2)} className={TOY_GHOST}>Voltar</button>
                  <button type="button" onClick={handleSubmit} disabled={loading} className={`${TOY_BUTTON} flex-1`}>
                    {loading ? 'Entrando na cidade…' : 'Começar o jogo'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function Row({ label, value, mono = false }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[#6B7A62]">{label}</dt>
      <dd className={`text-right font-bold ${mono ? 'font-mono tracking-[0.15em]' : ''}`}>{value}</dd>
    </div>
  )
}
