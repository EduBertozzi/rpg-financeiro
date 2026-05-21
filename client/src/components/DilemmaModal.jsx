import { useState, useEffect } from 'react'
import api from '../services/api'
import useGameStore from '../store/gameStore'

export default function DilemmaModal({ onClose, onComplete }) {
  const { character, room } = useGameStore()
  const [dilemma, setDilemma] = useState(null)
  const [loading, setLoading] = useState(!room?.currentTurn ? false : true)
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
      const { data } = await api.post(`/characters/${character.id}/dilemma/${room.currentTurn}/choose`, { optionIndex })
      setResult(data)
    } catch (err) {
      console.error(err)
    } finally {
      setChoosing(false)
    }
  }

  const handleClose = () => {
    if (result) {
      onComplete()
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-darker border border-yellow-700 rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
        
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-gray-400">Carregando lazer do mês...</p>
          </div>
        ) : !dilemma ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 mb-6">
              {!room?.currentTurn ? "A partida ainda não começou!" : "Nenhum lazer este mês."}
            </p>
            <button onClick={handleClose} className="px-6 py-2 bg-primary text-white rounded-lg">Fechar</button>
          </div>
        ) : (
          <div className="p-8">
            <div className="text-center mb-6">
              <span className="text-4xl">⚡</span>
              <h2 className="text-2xl font-bold text-white mt-2">Lazer do Mês</h2>
              <p className="text-yellow-400 text-sm">Mês {room?.currentTurn} de 12</p>
            </div>

            {!result ? (
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-3">{dilemma.title}</h3>
                <p className="text-gray-300 mb-6 text-sm leading-relaxed">{dilemma.description}</p>
                <div className="space-y-3">
                  {dilemma.options.map((option, index) => (
                    <button key={index} onClick={() => handleChoose(index)} disabled={choosing}
                      className="w-full p-3 bg-dark border border-border hover:border-yellow-500 rounded-xl text-left transition-all disabled:opacity-50">
                      <div className="flex items-start gap-3">
                        <span className="text-yellow-400 font-bold">{option.label}</span>
                        <p className="text-gray-300 text-sm leading-relaxed">{option.text}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <button onClick={handleClose} className="text-gray-500 hover:text-white text-sm">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-yellow-700 rounded-2xl p-8 text-center space-y-6">
                <div className="text-5xl">{result.cashImpact > 0 ? '🎉' : result.cashImpact < 0 ? '😬' : '😐'}</div>
                <h3 className="text-xl font-bold text-white">Resultado</h3>
                <p className="text-gray-300 text-sm">{result.result}</p>
                {result.cashImpact !== 0 && (
                  <p className={`text-2xl font-bold ${result.cashImpact > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {result.cashImpact > 0 ? '+' : ''}R$ {Number(result.cashImpact).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                )}
                <p className="text-yellow-400 text-sm">+1 ponto de habilidade ganho!</p>
                <button onClick={handleClose} className="px-8 py-3 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl transition-colors">
                  Concluir Lazer
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
