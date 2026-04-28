import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'

export default function Dilemma() {
  const navigate = useNavigate()
  const { character, room } = useGameStore()
  const [dilemma, setDilemma] = useState(null)
  const [loading, setLoading] = useState(true)
  const [choosing, setChoosing] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!character?.id || !room?.currentTurn) return
    api.get(`/characters/${character.id}/dilemma/${room.currentTurn}`)
      .then(({ data }) => setDilemma(data.dilemma))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [character?.id, room?.currentTurn])

  const handleChoose = async (optionIndex) => {
    setChoosing(true)
    try {
      const { data } = await api.post(
        `/characters/${character.id}/dilemma/${room.currentTurn}/choose`,
        { optionIndex }
      )
      setResult(data)
    } catch (err) {
      console.error(err)
    } finally {
      setChoosing(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-darker flex items-center justify-center">
      <p className="text-gray-400">Carregando dilema...</p>
    </div>
  )

  if (!dilemma) return (
    <div className="min-h-screen bg-darker flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-400 mb-4">Nenhum dilema este mês.</p>
        <button
          onClick={() => navigate('/map')}
          className="px-6 py-3 bg-primary text-white rounded-lg"
        >
          Voltar ao Mapa
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-darker flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        <div className="text-center mb-8">
          <span className="text-5xl">⚡</span>
          <h1 className="text-3xl font-bold text-white mt-4 mb-2">Dilema do Mês</h1>
          <p className="text-yellow-400 text-sm">Mês {room?.currentTurn} de 12</p>
        </div>

        <div className="bg-card border border-yellow-700 rounded-2xl p-8">

          {!result ? (
            <>
              <h2 className="text-xl font-bold text-white mb-4">{dilemma.title}</h2>
              <p className="text-gray-300 mb-8 leading-relaxed">{dilemma.description}</p>

              <div className="space-y-3">
                {dilemma.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleChoose(index)}
                    disabled={choosing}
                    className="w-full p-4 bg-dark border border-border hover:border-yellow-500 rounded-xl text-left transition-all disabled:opacity-50"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-yellow-400 font-bold text-lg">
                        {option.label}
                      </span>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {option.text}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center space-y-6">
              <div className="text-5xl">
                {result.cashImpact > 0 ? '🎉' : result.cashImpact < 0 ? '😬' : '😐'}
              </div>
              <h2 className="text-xl font-bold text-white">Resultado</h2>
              <p className="text-gray-300">{result.result}</p>
              {result.cashImpact !== 0 && (
                <p className={`text-2xl font-bold ${result.cashImpact > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {result.cashImpact > 0 ? '+' : ''}R$ {Number(result.cashImpact).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              )}
              <p className="text-yellow-400 text-sm">+1 ponto de habilidade ganho!</p>
              <button
                onClick={() => navigate('/map')}
                className="px-8 py-3 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl transition-colors"
              >
                Voltar ao Mapa
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}