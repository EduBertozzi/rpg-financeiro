import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'
import { Avatar } from '../../components/Avatars'
import { AVATARS, applyAvatarTheme, getAvatarById } from '../../data/avatarTheme'

const COURSES = [
  'Engenharia Biomédica',
  'Engenharia de Computação',
  'Engenharia de Controle e Automação',
  'Engenharia de Produção',
  'Engenharia de Software',
  'Engenharia de Telecomunicações',
  'Engenharia Elétrica',
]

const GIFTS = [
  {
    id: 'frugal',
    name: 'Mão de Vaca Estratégico',
    focus: 'Retenção de Capital',
    effect: 'Todos os custos fixos mensais são 15% menores.',
    icon: '💰',
    type: 'Passivo',
    rarity: 'Comum',
  },
  {
    id: 'agile',
    name: 'Desenrolado',
    focus: 'Renda Ativa',
    effect: 'Valores recebidos em eventos positivos são 20% maiores.',
    icon: '⚡',
    type: 'Bônus',
    rarity: 'Raro',
  },
  {
    id: 'smart',
    name: 'Inteligente',
    focus: 'Desenvolvimento Pessoal',
    effect: 'Habilidades na Skill Tree custam 20% menos pontos.',
    icon: '🧠',
    type: 'Evolução',
    rarity: 'Épico',
  },
]

export default function CharacterCreation() {
  const navigate = useNavigate()
  const { setCharacter, setRoom } = useGameStore()

  const [step, setStep] = useState(1)

  const [form, setForm] = useState({
    name: '',
    gender: '',
    avatarId: 1,
    course: '',
    gift: '',
    roomCode: '',
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedAvatar = useMemo(() => getAvatarById(form.avatarId), [form.avatarId])
  const selectedGift = useMemo(
    () => GIFTS.find((gift) => gift.id === form.gift),
    [form.gift]
  )

  const set = (patch) => {
    setForm((current) => ({
      ...current,
      ...patch,
    }))
  }

  useEffect(() => {
    applyAvatarTheme(form.avatarId)
  }, [form.avatarId])

  const canGoStep2 = Boolean(form.name && form.gender && form.course && form.roomCode)
  const canGoStep3 = Boolean(form.gift)

  const handleSubmit = async () => {
    setError('')
    setLoading(true)

    try {
      const { data: room } = await api.get(`/rooms/${form.roomCode}`)

      const { data: character } = await api.post('/characters', {
        roomId: room.id,
        name: form.name,
        gender: form.gender,
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

  const inputCls =
    'w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all'

  const primaryButtonCls =
    'w-full py-3.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 text-white font-semibold rounded-xl transition-all shadow-[0_0_24px_var(--theme-glow)]'

  const secondaryButtonCls =
    'flex-1 py-3 border border-white/10 text-gray-400 hover:text-white hover:border-primary/60 active:scale-[0.98] rounded-xl transition-all'

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--theme-bg)] text-white transition-colors duration-300">
      <div className="absolute inset-0 opacity-40">
        <div className="absolute left-[-10%] top-[-10%] h-72 w-72 rounded-full bg-[var(--theme-primary)] blur-[110px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-72 w-72 rounded-full bg-[var(--theme-secondary)] blur-[110px]" />
      </div>

      <div className="perspective-grid absolute inset-x-0 bottom-0 h-1/2 opacity-40" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-5 py-10">
        <div className="w-full overflow-hidden rounded-3xl border border-white/10 bg-[var(--theme-surface)]/85 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="border-b border-white/10 bg-black/20 px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--theme-muted)]">
                  RPG Financeiro
                </p>
                <h1 className="mt-1 text-3xl font-black tracking-tight">
                  Criar Personagem
                </h1>
              </div>

              <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-gray-300">
                Passo <span className="font-bold text-white">{step}</span> de 3
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all duration-300 ${s <= step
                    ? 'bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] shadow-[0_0_16px_var(--theme-glow)]'
                    : 'bg-white/10'
                    }`}
                />
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {step === 1 && (
              <div className="animate-fade-in-up grid gap-7 lg:grid-cols-[1fr_300px]">
                <div className="space-y-7">
                  <div>
                    <h2 className="text-2xl font-black">Sua Identidade</h2>
                    <p className="mt-1 text-sm text-gray-400">
                      Escolha seu avatar, nome, curso e sala para começar.
                    </p>
                  </div>

                  <div>
                    <label className="mb-3 block text-sm font-semibold text-gray-300">
                      Escolha seu avatar
                    </label>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {AVATARS.map((avatar) => {
                        const selected = form.avatarId === avatar.id

                        return (
                          <button
                            key={avatar.id}
                            type="button"
                            onClick={() => {
                              set({ avatarId: avatar.id })
                              applyAvatarTheme(avatar.id)
                            }}
                            aria-pressed={selected}
                            className={`group relative grid place-items-center rounded-2xl border p-3 transition-all duration-300 active:scale-95 ${selected
                              ? 'border-primary bg-white/[0.04] shadow-[0_0_18px_var(--theme-glow)]'
                              : 'border-white/10 bg-black/20 opacity-80 hover:-translate-y-1 hover:border-primary/60 hover:opacity-100'
                              }`}
                          >
                            <Avatar
                              id={avatar.id}
                              size={64}
                              selected={selected}
                              className="h-16 w-16"
                            />

                            <span className="mt-2 text-center text-xs font-bold text-white">
                              {avatar.name}
                            </span>

                            <span className="mt-0.5 text-center text-[10px] font-medium text-gray-400">
                              {avatar.archetype}
                            </span>

                            {selected && (
                              <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-primary text-xs font-black text-white">
                                ✓
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-300">
                      Nome do personagem
                    </label>
                    <input
                      value={form.name}
                      onChange={(event) => set({ name: event.target.value })}
                      className={inputCls}
                      placeholder="Como você quer ser chamado?"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-300">
                      Gênero
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'male', label: 'Masculino' },
                        { id: 'female', label: 'Feminino' },
                      ].map((gender) => (
                        <button
                          key={gender.id}
                          type="button"
                          onClick={() => set({ gender: gender.id })}
                          className={`rounded-xl border py-3 font-medium transition-all active:scale-[0.98] ${form.gender === gender.id
                            ? 'border-primary bg-primary text-white shadow-[0_0_18px_var(--theme-glow)]'
                            : 'border-white/10 bg-black/20 text-gray-400 hover:border-primary/60'
                            }`}
                        >
                          {gender.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-300">
                      Curso de Engenharia
                    </label>

                    <select
                      value={form.course}
                      onChange={(event) => set({ course: event.target.value })}
                      className={`${inputCls} appearance-none`}
                    >
                      <option value="">Selecione seu curso</option>
                      {COURSES.map((course) => (
                        <option key={course} value={course}>
                          {course}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-300">
                      Código da Sala
                    </label>

                    <input
                      value={form.roomCode}
                      onChange={(event) =>
                        set({ roomCode: event.target.value.toUpperCase() })
                      }
                      className={`${inputCls} font-mono tracking-widest`}
                      placeholder="Ex: XYK940"
                      maxLength={6}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!canGoStep2}
                    className={primaryButtonCls}
                  >
                    Próximo
                  </button>
                </div>

                <aside className="space-y-4">
                  <CharacterPreview
                    avatar={selectedAvatar}
                    form={form}
                    selectedGift={selectedGift}
                  />

                  <Checklist form={form} />
                </aside>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in-up space-y-7">
                <div>
                  <h2 className="text-2xl font-black">Escolha seu Dom</h2>
                  <p className="mt-1 text-sm text-gray-400">
                    Você só pode escolher 1 dom e não pode mudar depois.
                  </p>
                </div>

                <div className="grid gap-4">
                  {GIFTS.map((gift) => {
                    const selected = form.gift === gift.id

                    return (
                      <button
                        key={gift.id}
                        type="button"
                        onClick={() => set({ gift: gift.id })}
                        className={`group w-full rounded-2xl border p-5 text-left transition-all duration-300 active:scale-[0.99] ${selected
                          ? 'border-primary bg-primary/10 shadow-[0_0_22px_var(--theme-glow)]'
                          : 'border-white/10 bg-black/20 hover:-translate-y-1 hover:border-primary/50'
                          }`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl transition-all ${selected
                              ? 'bg-primary/20 shadow-[0_0_18px_var(--theme-glow)]'
                              : 'bg-white/5 group-hover:bg-white/10'
                              }`}
                          >
                            {gift.icon}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-primary/15 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--theme-secondary)]">
                                {gift.type}
                              </span>

                              <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                                {gift.rarity}
                              </span>
                            </div>

                            <h3 className="text-lg font-black text-white">{gift.name}</h3>

                            <p className="mt-0.5 text-sm font-semibold text-[var(--theme-muted)]">
                              {gift.focus}
                            </p>

                            <p className="mt-2 text-sm leading-relaxed text-gray-400">
                              {gift.effect}
                            </p>
                          </div>

                          {selected && (
                            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-black text-white">
                              ✓
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {selectedGift && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-gray-300">
                    <span className="font-bold text-white">{selectedGift.name}</span>{' '}
                    combina com jogadores focados em{' '}
                    <span className="font-semibold text-[var(--theme-secondary)]">
                      {selectedGift.focus.toLowerCase()}
                    </span>
                    .
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className={secondaryButtonCls}
                  >
                    Voltar
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!canGoStep3}
                    className="flex-1 rounded-xl bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] py-3 font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in-up space-y-7">
                <div>
                  <h2 className="text-2xl font-black">Ficha do Personagem</h2>
                  <p className="mt-1 text-sm text-gray-400">
                    Confere se está tudo certo antes de começar sua jornada financeira.
                  </p>
                </div>

                <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/20">
                  <div className="relative border-b border-white/10 bg-gradient-to-r from-[var(--theme-primary)]/25 to-[var(--theme-secondary)]/15 p-6">
                    <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[var(--theme-secondary)] opacity-20 blur-3xl" />

                    <div className="relative flex items-center gap-5">
                      <Avatar id={form.avatarId} size={82} selected />

                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-[var(--theme-muted)]">
                          Personagem criado
                        </p>

                        <h3 className="mt-1 text-3xl font-black">
                          {form.name}
                        </h3>

                        <p className="mt-1 text-sm text-gray-300">
                          {selectedAvatar.name} · {selectedAvatar.archetype}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 p-5 sm:grid-cols-2">
                    <InfoCard label="Curso" value={form.course} />
                    <InfoCard
                      label="Gênero"
                      value={form.gender === 'male' ? 'Masculino' : 'Feminino'}
                    />
                    <InfoCard label="Sala" value={form.roomCode} />
                    <InfoCard label="Salário inicial" value="R$ 7.000,00/mês" />
                    <InfoCard label="Dom" value={selectedGift?.name} />
                    <InfoCard label="Tipo do dom" value={selectedGift?.type} />
                  </div>

                  <div className="mx-5 mb-5 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm leading-relaxed text-gray-300">
                    <span className="font-bold text-white">
                      {form.name}
                    </span>{' '}
                    está pronto para começar a vida financeira com o perfil{' '}
                    <span className="font-semibold text-[var(--theme-secondary)]">
                      {selectedAvatar.archetype}
                    </span>
                    .
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className={secondaryButtonCls}
                  >
                    Voltar
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 rounded-xl bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] py-3 font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 shadow-[0_0_24px_var(--theme-glow)]"
                  >
                    {loading ? 'Criando...' : 'Começar Jogo!'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

function CharacterPreview({ avatar, form, selectedGift }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center gap-4">
        <Avatar id={form.avatarId} size={76} selected />

        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--theme-muted)]">
            Preview
          </p>

          <h3 className="mt-1 truncate text-xl font-black">
            {form.name || 'Seu personagem'}
          </h3>

          <p className="truncate text-sm text-gray-400">
            {form.course || 'Curso ainda não escolhido'}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--theme-muted)]">
          Arquétipo
        </p>

        <p className="mt-2 font-bold text-white">
          {avatar.name}
        </p>

        <p className="mt-1 text-sm text-gray-400">
          {avatar.description}
        </p>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--theme-muted)]">
          Dom inicial
        </p>

        <p className="mt-2 font-bold text-white">
          {selectedGift?.name || 'Ainda não escolhido'}
        </p>

        <p className="mt-1 text-sm text-gray-400">
          {selectedGift?.effect || 'Escolha um dom no próximo passo.'}
        </p>
      </div>
    </div>
  )
}

function Checklist({ form }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--theme-muted)]">
        Progresso
      </p>

      <div className="mt-4 space-y-3 text-sm">
        <CheckItem done={Boolean(form.name)}>Nome definido</CheckItem>
        <CheckItem done={Boolean(form.gender)}>Gênero escolhido</CheckItem>
        <CheckItem done={Boolean(form.course)}>Curso selecionado</CheckItem>
        <CheckItem done={Boolean(form.roomCode)}>Sala informada</CheckItem>
      </div>
    </div>
  )
}

function CheckItem({ done, children }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid h-5 w-5 place-items-center rounded-full text-xs font-black transition-all ${done
          ? 'bg-primary text-white shadow-[0_0_12px_var(--theme-glow)]'
          : 'bg-white/10 text-gray-500'
          }`}
      >
        {done ? '✓' : '•'}
      </span>

      <span className={done ? 'text-white' : 'text-gray-500'}>
        {children}
      </span>
    </div>
  )
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--theme-muted)]">
        {label}
      </p>

      <p className="mt-2 font-bold text-white">
        {value || '—'}
      </p>
    </div>
  )
}