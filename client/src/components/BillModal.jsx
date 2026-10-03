import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import useGameStore from '../store/gameStore'
import MareLogo from '../pages/Bank/MareLogo'
import { MONTHS } from '../pages/Bank/bankData'
import { OVERDRAFT_MONTHLY_RATE, overdraftInterest, paymentPreview } from '../pages/Bank/bankMath'
import mercadinhoArt from '../assets/buildings/mercadinho.png'
import utilitiesArt from '../assets/buildings/utilities.png'
import internetArt from '../assets/buildings/internet.png'
import CompanyInfo from './CompanyInfo'

// empresa de cada conta (botão "i")
const BILL_COMPANY = { food: 'mercadinho', utilities: 'utilities', transport: 'internet' }

const BILL_ART = { food: mercadinhoArt, utilities: utilitiesArt, transport: internetArt }

const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Pagamento de conta do mês pelo banco Maré: a conta aparece como um boleto,
// paga com o saldo em conta e gera um comprovante.
export default function BillModal({ type, label, onClose, onComplete }) {
  const navigate = useNavigate()
  const { character, room } = useGameStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null) // { amount, cashAfter, alreadyPaid }
  const [bill, setBill] = useState(null) // { amount, baseAmount, discount } vindo do servidor

  const turn = room?.currentTurn ?? 0
  const month = MONTHS[turn - 1] ?? `mês ${turn}`
  // o valor vem do servidor, já com o desconto das habilidades: é o mesmo que será cobrado
  const amount = Number(bill?.amount ?? 0)
  const discount = Number(bill?.discount ?? 0)
  const cash = Number(character?.cash ?? 0)
  const preview = paymentPreview(cash, amount)

  // se a conta já foi paga neste mês, abre direto no comprovante
  useEffect(() => {
    if (!character?.id || !turn) return
    api.get(`/characters/${character.id}/bills/${turn}`)
      .then(({ data }) => {
        const found = data.find((b) => b.type === type)
        setBill(found ?? null)
        if (found?.paid) setReceipt({ amount: found.amount, alreadyPaid: true })
      })
      .catch((err) => {
        console.error(err)
        setError('Não deu para carregar a conta. Tente de novo.')
      })
  }, [character?.id, turn, type])

  const handlePay = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post(`/characters/${character.id}/bills/${turn}/pay`, { type })
      setReceipt({ amount: data.amount, cashAfter: data.cashAfter })
    } catch (err) {
      setError(err.response?.data?.error || 'Não deu para pagar agora. Tente de novo.')
    } finally {
      setLoading(false)
    }
  }

  const finish = () => (receipt && !receipt.alreadyPaid ? onComplete() : onClose())

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && finish()}
    >
      <div role="dialog" aria-label={`Pagar ${label} com o Maré`} className="w-full max-w-md overflow-hidden rounded-[26px] bg-[#F3F6F6] text-[#10201E] shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between gap-3 bg-[#12B5A6] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <MareLogo size={34} />
            <div>
              <p className="text-lg font-black leading-none">Maré</p>
              <p className="mt-1 text-xs opacity-90">{receipt ? 'Comprovante' : 'Pagamento de conta'}</p>
            </div>
          </div>
          <button type="button" onClick={finish} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-full bg-white/20 hover:bg-white/30 cursor-pointer">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        {!receipt ? (
          <div className="grid gap-4 p-5">
            <div className="flex items-center gap-4 rounded-[18px] bg-white p-4 shadow-sm">
              <img src={BILL_ART[type]} alt="" className="h-16 w-16 shrink-0 object-contain" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#627673]">Conta de {month}</p>
                <p className="flex items-center gap-2 text-lg font-black"><span className="truncate">{label}</span><CompanyInfo id={BILL_COMPANY[type]} align="right" /></p>
                <p className="text-xs text-[#627673]">Vence no fim do mês</p>
              </div>
            </div>

            <div className="grid gap-1 rounded-[18px] bg-white p-4 text-center shadow-sm">
              <p className="text-sm text-[#627673]">Valor</p>
              <p className="text-4xl font-black tracking-tight tabular-nums">{bill ? brl(amount) : '…'}</p>
              {discount > 0 && (
                <p className="text-xs font-bold text-[#0A7F75]">
                  <s className="font-normal text-[#627673]">{brl(bill.baseAmount)}</s> · {Math.round(discount * 100)}% de desconto {bill.coupon ? (discount > 0.2 + 1e-9 ? 'pelas habilidades e pelo cupom' : 'pelo cupom') : 'pelas suas habilidades'}
                </p>
              )}
            </div>

            <div className="grid gap-2 rounded-[18px] bg-white p-4 text-sm shadow-sm">
              <p className="font-extrabold">Pagar com saldo em conta</p>
              <div className="flex justify-between gap-3">
                <span className="text-[#627673]">Saldo agora</span>
                <b className="tabular-nums">{brl(cash)}</b>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#627673]">Depois de pagar</span>
                <b className={`tabular-nums ${preview.negative ? 'text-[#C4283D]' : ''}`}>{brl(preview.after)}</b>
              </div>
              {preview.negative && (
                <p className="rounded-[10px] bg-[#FDE2E5] px-3 py-2 text-[#9F1D2F]">
                  Seu saldo não cobre a conta: você entra no cheque especial, que cobra {OVERDRAFT_MONTHLY_RATE * 100}% ao mês.
                  Se ficar assim até o fim do mês, são <b>{brl(overdraftInterest(preview.after))}</b> de juros. Resgate de uma caixinha antes, se puder.
                </p>
              )}
            </div>

            {error && <p className="rounded-[10px] bg-[#FDE2E5] px-3 py-2 text-sm text-[#9F1D2F]">{error}</p>}

            <button
              type="button"
              onClick={handlePay}
              disabled={loading || !bill}
              className="rounded-[14px] bg-[#12B5A6] py-3.5 font-extrabold text-white transition-colors hover:bg-[#0A7F75] disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Pagando…' : bill ? `Pagar ${brl(amount)}` : 'Carregando…'}
            </button>
            <button type="button" onClick={onClose} className="font-bold text-[#627673] cursor-pointer">Agora não</button>
          </div>
        ) : (
          <div className="grid gap-4 p-5">
            <div className="grid justify-items-center gap-2 rounded-[18px] bg-white p-5 text-center shadow-sm">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-[#E2F6F3] text-[#0A7F75]">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>
              </span>
              <p className="text-lg font-black">{receipt.alreadyPaid ? 'Essa conta já está paga' : 'Pagamento feito'}</p>
              <p className="text-3xl font-black tabular-nums">{brl(receipt.amount)}</p>
            </div>
            <div className="grid gap-2 rounded-[18px] bg-white p-4 text-sm shadow-sm">
              <div className="flex justify-between gap-3"><span className="text-[#627673]">Para</span><b>{label}</b></div>
              <div className="flex justify-between gap-3"><span className="text-[#627673]">Conta de</span><b>{month}</b></div>
              <div className="flex justify-between gap-3"><span className="text-[#627673]">Pago com</span><b>Saldo em conta</b></div>
              {receipt.cashAfter !== undefined && (
                <div className="flex justify-between gap-3">
                  <span className="text-[#627673]">Saldo restante</span>
                  <b className={`tabular-nums ${receipt.cashAfter < 0 ? 'text-[#C4283D]' : ''}`}>{brl(receipt.cashAfter)}</b>
                </div>
              )}
            </div>
            <button type="button" onClick={finish} className="rounded-[14px] bg-[#12B5A6] py-3.5 font-extrabold text-white transition-colors hover:bg-[#0A7F75] cursor-pointer">
              Concluir
            </button>
            <button type="button" onClick={() => navigate('/bank')} className="font-bold text-[#0A7F75] cursor-pointer">
              Ver no extrato do Maré
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
