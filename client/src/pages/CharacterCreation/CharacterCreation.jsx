import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'
import { Avatar, AVATARS } from '../../components/Avatars'

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
  { id: 'frugal', name: 'Mão de Vaca Estratégico', focus: 'Retenção de Capital', effect: 'Todos os custos fixos mensais são 15% menores.', icon: '💰' },
  { id: 'agile', name: 'Desenrolado', focus: 'Renda Ativa', effect: 'Valores recebidos em eventos positivos são 20% maiores.', icon: '⚡' },
  { id: 'smart', name: 'Inteligente', focus: 'Desenvolvimento Pessoal', effect: 'Habilidades na Skill Tree custam 20% menos pontos.', icon: '🧠' },
]

export default function CharacterCreation() {
  const navigate = useNavigate()
  const { setCharacter, setRoom } = useGameStore()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', gender: '', avatarId: 1, course: '', gift: '', roomCode: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

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
      setTimeout(() => navigate('/map'), 100)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar personagem')
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all'

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0B0D17] flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0 perspective-grid opacity-15" />
      <div className="absolute top-[-10%] left-[-10%] w-[420px] h-[420px] bg-blue-600/15 rounded-full blur-[110px] animate-float pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[420px] h-[420px] bg-purple-600/15 rounded-full blur-[110px] animate-float pointer-events-none z-0" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 w-full max-w-xl">

        <div className="text-center mb-7">
          <h1 className="text-3xl font-bold text-white mb-1">Criar Personagem</h1>
          <p className="text-gray-400 text-sm">Passo {step} de 3</p>
          <div className="flex gap-2 justify-center mt-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1 w-16 rounded-full transition-colors ${s <= step ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 'bg-white/10'}`} />
            ))}
          </div>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-7 sm:p-8 ring-1 ring-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">

          {/* Step 1 — Identidade */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white">Sua Identidade</h2>

              {/* Avatar — círculos uniformes */}
              <div>
                <label className="block text-sm text-gray-400 mb-3">Escolha seu avatar</label>
                <div className="flex flex-wrap gap-3 sm:gap-4 justify-center sm:justify-between">
                  {AVATARS.map((a) => {
                    const sel = form.avatarId === a.id
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => set({ avatarId: a.id })}
                        aria-pressed={sel}
                        className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full transition-transform duration-200 ${sel ? 'scale-110' : 'opacity-65 hover:opacity-100'}`}
                      >
                        <Avatar id={a.id} size={64} className="w-full h-full" />
                        <span
                          className={`absolute inset-0 rounded-full pointer-events-none transition-all ${sel ? 'ring-[3px] ring-primary shadow-[0_0_18px_rgba(74,144,217,0.55)]' : 'ring-1 ring-white/10'
                            }`}
                        />
                        {sel && (
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary grid place-items-center text-white text-[11px] font-bold border-2 border-[#0B0D17]">
                            ✓
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Nome do personagem</label>
                <input type="text" value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} placeholder="Como você quer ser chamado?" />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Gênero</label>
                <div className="grid grid-cols-2 gap-3">
                  {[{ id: 'male', label: 'Masculino' }, { id: 'female', label: 'Feminino' }].map((gn) => (
                    <button
                      key={gn.id}
                      onClick={() => set({ gender: gn.id })}
                      className={`py-3 rounded-xl border font-medium transition-colors ${form.gender === gn.id ? 'bg-primary border-primary text-white' : 'bg-black/20 border-white/10 text-gray-400 hover:border-primary/60'
                        }`}
                    >
                      {gn.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Curso de Engenharia</label>
                <select value={form.course} onChange={(e) => set({ course: e.target.value })} className={`${inputCls} appearance-none`}>
                  <option value="" className="bg-[#0B0D17]">Selecione seu curso</option>
                  {COURSES.map((c) => <option key={c} value={c} className="bg-[#0B0D17]">{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Código da Sala</label>
                <input
                  type="text"
                  value={form.roomCode}
                  onChange={(e) => set({ roomCode: e.target.value.toUpperCase() })}
                  className={`${inputCls} font-mono tracking-widest`}
                  placeholder="Ex: XYK940"
                  maxLength={6}
                />
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!form.name || !form.gender || !form.course || !form.roomCode}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.25)]"
              >
                Próximo
              </button>
            </div>
          )}

          {/* Step 2 — Dom */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white">Escolha seu Dom</h2>
              <p className="text-gray-400 text-sm">Você só pode escolher 1 dom e não pode mudar depois.</p>

              <div className="space-y-3">
                {GIFTS.map((gift) => (
                  <button
                    key={gift.id}
                    onClick={() => set({ gift: gift.id })}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${form.gift === gift.id ? 'border-primary bg-primary/10' : 'border-white/10 bg-black/20 hover:border-white/30'
                      }`}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-2xl">{gift.icon}</span>
                      <div>
                        <p className="text-white font-semibold">{gift.name}</p>
                        <p className="text-primary text-xs">{gift.focus}</p>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm ml-9">{gift.effect}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 border border-white/10 text-gray-400 hover:text-white rounded-xl transition-colors">Voltar</button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!form.gift}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Confirmação */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white">Confirmação</h2>

              <div className="flex items-center gap-4 bg-black/20 rounded-2xl p-4 border border-white/10">
                <div className="w-16 h-16 rounded-full ring-2 ring-primary/60 overflow-hidden shrink-0 shadow-[0_0_18px_rgba(74,144,217,0.35)]">
                  <Avatar id={form.avatarId} size={64} className="w-full h-full" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-lg leading-tight truncate">{form.name}</p>
                  <p className="text-gray-400 text-sm truncate">{form.course}</p>
                  <p className="text-primary text-xs mt-0.5">{GIFTS.find((g) => g.id === form.gift)?.name}</p>
                </div>
              </div>

              <div className="bg-black/20 rounded-2xl p-4 space-y-3 border border-white/10">
                <div className="flex justify-between"><span className="text-gray-400">Gênero</span><span className="text-white font-medium">{form.gender === 'male' ? 'Masculino' : 'Feminino'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Sala</span><span className="text-white font-mono font-bold">{form.roomCode}</span></div>
                <div className="border-t border-white/10 pt-3 flex justify-between"><span className="text-gray-400">Salário inicial</span><span className="text-green-400 font-bold">R$ 7.000,00/mês</span></div>
              </div>

              {error && <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-xl text-red-400 text-sm">{error}</div>}

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 border border-white/10 text-gray-400 hover:text-white rounded-xl transition-colors">Voltar</button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all"
                >
                  {loading ? 'Criando...' : 'Começar Jogo!'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}