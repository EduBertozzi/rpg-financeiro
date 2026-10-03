import { useEffect, useRef, useState } from 'react'
import { COMPANIES } from '../data/companies'
import { GLOSSARY, GUIDE_EVENT, PRODUCTS, overdraftAfter, searchGlossary, termOf, yearlyNet } from '../data/guide'

const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const TERM_LINK = 'font-extrabold text-[#2457C5] underline decoration-dotted underline-offset-[3px] cursor-pointer'

function Sticky({ children }) {
  return <p className="my-3 -rotate-1 rounded-[4px_12px_12px_12px] bg-[#FFF3C4] px-3.5 py-2.5 text-sm font-bold leading-snug text-[#7A5200] shadow-[2px_3px_0_rgba(0,0,0,0.08)]">{children}</p>
}
function Hand({ children }) {
  return <p className="font-hand text-[22px] font-bold leading-tight text-[#2457C5]">{children}</p>
}
function Chapter({ n }) {
  return <p className="font-hand text-[22px] font-bold text-[#A9B19E]">capítulo {n}</p>
}
const H2 = ({ children }) => <h2 className="mb-2 mt-0.5 font-toy text-[30px] font-extrabold leading-tight">{children}</h2>
const H3 = ({ children }) => <h3 className="mb-1 mt-3.5 font-toy text-[19px] font-extrabold">{children}</h3>

// Páginas de cada capítulo (o glossário é à parte). `go(term)` abre um termo.
const CHAPTERS = [
  {
    id: 'play', label: 'Como jogar', color: 'bg-[#3DBE5A] text-white',
    pages: [
      () => (
        <>
          <Chapter n={1} />
          <H2>Bem-vindo a Santa Rita</H2>
          <p>Você acabou de se formar e começou a trabalhar. Tem <b>R$ 7.000</b> de salário e um ano inteiro pela frente.</p>
          <Hand>O objetivo: terminar dezembro com o maior patrimônio da sala.</Hand>
          <H3>O que conta</H3>
          <p>Tudo o que você tem (saldo, caixinhas, ações) menos tudo o que deve (cheque especial, parcelas).</p>
          <Sticky>Dica: gastar pouco ajuda, mas investir bem ajuda mais.</Sticky>
        </>
      ),
      () => (
        <>
          <H3>Quem é quem na cidade</H3>
          <ul className="grid gap-0.5">
            {Object.entries(COMPANIES).map(([id, c]) => (
              <li key={id}><b>{c.name}</b>: {c.pays}</li>
            ))}
          </ul>
          <H3>Quem manda no tempo</H3>
          <p>O administrador da sala fecha cada mês quando a turma termina. Aí chega o salário, sai o aluguel e acontecem os imprevistos.</p>
        </>
      ),
    ],
  },
  {
    id: 'month', label: 'O mês', color: 'bg-[#F2B53A] text-[#4A3200]',
    pages: [
      () => (
        <>
          <Chapter n={2} />
          <H2>O que fazer em cada mês</H2>
          <ol className="grid gap-1.5">
            {[
              ['Responda o dilema.', 'Ele chega numa carta no começo do mês.'],
              ['Escolha o lazer.', 'Dois passeios, mesmo preço.'],
              ['Pague as três contas.', 'Mercadinho, Água e Luz, Internet.'],
              ['Passe no Banco.', 'Guarde o que sobrar.'],
              ['Encerre o mês.', 'Depois espere a turma.'],
            ].map(([title, text], i) => (
              <li key={title} className="grid grid-cols-[30px_1fr] items-start gap-2">
                <span className="mt-0.5 grid h-[26px] w-[26px] place-items-center rounded-full bg-[#3DBE5A] font-toy text-sm font-extrabold text-white">{i + 1}</span>
                <span><b>{title}</b> {text}</span>
              </li>
            ))}
          </ol>
        </>
      ),
      () => (
        <>
          <H3>Na virada do mês</H3>
          <p>Nesta ordem: juros do cheque especial, salário, consequências das suas escolhas, aluguel e um imprevisto.</p>
          <Hand>As escolhas voltam. Um dilema de março pode cobrar a conta em junho.</Hand>
          <H3>Esqueceu alguma coisa?</H3>
          <p>O mês fecha mesmo assim. Conta não paga vira <b>conta atrasada</b>, com 2% de multa e 1% de juros. O lazer é cobrado, e o dilema sem resposta é decidido por você não ter decidido.</p>
          <H3>Pontos de habilidade</H3>
          <p>Cada dilema respondido dá <b>1 ponto</b> para gastar na Universidade.</p>
        </>
      ),
    ],
  },
  {
    id: 'money', label: 'Dinheiro', color: 'bg-[#EC4899] text-white',
    pages: [
      ({ go }) => {
        const max = Math.max(...PRODUCTS.map((p) => yearlyNet(p)))
        return (
          <>
            <Chapter n={3} />
            <H2>Quanto rende R$ 1.000 em um ano</H2>
            <p>Já descontado o imposto, com as taxas do jogo.</p>
            <table className="mt-2 w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-[#A9B19E]"><th className="py-1">Caixinha</th><th /><th className="py-1 text-right">Ganho</th></tr>
              </thead>
              <tbody>
                {PRODUCTS.map((p) => (
                  <tr key={p.term} className="border-b border-dashed border-[#D8E6F2]">
                    <td className="py-1"><button type="button" onClick={() => go(p.term)} className={TERM_LINK}>{p.term}</button></td>
                    <td className="w-[38%] py-1"><div className="h-2 rounded bg-[#3DBE5A]" style={{ width: `${(yearlyNet(p) / max) * 100}%` }} /></td>
                    <td className="py-1 text-right font-extrabold tabular-nums">{brl(yearlyNet(p))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )
      },
      ({ go }) => (
        <>
          <H3>Ganhar mais tem um preço</H3>
          <p>Quem rende mais costuma <b>prender o dinheiro</b> por mais tempo ou ter <b>mais risco</b>. A debênture rende <b>R$ 180</b>, mas fica 10 meses presa e pode dar calote.</p>
          <H3>E a dívida?</H3>
          <p>
            <button type="button" onClick={() => go('Cheque especial')} className={TERM_LINK}>Cheque especial</button> a 8% ao mês transforma <b>R$ 1.000</b> em <b>{brl(overdraftAfter(1000))}</b> em um ano.
          </p>
          <Sticky>Antes de investir, saia do cheque especial. Nenhuma caixinha rende 8% ao mês.</Sticky>
        </>
      ),
    ],
  },
  { id: 'glossary', label: 'Glossário', color: 'bg-[#8A5CF6] text-white', pages: [] },
]
const GLOSSARY_INDEX = CHAPTERS.length - 1

function TermPage({ term, onBack }) {
  const g = termOf(term) ?? GLOSSARY[0]
  return (
    <div className="grid gap-1.5">
      <span className="justify-self-start rounded-full bg-[#D8E6F2] px-2.5 text-xs font-extrabold text-[#6B7A62]">{g.kind}</span>
      <H2>{g.term}</H2>
      <p>{g.text}</p>
      {g.facts.length > 0 && (
        <dl className="my-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
          {g.facts.map(([k, v]) => (
            <div key={k} className="contents"><dt className="text-[#6B7A62]">{k}</dt><dd className="m-0 font-extrabold">{v}</dd></div>
          ))}
        </dl>
      )}
      <p className="mt-2 border-t-2 border-dashed border-[#D8E6F2] pt-2 text-sm text-[#6B7A62]"><b>No jogo:</b> {g.ingame}</p>
      {onBack && <button type="button" onClick={onBack} className={`${TERM_LINK} justify-self-start text-sm`}>← voltar para a lista</button>}
    </div>
  )
}

function TermList({ term, query, setQuery, onPick, inputId }) {
  const items = searchGlossary(query)
  return (
    <>
      <Chapter n={4} />
      <H2>Glossário</H2>
      <label htmlFor={inputId} className="sr-only">Procurar termo</label>
      <input
        id={inputId}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Procurar: CDB, inflação…"
        className="mb-2 w-full rounded-[14px] border-2 border-[#D8E6F2] bg-[#FFFDF5] px-3 py-2 text-[15px] outline-none focus:border-[#2457C5]"
      />
      <div className="grid gap-0.5">
        {items.map((g) => (
          <button key={g.term} type="button" onClick={() => onPick(g.term)} aria-current={g.term === term}
            className={`flex justify-between gap-2 rounded-[10px] px-2 py-1 text-left font-bold cursor-pointer ${g.term === term ? 'bg-[#FFF3C4] text-[#7A5200]' : 'hover:bg-[#FFF3C4]'}`}>
            {g.term}<small className="font-semibold text-[#A9B19E]">{g.kind}</small>
          </button>
        ))}
        {items.length === 0 && <p className="text-[#6B7A62]">Nada com esse nome.</p>}
      </div>
    </>
  )
}

// O caderninho: fica fechado no canto da tela e abre como um livro de duas
// páginas (uma no celular). Qualquer tela abre um termo com openGuide(termo).
export default function Notebook() {
  const [open, setOpen] = useState(false)
  const [chapter, setChapter] = useState(0)
  const [page, setPage] = useState(0) // página no celular
  const [term, setTerm] = useState('CDB')
  const [query, setQuery] = useState('')
  const [showList, setShowList] = useState(true) // celular: lista ou definição
  const [flipKey, setFlipKey] = useState(0)
  const closeRef = useRef(null)
  const openerRef = useRef(null)

  const turn = (fn) => {
    fn()
    setFlipKey((k) => k + 1)
  }
  const go = (t) => turn(() => {
    setChapter(GLOSSARY_INDEX)
    setTerm(t)
    setQuery('')
    setShowList(false)
  })

  useEffect(() => {
    const onOpen = (e) => {
      setOpen(true)
      if (e.detail?.term && termOf(e.detail.term)) {
        setChapter(GLOSSARY_INDEX)
        setTerm(e.detail.term)
        setShowList(false)
      }
    }
    window.addEventListener(GUIDE_EVENT, onOpen)
    return () => window.removeEventListener(GUIDE_EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => {
    setOpen(false)
    openerRef.current?.focus()
  }

  const current = CHAPTERS[chapter]
  const isGlossary = chapter === GLOSSARY_INDEX
  const pages = current.pages
  const lastChapter = chapter === CHAPTERS.length - 1

  // desktop: um capítulo por vez (duas páginas); celular: uma página por vez
  const nextDesktop = () => turn(() => setChapter((c) => Math.min(c + 1, CHAPTERS.length - 1)))
  const prevDesktop = () => turn(() => setChapter((c) => Math.max(c - 1, 0)))
  const nextMobile = () => turn(() => {
    if (page < pages.length - 1) setPage(page + 1)
    else { setChapter(chapter + 1); setPage(0) }
  })
  const prevMobile = () => turn(() => {
    if (page > 0) setPage(page - 1)
    else { setChapter(chapter - 1); setPage(CHAPTERS[chapter - 1].pages.length - 1) }
  })

  const Page = (i) => {
    const P = pages[i]
    return P ? <P go={go} /> : null
  }
  const pagerBtn = 'rounded-xl border-2 border-[#D8E6F2] bg-[#FFFDF5] px-3 py-1 text-[13px] font-extrabold text-[#6B7A62] disabled:opacity-35 cursor-pointer disabled:cursor-default'

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir o caderninho"
        className="group fixed bottom-5 right-5 z-30 grid justify-items-center gap-1.5 cursor-pointer"
      >
        <span className="relative block h-[84px] w-[68px] rounded-[6px_12px_12px_6px] bg-[linear-gradient(90deg,#173A8A_0_10px,#2457C5_10px)] shadow-[0_6px_0_#173A8A,0_14px_24px_rgba(0,0,0,0.25)] transition-transform group-hover:-translate-y-1 group-hover:-rotate-3">
          <span className="absolute left-5 right-2.5 top-4 grid h-6 place-items-center rounded bg-[#FFFDF5] font-hand text-lg font-bold text-[#2457C5]">Guia</span>
          <span className="absolute -bottom-2.5 right-3 h-5 w-2.5 bg-[#EC4899] [clip-path:polygon(0_0,100%_0,100%_100%,50%_75%,0_100%)]" />
        </span>
        <span className="rounded-full bg-[#FFFDF7] px-3 py-0.5 font-toy text-sm font-extrabold text-[#24331F] shadow-[0_3px_0_#E2D6BE]">Caderninho</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[55] grid place-items-center bg-[#141E12]/55 p-4 pt-14 backdrop-blur-[3px] md:pt-4" onClick={(e) => e.target === e.currentTarget && close()}>
          <div role="dialog" aria-label="Caderninho do jogo" className="notebook-pop relative grid h-[min(640px,calc(100vh-80px))] w-[min(980px,100%)] grid-cols-1 rounded-[18px] bg-[#2457C5] p-2.5 text-[#24331F] shadow-[0_10px_0_#173A8A,0_30px_60px_rgba(0,0,0,0.35)] md:h-[min(640px,calc(100vh-40px))] md:grid-cols-2 md:p-3.5">
            <button ref={closeRef} type="button" onClick={close} aria-label="Fechar o caderninho"
              className="absolute -right-3.5 -top-3.5 z-10 grid h-10 w-10 place-items-center rounded-full bg-[#FFFDF5] text-xl font-extrabold shadow-[0_4px_0_#E2D6BE] cursor-pointer">×</button>

            <div role="tablist" aria-label="Capítulos" className="absolute -top-10 left-0 z-10 flex gap-1.5 md:-right-10 md:left-auto md:top-10 md:grid md:gap-2">
              {CHAPTERS.map((c, i) => (
                <button key={c.id} type="button" role="tab" aria-selected={chapter === i}
                  onClick={() => turn(() => { setChapter(i); setPage(0); setShowList(true) })}
                  className={`${c.color} rounded-t-xl px-2.5 py-2 font-toy text-[13px] font-extrabold shadow-[3px_3px_0_rgba(0,0,0,0.18)] transition-transform cursor-pointer md:w-[46px] md:rounded-l-none md:rounded-r-xl md:px-0 md:py-3 md:pl-2 md:[writing-mode:vertical-rl] ${chapter === i ? '-translate-y-1 md:translate-x-1.5 md:translate-y-0' : ''}`}>
                  {c.label}
                </button>
              ))}
            </div>

            {/* página da esquerda (só no desktop) */}
            <section className="notebook-page hidden rounded-l-lg md:block">
              {isGlossary
                ? <TermList inputId="guide-search" term={term} query={query} setQuery={setQuery} onPick={(t) => turn(() => setTerm(t))} />
                : Page(0)}
            </section>

            <span aria-hidden="true" className="notebook-spiral pointer-events-none absolute bottom-6 left-1/2 top-6 z-[2] hidden w-6 -translate-x-1/2 md:block" />

            {/* página da direita (no celular, a única) */}
            <section key={flipKey} className="notebook-page notebook-flip rounded-lg md:rounded-l-none md:rounded-r-lg">
              <div className="md:hidden">
                {isGlossary
                  ? (showList
                    ? <TermList inputId="guide-search-mobile" term={term} query={query} setQuery={setQuery} onPick={(t) => turn(() => { setTerm(t); setShowList(false) })} />
                    : <TermPage term={term} onBack={() => turn(() => setShowList(true))} />)
                  : Page(page)}
                {!isGlossary && (
                  <div className="mt-3.5 flex items-center justify-between gap-2">
                    <button type="button" onClick={prevMobile} disabled={chapter === 0 && page === 0} className={pagerBtn}>← virar</button>
                    <button type="button" onClick={nextMobile} disabled={lastChapter} className={pagerBtn}>virar →</button>
                  </div>
                )}
              </div>
              <div className="hidden md:block">
                {isGlossary ? <TermPage term={term} /> : Page(1)}
                <div className="mt-3.5 flex items-center justify-between gap-2">
                  <button type="button" onClick={prevDesktop} disabled={chapter === 0} className={pagerBtn}>← virar</button>
                  <span className="font-hand text-xl text-[#A9B19E]">{chapter + 1}/{CHAPTERS.length}</span>
                  <button type="button" onClick={nextDesktop} disabled={lastChapter} className={pagerBtn}>virar →</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  )
}
