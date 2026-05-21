import { useState, useEffect } from 'react'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'
import GameHeader from '../../components/GameHeader'

const FIXED_OPTIONS = [
  { value: 'POUPANCA', label: 'Poupança (6,5% a.a.)' },
  { value: 'CDB', label: 'CDB Nubank (106% CDI)' },
  { value: 'TESOURO_SELIC', label: 'Tesouro Selic (+0,6% a.a.)' },
  { value: 'TESOURO_PRE', label: 'Tesouro Prefixado (13,5% a.a.)' },
  { value: 'LCI', label: 'LCI (108% CDI)' },
  { value: 'LCA', label: 'LCA (Selic + 2,6% a.a.)' },
]

export default function Bank() {
  const { character, room, setCharacter } = useGameStore()
  
  const [mainTab, setMainTab] = useState('fixed') // 'fixed' | 'variable'
  const [marketTab, setMarketTab] = useState('market')
  
  const [investments, setInvestments] = useState([])
  const [amount, setAmount] = useState('')
  const [fixedType, setFixedType] = useState('POUPANCA')
  const [isEmergency, setIsEmergency] = useState(false)
  
  const [market, setMarket] = useState([])
  const [portfolio, setPortfolio] = useState([])
  const [quantity, setQuantity] = useState({})
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const fetchFixed = async () => {
    try {
      const { data } = await api.get(`/investments/fixed/${character.id}`)
      setInvestments(data)
    } catch (err) { console.error(err) }
  }

  const fetchMarket = async () => {
    try {
      const { data } = await api.get(`/investments/market/${room.id}`)
      setMarket(data)
    } catch (err) { console.error(err) }
  }

  const fetchPortfolio = async () => {
    try {
      const { data } = await api.get(`/investments/portfolio/${character.id}`)
      setPortfolio(data)
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    if (!character?.id) return
    const load = async () => {
      await fetchFixed()
      await fetchPortfolio()
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id])

  useEffect(() => {
    if (!room?.id) return
    const loadMarket = async () => {
      await fetchMarket()
    }
    loadMarket()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id])

  const refreshAll = async () => {
    fetchFixed()
    fetchMarket()
    fetchPortfolio()
    const { data } = await api.get(`/characters/${character.id}`)
    setCharacter(data)
  }

  // --- Fixed Actions ---
  const handleInvestFixed = async () => {
    setMessage({ text: '', type: '' })
    if (!amount || Number(amount) <= 0) return setMessage({ text: 'Digite um valor válido', type: 'error' })
    if (Number(amount) > Number(character.cash)) return setMessage({ text: 'Saldo insuficiente', type: 'error' })
    setLoading(true)
    try {
      await api.post(`/investments/fixed/${character.id}`, { amount: Number(amount), type: fixedType, isEmergency })
      setMessage({ text: 'Investimento realizado com sucesso!', type: 'success' })
      setAmount('')
      await refreshAll()
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao investir', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleRedeemFixed = async (investmentId) => {
    setMessage({ text: '', type: '' })
    setLoading(true)
    try {
      const { data } = await api.delete(`/investments/fixed/${character.id}/${investmentId}`)
      setMessage({ text: `Resgate realizado! Você recebeu R$ ${Number(data.redeemedValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, type: 'success' })
      await refreshAll()
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao resgatar', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // --- Variable Actions ---
  const handleTrade = async (assetId, operation) => {
    const qty = Number(quantity[assetId] || 0)
    if (qty <= 0) return setMessage({ text: 'Digite uma quantidade válida', type: 'error' })
    setLoading(true)
    setMessage({ text: '', type: '' })
    try {
      await api.post(`/investments/trade/${character.id}`, { assetId, operation, quantity: qty })
      setMessage({ text: `${operation === 'buy' ? 'Compra' : 'Venda'} realizada com sucesso!`, type: 'success' })
      setQuantity({ ...quantity, [assetId]: '' })
      await refreshAll()
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro na operação', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const totalFixed = investments.reduce((sum, i) => sum + Number(i.amount), 0)
  const totalPortfolio = portfolio.reduce((sum, p) => sum + p.totalValue, 0)

  return (
    <div className="min-h-screen bg-darker text-white">
      <GameHeader />

      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🏦</span>
          <div>
            <h1 className="text-xl font-bold">Banco</h1>
            <p className="text-xs text-gray-400">Renda Fixa e Ações</p>
          </div>
        </div>

        <div className="flex gap-4 border-b border-border mb-6">
          <button 
            onClick={() => { setMainTab('fixed'); setMessage({text:'',type:''}) }} 
            className={`pb-2 px-4 font-bold transition-colors ${mainTab === 'fixed' ? 'border-b-2 border-primary text-primary' : 'text-gray-400 hover:text-white'}`}
          >
            Renda Fixa
          </button>
          <button 
            onClick={() => { setMainTab('variable'); setMessage({text:'',type:''}) }} 
            className={`pb-2 px-4 font-bold transition-colors ${mainTab === 'variable' ? 'border-b-2 border-primary text-primary' : 'text-gray-400 hover:text-white'}`}
          >
            Ações e FIIs (Corretora)
          </button>
        </div>

        {message.text && (
          <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-900/30 border border-red-500/50 text-red-400' : 'bg-green-900/30 border border-green-500/50 text-green-400'}`}>
            {message.text}
          </div>
        )}

        {/* --- ABA RENDA FIXA --- */}
        {mainTab === 'fixed' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Novo Aporte</h2>
              <div className="flex gap-3 mb-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm text-gray-400 mb-1">Tipo de Investimento</label>
                  <select 
                    value={fixedType} 
                    onChange={(e) => setFixedType(e.target.value)}
                    className="w-full px-4 py-3 bg-dark border border-border rounded-lg text-white focus:outline-none focus:border-primary"
                  >
                    {FIXED_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
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
                    onClick={handleInvestFixed}
                    disabled={loading}
                    className="px-6 py-3 bg-primary hover:bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors w-full"
                  >
                    Investir
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-4">
                <input
                  type="checkbox"
                  checked={isEmergency}
                  onChange={(e) => setIsEmergency(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-gray-400">Marcar como Reserva de Emergência</span>
              </label>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Meus Investimentos</h2>
              {investments.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhum investimento ainda.</p>
              ) : (
                <div className="space-y-3">
                  {investments.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-4 bg-dark rounded-lg border border-border">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">
                            R$ {Number(inv.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs bg-blue-900/50 text-blue-400 border border-blue-700 px-2 py-0.5 rounded-full">
                            {inv.type}
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
                        onClick={() => handleRedeemFixed(inv.id)}
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
        )}

        {/* --- ABA AÇÕES --- */}
        {mainTab === 'variable' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Valor da Carteira</p>
                <p className="text-green-400 font-bold text-xl">
                  R$ {totalPortfolio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Ativos na Carteira</p>
                <p className="text-primary font-bold text-xl">{portfolio.length} ativo(s)</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={() => setMarketTab('market')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${marketTab === 'market' ? 'bg-primary text-white' : 'bg-card border border-border text-gray-400 hover:text-white'}`}>Mercado</button>
              <button onClick={() => setMarketTab('portfolio')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${marketTab === 'portfolio' ? 'bg-primary text-white' : 'bg-card border border-border text-gray-400 hover:text-white'}`}>Minha Carteira</button>
            </div>

            {marketTab === 'market' && (
              <div className="space-y-3">
                {market.map(asset => (
                  <div key={asset.id} className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-white">{asset.ticker}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${asset.riskLevel === 'low' ? 'bg-green-900/30 text-green-400 border-green-700' : asset.riskLevel === 'medium' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700' : 'bg-red-900/30 text-red-400 border-red-700'}`}>
                            {asset.riskLevel === 'low' ? 'Baixo risco' : asset.riskLevel === 'medium' ? 'Médio risco' : 'Alto risco'}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm">{asset.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-lg">R$ {asset.currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className={`text-sm font-medium ${asset.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {asset.changePct >= 0 ? '▲' : '▼'} {Math.abs(asset.changePct).toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input type="number" value={quantity[asset.id] || ''} onChange={(e) => setQuantity({ ...quantity, [asset.id]: e.target.value })} className="w-24 px-3 py-2 bg-dark border border-border rounded-lg text-white text-sm focus:outline-none focus:border-primary" placeholder="Qtd" min="1" />
                      <button onClick={() => handleTrade(asset.id, 'buy')} disabled={loading} className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">Comprar</button>
                      <button onClick={() => handleTrade(asset.id, 'sell')} disabled={loading} className="px-4 py-2 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">Vender</button>
                      <span className="text-xs text-gray-500 self-center ml-2">Total: R$ {((quantity[asset.id] || 0) * asset.currentPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {marketTab === 'portfolio' && (
              <div className="space-y-3">
                {portfolio.length === 0 ? (
                  <p className="text-gray-400 text-sm">Nenhum ativo na carteira ainda.</p>
                ) : (
                  portfolio.map(pos => (
                    <div key={pos.id} className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-white">{pos.ticker}</span>
                          </div>
                          <p className="text-gray-400 text-sm">{pos.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">R$ {pos.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className={`text-sm ${pos.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {pos.profitLoss >= 0 ? '+' : ''}R$ {pos.profitLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-400">
                        <span>{pos.quantity} cotas</span>
                        <span>PM: R$ {pos.avgPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span>Atual: R$ {pos.currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}