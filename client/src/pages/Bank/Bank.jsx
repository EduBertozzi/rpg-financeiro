import { useState, useEffect } from 'react'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'
import GameHeader from '../../components/GameHeader'

export default function Bank() {
  const { character, setCharacter } = useGameStore()
  const [investments, setInvestments] = useState([])
  const [amount, setAmount] = useState('')
  const [isEmergency, setIsEmergency] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!character?.id) return
    api.get(`/investments/fixed/${character.id}`)
      .then(({ data }) => setInvestments(data))
      .catch(console.error)
  }, [character?.id])

  const fetchInvestments = async () => {
    if (!character?.id) return
    try {
      const { data } = await api.get(`/investments/fixed/${character.id}`)
      setInvestments(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleInvest = async () => {
    setError('')
    setSuccess('')
    if (!amount || Number(amount) <= 0) return setError('Digite um valor válido')
    if (Number(amount) > Number(character.cash)) return setError('Saldo insuficiente')
    setLoading(true)
    try {
      await api.post(`/investments/fixed/${character.id}`, { amount: Number(amount), isEmergency })
      setSuccess('Investimento realizado com sucesso!')
      setAmount('')
      const { data } = await api.get(`/characters/${character.id}`)
      setCharacter(data)
      fetchInvestments()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao investir')
    } finally {
      setLoading(false)
    }
  }

  const handleRedeem = async (investmentId) => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const { data } = await api.delete(`/investments/fixed/${character.id}/${investmentId}`)
      setSuccess(`Resgate realizado! Você recebeu R$ ${Number(data.redeemedValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
      const charData = await api.get(`/characters/${character.id}`)
      setCharacter(charData.data)
      fetchInvestments()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao resgatar')
    } finally {
      setLoading(false)
    }
  }

  const totalFixed = investments.reduce((sum, i) => sum + Number(i.amount), 0)

  return (
    <div className="min-h-screen bg-darker text-white">
      <GameHeader />

      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🏦</span>
          <div>
            <h1 className="text-xl font-bold">Banco</h1>
            <p className="text-xs text-gray-400">Renda Fixa e Reserva de Emergência</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Saldo em Caixa</p>
            <p className="text-green-400 font-bold text-xl">
              R$ {Number(character?.cash ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Total em Renda Fixa</p>
            <p className="text-blue-400 font-bold text-xl">
              R$ {totalFixed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Taxa Mensal (Selic)</p>
            <p className="text-primary font-bold text-xl">0,75% a.m.</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Novo Aporte</h2>
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Valor (R$)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-dark border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                placeholder="0,00"
                min="1"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleInvest}
                disabled={loading}
                className="px-6 py-3 bg-primary hover:bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Investindo...' : 'Investir'}
              </button>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-gray-400">Marcar como Reserva de Emergência</span>
          </label>
          {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
          {success && <p className="mt-3 text-green-400 text-sm">{success}</p>}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Seus Investimentos</h2>
          {investments.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhum investimento ainda. Faça seu primeiro aporte!</p>
          ) : (
            <div className="space-y-3">
              {investments.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-4 bg-dark rounded-lg border border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">
                        R$ {Number(inv.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      {inv.isEmergency && (
                        <span className="text-xs bg-yellow-900/50 text-yellow-400 border border-yellow-700 px-2 py-0.5 rounded-full">
                          Reserva
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Investido no mês {inv.investedAt} · {(Number(inv.monthlyRate) * 100).toFixed(2)}% a.m.
                    </p>
                  </div>
                  <button
                    onClick={() => handleRedeem(inv.id)}
                    disabled={loading}
                    className="px-4 py-2 text-sm border border-red-500/50 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    Resgatar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}