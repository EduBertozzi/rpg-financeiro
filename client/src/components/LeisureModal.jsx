import { useEffect, useState } from 'react'
import { sfx } from '../services/sound'
import api from '../services/api'
import useGameStore from '../store/gameStore'
import { TOY_CARD, TOY_ERROR } from './town/toy'
import CompanyInfo from './CompanyInfo'
import leisureArt from '../assets/buildings/leisure.png'

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const PINK = 'bg-[#EC4899] shadow-[0_5px_0_#B8336F] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_#B8336F]'

// Lazer do mês: dois passeios com o mesmo preço. A escolha é de gosto.
export default function LeisureModal({ onClose, onComplete }) {
  const { character, room } = useGameStore()
  const turn = room?.currentTurn ?? 0
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(turn > 0)
  const [picked, setPicked] = useState(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(null) // { title, cashImpact }
  const [error, setError] = useState('')

  useEffect(() => {
    if (!character?.id || !turn) return
    api.get(`/characters/${character.id}/leisure/${turn}`)
      .then(({ data }) => setData(data))
      .catch(() => setError('Não deu para carregar o lazer do mês.'))
      .finally(() => setLoading(false))
  }, [character?.id, turn])

  const leisure = data?.leisure
  const chosen = data?.chosen

  const confirm = async () => {
    if (picked == null) return
    setSaving(true)
    setError('')
    try {
      const { data: res } = await api.post(`/characters/${character.id}/leisure/${turn}/choose`, { optionIndex: picked })
      setDone(res)
      sfx.coin()
    } catch (err) {
      setError(err.response?.data?.error || 'Não deu para pagar o lazer. Tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  const close = () => (done ? onComplete() : onClose())

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#24331F]/55 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div role="dialog" aria-label="Lazer do mês" className={`w-full max-w-xl ${TOY_CARD} px-6 pb-7 pt-3 sm:px-8 animate-fade-in-up`}>
        <img src={leisureArt} alt="" className="mx-auto -mt-20 h-32 drop-shadow-[0_10px_10px_rgba(0,0,0,0.18)]" />

        <div className="mb-4 flex items-center justify-center gap-2 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#B8336F]">Lazer de {MONTHS[turn - 1] ?? 'mês'} · Praça do Coreto</p>
          <CompanyInfo id="leisure" align="right" />
        </div>

        {loading ? (
          <p className="py-10 text-center text-[#6B7A62]">Carregando o lazer do mês…</p>
        ) : !leisure ? (
          <div className="grid justify-items-center gap-5 py-6 text-center">
            <p className="text-[#6B7A62]">{turn ? 'Nenhum lazer este mês.' : 'A partida ainda não começou!'}</p>
            {error && <p className={TOY_ERROR}>{error}</p>}
            <button type="button" onClick={close} className={`rounded-[16px] px-6 py-2 font-toy text-[17px] font-extrabold text-white cursor-pointer ${PINK}`}>Fechar</button>
          </div>
        ) : done || chosen ? (
          <div className="grid justify-items-center gap-3 py-2 text-center">
            <h2 className="font-toy text-[30px] font-extrabold leading-tight">{done?.title ?? chosen.title}</h2>
            <p className="text-[15px] text-[#4A5A42]">{done ? 'Bom passeio! O lazer do mês está pago.' : 'Você já escolheu o lazer deste mês.'}</p>
            <p className="font-toy text-[34px] font-extrabold tabular-nums text-[#C4283D]">−{brl(done ? -done.cashImpact : chosen.amount)}</p>
            <button type="button" onClick={close} className={`rounded-[16px] px-8 py-2.5 font-toy text-[18px] font-extrabold text-white cursor-pointer ${PINK}`}>
              {done ? 'Concluir lazer' : 'Fechar'}
            </button>
          </div>
        ) : (
          <div className="grid gap-5">
            <h2 className="text-center font-toy text-[28px] font-extrabold leading-tight">O que você vai fazer este mês?</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {leisure.options.map((o, i) => (
                <button
                  key={o.title}
                  type="button"
                  onClick={() => setPicked(i)}
                  aria-pressed={picked === i}
                  className={`grid content-start gap-1.5 rounded-[20px] border-[3px] bg-white p-4 text-left transition-[transform,border-color] hover:-translate-y-0.5 cursor-pointer ${picked === i ? 'border-[#EC4899] bg-[#FDF0F6]' : 'border-[#EFE6D3] hover:border-[#F5A9CB]'}`}
                >
                  <b className="font-toy text-[19px] leading-tight">{o.title}</b>
                  <span className="text-[13px] leading-snug text-[#6B7A62]">{o.description}</span>
                </button>
              ))}
            </div>
            <div className="grid justify-items-center gap-1">
              <span className="rounded-full bg-[#FCE4F1] px-5 py-1 font-toy text-[22px] font-extrabold tabular-nums text-[#B8336F]">−{brl(leisure.price)}</span>
              {leisure.discount > 0 && (
                <span className="text-xs font-bold text-[#6B7A62]"><s>{brl(leisure.basePrice)}</s> · desconto do Trabalho em Equipe</span>
              )}
              <span className="text-xs text-[#8A9680]">As duas opções custam o mesmo. Escolha a que tem mais a sua cara.</span>
            </div>
            {error && <p className={TOY_ERROR}>{error}</p>}
            <button
              type="button"
              onClick={confirm}
              disabled={picked == null || saving}
              className={`rounded-[18px] px-5 py-3 font-toy text-[19px] font-extrabold text-white transition-transform cursor-pointer disabled:cursor-not-allowed disabled:bg-[#E3B9CC] disabled:shadow-none ${PINK}`}
            >
              {saving ? 'Pagando…' : 'Escolher e pagar'}
            </button>
            <button type="button" onClick={close} className="justify-self-center text-sm font-bold text-[#8A9680] hover:text-[#24331F] cursor-pointer">Agora não</button>
          </div>
        )}
      </div>
    </div>
  )
}
