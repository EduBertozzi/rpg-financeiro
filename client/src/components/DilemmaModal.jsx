import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { sfx } from '../services/sound'
import { formatClock, isUrgent } from './monthClock'
import api from '../services/api'
import useGameStore from '../store/gameStore'
import { TOY_CARD, TOY_ERROR } from './town/toy'

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

// Dilema do mês: abre quando o mês é encerrado (pelo jogador ou pelo fim do
// tempo) e tem o próprio relógio. Dá para olhar o banco antes de decidir.
// As consequências não aparecem aqui — elas chegam nos meses seguintes.
// timeLeft: ms para responder (null sem relógio); onBank: abre/fecha o banco;
// side: o banco aberto ao lado (a tela se divide: banco à esquerda, carta à direita).
export default function DilemmaModal({ onClose, onComplete, onAnswered, timeLeft = null, onBank, side = null }) {
  const { character, room } = useGameStore()
  const turn = room?.currentTurn ?? 0
  const [dilemma, setDilemma] = useState(null)
  const [loading, setLoading] = useState(turn > 0)
  const [choosing, setChoosing] = useState(false)
  const [result, setResult] = useState(null) // { result, cashImpact, lockSeconds }
  const [error, setError] = useState('')
  const [wasAlreadyAnswered, setWasAlreadyAnswered] = useState(false)

  useEffect(() => {
    if (!character?.id || !turn) return
    sfx.letter()

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
  }, [character?.id, turn])

  const handleChoose = async (optionIndex) => {
    setChoosing(true)
    setError('')
    try {
      const { data } = await api.post(`/characters/${character.id}/dilemma/${turn}/choose`, { optionIndex })
      setResult({ ...data, choice: dilemma.options[optionIndex].text })
      onAnswered?.()
      sfx.pop()
    } catch (err) {
      setError(err.response?.data?.error || 'Não deu para registrar sua escolha. Tente de novo.')
    } finally {
      setChoosing(false)
    }
  }

  const handleClose = () => (result && !wasAlreadyAnswered ? onComplete(result) : onClose())
  // sem resposta, o dilema não fecha: ou responde, ou vai ao banco e volta
  const canDismiss = Boolean(result) || !dilemma

  return createPortal(
    <div
      className={side
        ? 'fixed inset-0 z-[70] grid content-start gap-4 overflow-y-auto bg-[#24331F]/55 p-4 backdrop-blur-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:content-stretch lg:overflow-hidden'
        : 'fixed inset-0 z-[70] flex items-center justify-center bg-[#24331F]/55 p-4 backdrop-blur-sm'}
      onClick={(e) => e.target === e.currentTarget && canDismiss && handleClose()}
    >
      {side && <div className="order-2 min-w-0 lg:order-1 lg:h-full lg:overflow-y-auto lg:rounded-[28px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{side}</div>}
      {/* a carta no meio da coluna, com espaço em cima para o envelope que sai dela */}
      <div className={side ? 'order-1 flex min-w-0 flex-col pt-14 lg:order-2 lg:h-full lg:overflow-y-auto lg:pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : 'contents'}>
      <div role="dialog" aria-label="Dilema do mês" className={`w-full max-w-xl ${side ? 'mx-auto lg:my-auto' : ''} ${TOY_CARD} px-6 pb-7 pt-3 sm:px-8 animate-fade-in-up`}>
        <Letter />
        {!result && timeLeft != null && (
          <p role="timer" className={`mx-auto -mt-1 mb-2 w-fit rounded-full px-3 py-1 text-sm font-extrabold tabular-nums ${isUrgent(timeLeft) ? 'animate-pulse bg-[#C4283D] text-white' : 'bg-[#FFF3C4] text-[#7A5200]'}`}>
            ⏱ {formatClock(timeLeft)} para decidir · se não responder, o jogo escolhe por você
          </p>
        )}

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
                      </span>
                      <span className="shrink-0 rounded-full bg-[#F6EFDF] px-3 py-1 text-xs font-extrabold tabular-nums text-[#6B5A2E]">{priceLabel(option)}</span>
                    </button>
                  ))}
                </div>
                {error && <p className={TOY_ERROR}>{error}</p>}
                {onBank && (
                  <button type="button" onClick={onBank} className="justify-self-center rounded-full border-2 border-[#CFE3E0] bg-[#EAF6F4] px-4 py-1.5 text-sm font-extrabold text-[#0A7F75] hover:bg-[#DDF1EE] cursor-pointer">
                    {side ? 'Fechar o banco' : 'Acessar o banco'}
                  </button>
                )}
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
                  <p className="rounded-full bg-[#EEE7FE] px-4 py-1.5 text-sm font-extrabold text-[#6538C9]">+1 ponto para a Árvore de habilidades</p>
                )}
                <button type="button" onClick={handleClose} className={`rounded-[16px] px-8 py-2.5 font-toy text-[18px] font-extrabold text-[#5A3D00] cursor-pointer ${AMBER}`}>
                  {wasAlreadyAnswered ? 'Fechar' : 'Fechar o mês'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>,
    document.body,
  )
}
