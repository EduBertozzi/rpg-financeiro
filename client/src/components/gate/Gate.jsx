import { useState } from 'react'
import { STORAGE_KEY, gateState } from './gate'

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

// Enquanto o jogo é surpresa, quem não tem a chave vê só esta tela.
export default function Gate({ children }) {
  const [open] = useState(() => {
    const { open, save } = gateState({ search: window.location.search, stored: readStored() })
    if (save) {
      try {
        localStorage.setItem(STORAGE_KEY, save)
      } catch {
        // sem storage: precisa abrir com a chave de novo na próxima vez
      }
      // tira a chave da barra de endereço para ela não ir junto num print
      const url = new URL(window.location.href)
      url.searchParams.delete('chave')
      window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    }
    return open
  })

  if (open) return children

  return (
    <main className="grid min-h-screen place-items-center bg-[#0A7F75] p-6 text-center text-white">
      <div className="grid justify-items-center gap-5">
        <img src="/favicon.svg" alt="" className="h-24 w-24 drop-shadow-[0_6px_0_rgba(0,0,0,0.18)]" />
        <h1 className="font-toy text-[56px] font-extrabold leading-[0.9]">Fecha o Mês</h1>
        <p className="max-w-sm text-lg text-[#D7F5F1]">Santa Rita está quase pronta. Em breve a cidade abre as portas.</p>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8FE3D9]">Simulador financeiro · Inatel</p>
      </div>
    </main>
  )
}
