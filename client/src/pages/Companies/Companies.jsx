import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'

const RISK_CONFIG = {
  low:    { label: 'Baixo risco',  color: 'text-green-400',  border: 'border-green-700',  bg: 'bg-green-900/30'  },
  medium: { label: 'Médio risco',  color: 'text-yellow-400', border: 'border-yellow-700', bg: 'bg-yellow-900/30' },
  high:   { label: 'Alto risco',   color: 'text-red-400',    border: 'border-red-700',    bg: 'bg-red-900/30'    },
}

export default function Companies() {
  const navigate = useNavigate()
  const { character, setCharacter } = useGameStore()
  const [companies, setCompanies] = useState([])
  const [debentures, setDebentures] = useState([])
  const [amount, setAmount] = useState({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [tab, setTab] = useState('companies')

  useEffect(() => {
    api.get('/investments/companies')
      .then(({ data }) => setCompanies(data))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!character?.id) return
    api.get(`/investments/debentures/${character.id}`)
      .then(({ data }) => setDebentures(data))
      .catch(console.error)
  }, [character?.id])

  const handleInvest = async (companyId) => {
    const value = Number(amount[companyId] || 0)
    if (value <= 0) return setMessage({ text: 'Digite um valor válido', type: 'error' })
    if (value > Number(character.cash)) return setMessage({ text: 'Saldo insuficiente', type: 'error' })

    setLoading(true)
    setMessage({ text: '', type: '' })
    try {
      await api.post(`/investments/debentures/${character.id}`, { companyId, amount: value })
      setMessage({ text: 'Investimento em debênture realizado!', type: 'success' })
      setAmount({ ...amount, [companyId]: '' })
      const [charData, debData] = await Promise.all([
        api.get(`/characters/${character.id}`),
        api.get(`/investments/debentures/${character.id}`)
      ])
      setCharacter(charData.data)
      setDebentures(debData.data)
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao investir', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const totalDebentures = debentures
    .filter(d => d.status === 'active')
    .reduce((sum, d) => sum + Number(d.amount), 0)

  return (
    <div className="min-h-screen bg-darker text-white">

      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/map')} className="text-gray-400 hover:text-white transition-colors">
            ← Voltar
          </button>
          <div>
            <h1 className="text-xl font-bold">🏢 Empresas</h1>
            <p className="text-xs text-gray-400">Investimento em Debêntures</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Saldo disponível</p>
          <p className="text-green-400 font-bold">
            R$ {Number(character?.cash ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8 space-y-6">

        {/* Resumo */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Total em Debêntures</p>
            <p className="text-purple-400 font-bold text-xl">
              R$ {totalDebentures.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Investimentos Ativos</p>
            <p className="text-primary font-bold text-xl">
              {debentures.filter(d => d.status === 'active').length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('companies')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${tab === 'companies' ? 'bg-primary text-white' : 'bg-card border border-border text-gray-400 hover:text-white'}`}
          >
            Empresas
          </button>
          <button
            onClick={() => setTab('mydebentures')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${tab === 'mydebentures' ? 'bg-primary text-white' : 'bg-card border border-border text-gray-400 hover:text-white'}`}
          >
            Meus Investimentos
          </button>
        </div>

        {message.text && (
          <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-900/30 border border-red-500/50 text-red-400' : 'bg-green-900/30 border border-green-500/50 text-green-400'}`}>
            {message.text}
          </div>
        )}

        {/* Lista de empresas */}
        {tab === 'companies' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">Analise o rating de cada empresa antes de investir. Maior retorno = maior risco de calote.</p>
            {companies.map(company => {
              const risk = RISK_CONFIG[company.riskLevel]
              return (
                <div key={company.id} className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-bold">{company.name}</h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${risk.bg} ${risk.color} ${risk.border}`}>
                          {company.riskRating}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${risk.bg} ${risk.color} ${risk.border}`}>
                          {risk.label}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">{company.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-lg">
                        {(Number(company.annualRate) * 100).toFixed(1)}% a.a.
                      </p>
                      <p className="text-xs text-gray-400">
                        Calote: {(Number(company.defaultProbability) * 100).toFixed(1)}%/mês
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={amount[company.id] || ''}
                      onChange={(e) => setAmount({ ...amount, [company.id]: e.target.value })}
                      className="w-40 px-3 py-2 bg-dark border border-border rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                      placeholder="Valor (R$)"
                      min="1"
                    />
                    <button
                      onClick={() => handleInvest(company.id)}
                      disabled={loading}
                      className="px-5 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Investir
                    </button>
                    <span className="text-xs text-gray-500">Vence em 3 meses</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Meus investimentos */}
        {tab === 'mydebentures' && (
          <div className="space-y-3">
            {debentures.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhum investimento em debêntures ainda.</p>
            ) : (
              debentures.map(deb => {
                const risk = RISK_CONFIG[deb.company.riskLevel]
                return (
                  <div key={deb.id} className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-bold">{deb.company.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded border ${risk.bg} ${risk.color} ${risk.border}`}>
                            {deb.company.riskRating}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            deb.status === 'active' ? 'bg-blue-900/30 text-blue-400' :
                            deb.status === 'paid' ? 'bg-green-900/30 text-green-400' :
                            'bg-red-900/30 text-red-400'
                          }`}>
                            {deb.status === 'active' ? 'Ativo' : deb.status === 'paid' ? 'Pago' : 'Calote'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          Investido: R$ {Number(deb.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · Vence no mês {deb.maturesAt}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">
                          {(Number(deb.annualRate) * 100).toFixed(1)}% a.a.
                        </p>
                        {deb.returnedValue && (
                          <p className="text-green-400 text-sm">
                            Retorno: R$ {Number(deb.returnedValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

      </div>
    </div>
  )
}