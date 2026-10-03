import { useState, useEffect } from 'react'
import api from '../services/api'
import useGameStore from '../store/gameStore'
import { TOY_CARD, TOY_ERROR } from './town/toy'
import { afterLabel, savedTotal } from './dilemmaMoney'

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const AMBER = 'bg-[#F2B53A] shadow-[0_5px_0_#C98A12] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_#C98A12]'

// quanto a opção custa agora, do jeito que o jogador lê
function priceLabel(option) {
  if (option.installment) return `${option.installment.count}x de ${brl(option.installment.amount)}`
  return option.price > 0 ? `−${brl(option.price)}` : 'Sem gasto agora'
}

// Envelope que abre o pop-up do dilema.
function Letter() {
  return (
    <svg viewBox="0 0 120 90" className="mx-auto -mt-16 h-24 drop-shadow-[0_10px_10px_rgba(0,0,0,0.18)]" aria-hidden="true">
      <rect x="6" y="14" width="108" height="70" rx="12" fill="#FFF3C4" stroke="#E0A100" strokeWidth="4" />
      <path d="M10 22 60 58l50-36" fill="none" stroke="#E0A100" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="96" cy="18" r="14" fill="#EC4899" />
      <text x="96" y="24" textAnchor="middle" fontSize="18" fontWeight="900" fill="white" fontFamily="'Baloo 2', sans-serif">!</text>
    </svg>
  )
}

// Dilema do mês: chega no começo do mês e precisa de resposta para fechar o
// mês. As consequências não aparecem aqui — elas chegam nos meses seguintes.
export default function DilemmaModal({ onClose, onComplete }) {
  const { character, room } = useGameStore()
  const turn = room?.currentTurn ?? 0
  const [dilemma, setDilemma] = useState(null)
  const [loading, setLoading] = useState(turn > 0)
  const [choosing, setChoosing] = useState(false)
  const [result, setResult] = useState(null) // { result, cashImpact, lockSeconds }
  const [error, setError] = useState('')
  const [wasAlreadyAnswered, setWasAlreadyAnswered] = useState(false)
  const [money, setMoney] = useState(null) // { cash, saved } atualizado na hora

  useEffect(() => {
    if (!character?.id || !turn) return

    api.get(`/characters/${character.id}/dilemma/${turn}`)
      .then(({ data }) => {
        setDilemma(data.dilemma)
        if (data.alreadyAnswered && data.previousResult) {
          setResult({ choice: data.previousResult.text, result: data.previousResult.result, cashImpact: data.previousResult.cashImpact })
          setWasAlreadyAnswered(true)
        }
      })
      .catch(() => setError('Não deu para carregar o dilema do mês.'))
      .finally(() => setLoading(false))
    // saldo de agora (o da tela pode ser de antes da virada)
    api.get(`/characters/${character.id}`)
      .then(({ data }) => setMoney({ cash: Number(data.cash), saved: savedTotal(data.fixedInvestments ?? []) }))
      .catch(() => setMoney(null))
  }, [character?.id, turn])

  const handleChoose = async (optionIndex) => {
    setChoosing(true)
    setError('')
    try {
      const { data } = await api.post(`/characters/${character.id}/dilemma/${turn}/choose`, { optionIndex })
      setResult({ ...data, choice: dilemma.options[optionIndex].text })
    } catch (err) {
      setError(err.response?.data?.error || 'Não deu para registrar sua escolha. Tente de novo.')
    } finally {
      setChoosing(false)
    }
  }

  const handleClose = () => (result && !wasAlreadyAnswered ? onComplete(result) : onClose())

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#24331F]/55 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div role="dialog" aria-label="Dilema do mês" className={`w-full max-w-xl ${TOY_CARD} px-6 pb-7 pt-3 sm:px-8 animate-fade-in-up`}>
        <Letter />

        {loading ? (
          <p className="py-10 text-center text-[#6B7A62]">Abrindo a correspondência…</p>
        ) : !dilemma ? (
          <div className="grid justify-items-center gap-5 py-6 text-center">
            <p className="text-[#6B7A62]">{turn ? 'Nenhum dilema este mês. Só as consequências do que você escolheu.' : 'A partida ainda não começou!'}</p>
            {error && <p className={TOY_ERROR}>{error}</p>}
            <button type="button" onClick={handleClose} className={`rounded-[16px] px-6 py-2 font-toy text-[17px] font-extrabold text-[#5A3D00] cursor-pointer ${AMBER}`}>Fechar</button>
          </div>
        ) : (
          <div className="grid gap-5">
            <div className="text-center">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#B07A0C]">Dilema de {MONTHS[turn - 1]}</p>
              <h2 className="font-toy text-[30px] font-extrabold leading-tight">{dilemma.title}</h2>
            </div>

            {!result ? (
              <>
                <p className="text-center text-[15px] leading-relaxed text-[#4A5A42]">{dilemma.description}</p>
                {money && (
                  <div className="flex flex-wrap justify-center gap-2 text-[13px] font-bold">
                    <span className={`rounded-full px-3 py-1 tabular-nums ${money.cash < 0 ? 'bg-[#FDE2E5] text-[#9F1D2F]' : 'bg-[#E2F4E5] text-[#2B8C41]'}`}>Na conta: {money.cash < 0 ? '−' : ''}{brl(Math.abs(money.cash))}</span>
                    <span className="rounded-full bg-[#DCE7FB] px-3 py-1 tabular-nums text-[#2457C5]">Guardado nas caixinhas: {brl(money.saved)}</span>
                  </div>
                )}
                <div className="grid gap-3">
                  {dilemma.options.map((option, index) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => handleChoose(index)}
                      disabled={choosing}
                      className="flex items-center gap-3 rounded-[20px] border-[3px] border-[#EFE6D3] bg-white p-3.5 text-left transition-[transform,border-color] hover:-translate-y-0.5 hover:border-[#F2B53A] disabled:opacity-60 cursor-pointer"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FFF3C4] font-toy text-lg font-extrabold text-[#B07A0C]">{option.label}</span>
                      <span className="grid min-w-0 flex-1 gap-0.5">
                        <span className="text-[15px] font-semibold leading-snug">{option.text}</span>
                        {money && (() => {
                          const after = afterLabel(money.cash, option, brl)
                          return <span className={`text-[12px] font-bold ${after.negative ? 'text-[#C4283D]' : 'text-[#6B7A62]'}`}>{after.text}</span>
                        })()}
                      </span>
                      <span className="shrink-0 rounded-full bg-[#F6EFDF] px-3 py-1 text-xs font-extrabold tabular-nums text-[#6B5A2E]">{priceLabel(option)}</span>
                    </button>
                  ))}
                </div>
                {error && <p className={TOY_ERROR}>{error}</p>}
                <button type="button" onClick={handleClose} className="justify-self-center text-sm font-bold text-[#8A9680] hover:text-[#24331F] cursor-pointer">Decidir depois</button>
              </>
            ) : (
              <div className="grid justify-items-center gap-4 text-center">
                <p className="rounded-full bg-[#FFF3C4] px-4 py-1 text-sm font-extrabold text-[#7A5200]">{result.choice}</p>
                <p className="text-[15px] text-[#4A5A42]">{result.result}</p>
                {result.cashImpact !== 0 && (
                  <p className={`font-toy text-[34px] font-extrabold tabular-nums ${result.cashImpact > 0 ? 'text-[#2B8C41]' : 'text-[#C4283D]'}`}>
                    {result.cashImpact > 0 ? '+' : '−'}{brl(Math.abs(result.cashImpact))}
                  </p>
                )}
                {!wasAlreadyAnswered && (
                  <p className="rounded-full bg-[#EEE7FE] px-4 py-1.5 text-sm font-extrabold text-[#6538C9]">+1 ponto de habilidade para a Universidade</p>
                )}
                <button type="button" onClick={handleClose} className={`rounded-[16px] px-8 py-2.5 font-toy text-[18px] font-extrabold text-[#5A3D00] cursor-pointer ${AMBER}`}>
                  {wasAlreadyAnswered ? 'Fechar' : 'Seguir o mês'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
