import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'

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
    icon: '💰'
  },
  {
    id: 'agile',
    name: 'Desenrolado',
    focus: 'Renda Ativa',
    effect: 'Valores recebidos em eventos positivos são 20% maiores.',
    icon: '⚡'
  },
  {
    id: 'smart',
    name: 'Inteligente',
    focus: 'Desenvolvimento Pessoal',
    effect: 'Habilidades na Skill Tree custam 20% menos pontos.',
    icon: '🧠'
  }
]

export default function CharacterCreation() {
  const navigate = useNavigate()
  const { setCharacter, setRoom } = useGameStore()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '',
    gender: '',
    course: '',
    gift: '',
    roomCode: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
  setError('')
  setLoading(true)
  try {
    const { data: room } = await api.get(`/rooms/${form.roomCode}`)
    
    const { data: character } = await api.post('/characters', {
      roomId: room.id,
      name: form.name,
      gender: form.gender,
      course: form.course,
      gift: form.gift
    })

    // busca o personagem completo com a sala inclusa
    const { data: fullCharacter } = await api.get(`/characters/${character.id}`)
    
    setRoom(room)
    setCharacter(fullCharacter)

    // pequeno delay pra garantir que o estado foi salvo antes de navegar
    setTimeout(() => navigate('/map'), 100)
  } catch (err) {
    setError(err.response?.data?.error || 'Erro ao criar personagem')
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="min-h-screen bg-darker flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Criar Personagem</h1>
          <p className="text-gray-400 text-sm">Passo {step} de 3</p>
          <div className="flex gap-2 justify-center mt-3">
            {[1,2,3].map(s => (
              <div key={s} className={`h-1 w-16 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-gray-700'}`} />
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">

          {/* Step 1 — Identidade */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white">Sua Identidade</h2>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome do personagem</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-dark border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                  placeholder="Como você quer ser chamado?"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Gênero</label>
                <div className="grid grid-cols-2 gap-3">
                  {[{id:'male',label:'Masculino'},{id:'female',label:'Feminino'}].map(g => (
                    <button
                      key={g.id}
                      onClick={() => setForm({ ...form, gender: g.id })}
                      className={`py-3 rounded-lg border font-medium transition-colors ${
                        form.gender === g.id
                          ? 'bg-primary border-primary text-white'
                          : 'bg-dark border-border text-gray-400 hover:border-primary'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Curso de Engenharia</label>
                <select
                  value={form.course}
                  onChange={(e) => setForm({ ...form, course: e.target.value })}
                  className="w-full px-4 py-3 bg-dark border border-border rounded-lg text-white focus:outline-none focus:border-primary"
                >
                  <option value="">Selecione seu curso</option>
                  {COURSES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Código da Sala</label>
                <input
                  type="text"
                  value={form.roomCode}
                  onChange={(e) => setForm({ ...form, roomCode: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-dark border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary font-mono tracking-widest"
                  placeholder="Ex: XYK940"
                  maxLength={6}
                />
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!form.name || !form.gender || !form.course || !form.roomCode}
                className="w-full py-3 bg-primary hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
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
                {GIFTS.map(gift => (
                  <button
                    key={gift.id}
                    onClick={() => setForm({ ...form, gift: gift.id })}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      form.gift === gift.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-dark hover:border-gray-500'
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
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-border text-gray-400 hover:text-white rounded-lg transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!form.gift}
                  className="flex-1 py-3 bg-primary hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
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

              <div className="bg-dark rounded-xl p-4 space-y-3 border border-border">
                <div className="flex justify-between">
                  <span className="text-gray-400">Nome</span>
                  <span className="text-white font-medium">{form.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Gênero</span>
                  <span className="text-white font-medium">{form.gender === 'male' ? 'Masculino' : 'Feminino'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Curso</span>
                  <span className="text-white font-medium text-right text-sm">{form.course}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Dom</span>
                  <span className="text-primary font-medium">{GIFTS.find(g => g.id === form.gift)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sala</span>
                  <span className="text-white font-mono font-bold">{form.roomCode}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="text-gray-400">Salário inicial</span>
                  <span className="text-green-400 font-bold">R$ 7.000,00/mês</span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-border text-gray-400 hover:text-white rounded-lg transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3 bg-primary hover:bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
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