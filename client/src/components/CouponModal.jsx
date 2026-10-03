import { TOY_BUTTON, TOY_CARD } from './town/toy'

const ICON = { food_discount: '🛒', cashback: '💸', skill_point: '⭐' }

// Prêmio do cupom escondido no mapa.
export default function CouponModal({ reward, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#24331F]/55 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-label="Você achou um cupom" className={`grid w-full max-w-sm justify-items-center gap-3 px-6 py-7 text-center ${TOY_CARD} animate-fade-in-up`}>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#8A9680]">Você achou!</p>
        <h2 className="font-toy text-[28px] font-extrabold leading-tight">
          <span aria-hidden="true">{ICON[reward.kind] ?? '🎟'}</span> {reward.title}
        </h2>
        <p className="rounded-2xl border-[3px] border-dashed border-[#E0A100] bg-[#FFF3C4] px-5 py-3 font-toy text-[20px] font-extrabold leading-snug text-[#7A5200]">
          {reward.description}
        </p>
        <p className="text-sm text-[#6B7A62]">Fica registrado no extrato do Maré.</p>
        <button type="button" onClick={onClose} className={`${TOY_BUTTON} mt-1`}>Guardar cupom</button>
      </div>
    </div>
  )
}
