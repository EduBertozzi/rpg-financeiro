import { useState } from 'react'
import api from '../services/api'
import useGameStore from '../store/gameStore'

export default function BillModal({ type, label, onClose, onComplete }) {
  const { character, room } = useGameStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const amount = character
    ? Number({ food: character.foodCost, utilities: character.utilitiesCost, transport: character.transportCost }[type])
    : 0

  const handlePay = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post(`/characters/${character.id}/bills/${room.currentTurn}/pay`, { type })
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao pagar conta')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (result) onComplete()
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-darker border border-border rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
        <div className="p-8 text-center">
          {!result ? (
            <>
              <h2 className="text-xl font-bold text-white mb-1">{label}</h2>
              <p className="text-gray-400 text-sm mb-6">Conta do mês {room?.currentTurn}</p>

              <div className="bg-card border border-border rounded-2xl p-6 mb-6">
                <p className="text-xs text-gray-400 mb-1">Valor a pagar</p>
                <p className="text-2xl font-bold text-red-400">
                  R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 border border-border text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePay}
                  disabled={loading}
                  className="flex-1 py-3 bg-primary hover:bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {loading ? 'Pagando...' : 'Pagar'}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white">Conta paga!</h3>
              <p className="text-gray-300 text-sm">{result.label} — R$ {Number(result.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <button
                onClick={handleClose}
                className="px-8 py-3 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Concluir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
