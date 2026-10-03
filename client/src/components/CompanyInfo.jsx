import { useState } from 'react'
import { COMPANIES } from '../data/companies'

// Botão "i" com o cartão da empresa: história, o que você paga ali e uma dica.
export default function CompanyInfo({ id, className = '', align = 'left' }) {
  const [open, setOpen] = useState(false)
  const company = COMPANIES[id]
  if (!company) return null

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-expanded={open}
        aria-label={`Sobre ${company.name}`}
        className="grid h-6 w-6 place-items-center rounded-full bg-[#DCEBF8] font-mono text-[13px] font-bold text-[#2457C5] transition-transform hover:scale-110 cursor-pointer"
      >
        i
      </button>
      {open && (
        <span
          role="note"
          className={`absolute top-8 z-30 grid w-64 gap-1.5 rounded-[18px] bg-[#FFFDF7] p-4 text-left text-[#24331F] shadow-[0_5px_0_#E2D6BE,0_14px_30px_rgba(36,51,31,0.22)] ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          <b className="font-toy text-[17px] leading-tight">{company.name}</b>
          <span className="text-[13px] leading-snug text-[#4A5A42]">{company.story}</span>
          <span className="text-[12px] leading-snug text-[#6B7A62]"><b>Aqui você paga:</b> {company.pays}</span>
          <span className="rounded-xl bg-[#FFF3C4] px-2.5 py-1.5 text-[12px] font-semibold leading-snug text-[#7A5200]">{company.tip}</span>
        </span>
      )}
    </span>
  )
}
