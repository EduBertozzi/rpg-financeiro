import { useState, useEffect } from 'react'
import api from '../services/api'
import useGameStore from '../store/gameStore'
import { TOY_CARD, TOY_ERROR } from './town/toy'
import leisureArt from '../assets/buildings/leisure.png'

export default function DilemmaModal({ onClose, onComplete }) {
  const { character, room } = useGameStore()
  const [dilemma, setDilemma] = useState(null)
  const [loading, setLoading] = useState(!room?.currentTurn ? false : true)
  const [choosing, setChoosing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [wasAlreadyAnswered, setWasAlreadyAnswered] = useState(false)

  useEffect(() => {
    if (!character?.id || !room?.currentTurn) return

    api.get(`/characters/${character.id}/dilemma/${room.currentTurn}`)
      .then(({ data }) => {
        setDilemma(data.dilemma)
        if (data.alreadyAnswered && data.previousResult) {
          setResult({ result: data.previousResult.result, cashImpact: data.previousResult.cashImpact })
          setWasAlreadyAnswered(true)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [character?.id, room?.currentTurn])

  const handleChoose = async (optionIndex) => {
    setChoosing(true)
    setError('')
    try {
      const { data } = await api.post(`/characters/${character.id}/dilemma/${room.currentTurn}/choose`, { optionIndex })
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar sua escolha. Tente novamente.')
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

  const pink = 'bg-[#EC4899] shadow-[0_5px_0_#B8336F] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_#B8336F]'
  const money = (v) => `${v > 0 ? '+' : '−'}R$ ${Math.abs(Number(v)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#24331F]/55 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div role="dialog" aria-label="Lazer do mês" className={`w-full max-w-xl ${TOY_CARD} px-6 pb-7 pt-3 sm:px-8 animate-fade-in-up`}>
        <img src={leisureArt} alt="" className="mx-auto -mt-20 h-32 drop-shadow-[0_10px_10px_rgba(0,0,0,0.18)]" />

        {loading ? (
          <p className="py-10 text-center text-[#6B7A62]">Carregando o lazer do mês…</p>
        ) : !dilemma ? (
          <div className="grid justify-items-center gap-5 py-6 text-center">
            <p className="text-[#6B7A62]">{!room?.currentTurn ? 'A partida ainda não começou!' : 'Nenhum lazer este mês.'}</p>
            <button type="button" onClick={handleClose} className={`rounded-[16px] px-6 py-2 font-toy text-[17px] font-extrabold text-white transition-transform cursor-pointer ${pink}`}>Fechar</button>
          </div>
        ) : (
          <div className="grid gap-5">
            <div className="text-center">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#B8336F]">Lazer · mês {room?.currentTurn} de 12</p>
              <h2 className="font-toy text-[30px] font-extrabold leading-tight">{dilemma.title}</h2>
            </div>

            {!result ? (
              <>
                <p className="text-center text-[15px] leading-relaxed text-[#4A5A42]">{dilemma.description}</p>
                <div className="grid gap-3">
                  {dilemma.options.map((option, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleChoose(index)}
                      disabled={choosing}
                      className="flex items-center gap-3 rounded-[20px] border-[3px] border-[#EFE6D3] bg-white p-3.5 text-left transition-[transform,border-color] hover:-translate-y-0.5 hover:border-[#EC4899] disabled:opacity-60 cursor-pointer"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FCE4F1] font-toy text-lg font-extrabold text-[#B8336F]">{option.label}</span>
                      <span className="text-[15px] font-semibold leading-snug">{option.text}</span>
                    </button>
                  ))}
                </div>
                {error && <p className={TOY_ERROR}>{error}</p>}
                <button type="button" onClick={handleClose} className="justify-self-center text-sm font-bold text-[#8A9680] hover:text-[#24331F] cursor-pointer">Agora não</button>
              </>
            ) : (
              <div className="grid justify-items-center gap-4 text-center">
                <p className="font-toy text-xl font-extrabold">{wasAlreadyAnswered ? 'Lazer já concluído' : 'Resultado'}</p>
                <p className="text-[15px] text-[#4A5A42]">{result.result}</p>
                {result.cashImpact !== 0 && (
                  <p className={`font-toy text-[34px] font-extrabold tabular-nums ${result.cashImpact > 0 ? 'text-[#2B8C41]' : 'text-[#C4283D]'}`}>
                    {money(result.cashImpact)}
                  </p>
                )}
                {!wasAlreadyAnswered && (
                  <p className="rounded-full bg-[#EEE7FE] px-4 py-1.5 text-sm font-extrabold text-[#6538C9]">+1 ponto de habilidade para a Universidade</p>
                )}
                <button type="button" onClick={handleClose} className={`rounded-[16px] px-8 py-2.5 font-toy text-[18px] font-extrabold text-white transition-transform cursor-pointer ${pink}`}>
                  {wasAlreadyAnswered ? 'Fechar' : 'Concluir lazer'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
