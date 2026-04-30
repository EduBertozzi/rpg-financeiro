import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameHeader from '../../components/GameHeader'
import useGameStore from '../../store/gameStore'
import api from '../../services/api'

const MEDAL = ['🥇', '🥈', '🥉']

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value ?? 0)
}

function NetWorthBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="w-full bg-darker rounded-full h-2 mt-1">
      <div
        className="h-2 rounded-full transition-all duration-1000"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

function WinnerCard({ player }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 p-8 mb-10 text-center"
      style={{ borderColor: '#FFD700', background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 60%, #1A2540 100%)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,215,0,0.12) 0%, transparent 70%)' }}
      />
      <div className="relative z-10">
        <div className="text-5xl mb-3">🏆</div>
        <p className="text-yellow-400 text-sm font-semibold tracking-widest uppercase mb-1">Vencedor</p>
        <h2 className="text-4xl font-bold text-white mb-2">{player.characterName}</h2>
        <p className="text-3xl font-bold text-yellow-300">{formatCurrency(player.netWorth)}</p>
        <p className="text-gray-400 text-sm mt-1">Patrimônio líquido final</p>
      </div>
    </div>
  )
}

function RankingRow({ player, isSelf, index, maxNetWorth }) {
  const colors = ['#FFD700', '#C0C0C0', '#CD7F32']
  const barColor = colors[index] ?? '#4A90D9'
  const isTop3 = index < 3

  return (
    <div className={`rounded-xl p-4 transition-all ${isSelf ? 'border-2 border-primary bg-card' : 'border border-border bg-card'}`}>
      <div className="flex items-center gap-4">
        <div className="w-10 text-center flex-shrink-0">
          {isTop3 ? (
            <span className="text-2xl">{MEDAL[index]}</span>
          ) : (
            <span className="text-gray-400 font-bold text-lg">#{player.rank}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold truncate ${isSelf ? 'text-primary' : 'text-white'}`}>
              {player.characterName}
            </span>
            {isSelf && (
              <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full flex-shrink-0">você</span>
            )}
          </div>
          <NetWorthBar value={player.netWorth} max={maxNetWorth} color={barColor} />
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-white">{formatCurrency(player.netWorth)}</p>
        </div>
      </div>
    </div>
  )
}

function DetailCard({ label, value, sub }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className="text-white font-bold text-lg">{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
    </div>
  )
}

export default function Finished() {
  const navigate = useNavigate()
  const { character, room, setCharacter, setRoom } = useGameStore()

  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(!!room?.id)
  const [error, setError] = useState(room?.id ? null : 'Sala não encontrada.')

  useEffect(() => {
    if (!room?.id) return

    api
      .get(`/rooms/${room.id}/leaderboard`)
      .then((res) => setLeaderboard(res.data))
      .catch(() => setError('Não foi possível carregar o ranking.'))
      .finally(() => setLoading(false))
  }, [room?.id])

  function handleVoltar() {
    setCharacter(null)
    setRoom(null)
    navigate('/lobby')
  }

  const winner = leaderboard[0] ?? null
  const maxNetWorth = winner?.netWorth ?? 1
  const myRank = leaderboard.find((p) => p.characterId === character?.id)
  const myPosition = myRank ? leaderboard.indexOf(myRank) + 1 : null

  return (
    <div className="min-h-screen bg-darker text-white">
      <GameHeader />

      <div className="max-w-2xl mx-auto p-6 pb-16">
        <div className="text-center mb-8 pt-4">
          <h1 className="text-4xl font-bold text-white mb-1">Fim de Jogo!</h1>
          <p className="text-gray-400">12 meses se passaram. Confira os resultados finais.</p>
        </div>

        {loading && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <p>Carregando resultados...</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-20 text-red-400">
            <div className="text-4xl mb-4">⚠️</div>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {winner && <WinnerCard player={winner} />}

            {myRank && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-300 mb-3">Seu desempenho</h2>
                <div className="grid grid-cols-2 gap-3">
                  <DetailCard
                    label="Posição final"
                    value={`#${myPosition}`}
                    sub={`de ${leaderboard.length} jogadores`}
                  />
                  <DetailCard
                    label="Patrimônio final"
                    value={formatCurrency(myRank.netWorth)}
                    sub={myPosition === 1 ? 'Você venceu!' : `${formatCurrency(winner.netWorth - myRank.netWorth)} atrás do 1º`}
                  />
                </div>
              </div>
            )}

            <div className="mb-10">
              <h2 className="text-lg font-semibold text-gray-300 mb-3">Ranking final</h2>
              <div className="flex flex-col gap-3">
                {leaderboard.map((player, i) => (
                  <RankingRow
                    key={player.characterId}
                    player={player}
                    index={i}
                    isSelf={player.characterId === character?.id}
                    maxNetWorth={maxNetWorth}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Botão sempre visível — inclusive em caso de erro */}
        {!loading && (
          <button
            onClick={handleVoltar}
            className="w-full py-4 rounded-xl font-bold text-lg bg-primary hover:bg-blue-600 transition-colors text-white"
          >
            Voltar ao Lobby
          </button>
        )}
      </div>
    </div>
  )
}