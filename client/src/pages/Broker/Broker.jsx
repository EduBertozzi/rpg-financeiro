import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'

export default function Broker() {
  const navigate = useNavigate()
  const { character, room, setCharacter } = useGameStore()
  const [market, setMarket] = useState([])
  const [portfolio, setPortfolio] = useState([])
  const [tab, setTab] = useState('market')
  const [quantity, setQuantity] = useState({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  useEffect(() => {
    if (!room?.id) return
    api.get(`/investments/market/${room.id}`)
      .then(({ data }) => setMarket(data))
      .catch(console.error)
  }, [room?.id])

  useEffect(() => {
    if (!character?.id) return
    api.get(`/investments/portfolio/${character.id}`)
      .then(({ data }) => setPortfolio(data))
      .catch(console.error)
  }, [character?.id])

  const refreshAll = async () => {
    const [marketData, portfolioData, charData] = await Promise.all([
      api.get(`/investments/market/${room.id}`),
      api.get(`/investments/portfolio/${character.id}`),
      api.get(`/characters/${character.id}`)
    ])
    setMarket(marketData.data)
    setPortfolio(portfolioData.data)
    setCharacter(charData.data)
  }

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

  const totalPortfolio = portfolio.reduce((sum, p) => sum + p.totalValue, 0)

  return (
    <div className="min-h-screen bg-darker text-white">

      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/map')} className="text-gray-400 hover:text-white transition-colors">
            ← Voltar
          </button>
          <div>
            <h1 className="text-xl font-bold">📈 Corretora</h1>
            <p className="text-xs text-gray-400">Ações e Fundos Imobiliários</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Saldo disponível</p>
          <p className="text-green-400 font-bold">
            R$ {Number(character?.cash ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-8 space-y-6">

        {/* Resumo carteira */}
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

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('market')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${tab === 'market' ? 'bg-primary text-white' : 'bg-card border border-border text-gray-400 hover:text-white'}`}
          >
            Mercado
          </button>
          <button
            onClick={() => setTab('portfolio')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${tab === 'portfolio' ? 'bg-primary text-white' : 'bg-card border border-border text-gray-400 hover:text-white'}`}
          >
            Minha Carteira
          </button>
        </div>

        {message.text && (
          <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-900/30 border border-red-500/50 text-red-400' : 'bg-green-900/30 border border-green-500/50 text-green-400'}`}>
            {message.text}
          </div>
        )}

        {/* Mercado */}
        {tab === 'market' && (
          <div className="space-y-3">
            {market.map(asset => (
              <div key={asset.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-white">{asset.ticker}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        asset.riskLevel === 'low' ? 'bg-green-900/30 text-green-400 border-green-700' :
                        asset.riskLevel === 'medium' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700' :
                        'bg-red-900/30 text-red-400 border-red-700'
                      }`}>
                        {asset.riskLevel === 'low' ? 'Baixo risco' : asset.riskLevel === 'medium' ? 'Médio risco' : 'Alto risco'}
                      </span>
                      <span className="text-xs text-gray-500">{asset.type === 'fii' ? 'FII' : 'Ação'}</span>
                    </div>
                    <p className="text-gray-400 text-sm">{asset.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-lg">
                      R$ {asset.currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className={`text-sm font-medium ${asset.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {asset.changePct >= 0 ? '▲' : '▼'} {Math.abs(asset.changePct).toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    value={quantity[asset.id] || ''}
                    onChange={(e) => setQuantity({ ...quantity, [asset.id]: e.target.value })}
                    className="w-24 px-3 py-2 bg-dark border border-border rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                    placeholder="Qtd"
                    min="1"
                  />
                  <button
                    onClick={() => handleTrade(asset.id, 'buy')}
                    disabled={loading}
                    className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Comprar
                  </button>
                  <button
                    onClick={() => handleTrade(asset.id, 'sell')}
                    disabled={loading}
                    className="px-4 py-2 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Vender
                  </button>
                  <span className="text-xs text-gray-500 self-center ml-2">
                    Total: R$ {((quantity[asset.id] || 0) * asset.currentPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Carteira */}
        {tab === 'portfolio' && (
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
                        <span className="text-xs text-gray-500">{pos.type === 'fii' ? 'FII' : 'Ação'}</span>
                      </div>
                      <p className="text-gray-400 text-sm">{pos.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">
                        R$ {pos.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
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
    </div>
  )
}