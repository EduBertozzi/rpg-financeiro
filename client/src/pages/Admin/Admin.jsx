import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'
import socket from '../../services/socket'
import { TOY_BUTTON, TOY_ERROR, TOY_GHOST, TOY_INPUT, TOY_LOGO } from '../../components/town/toy'
import {
  closeLabel, FILTERS, filterRooms, missingCount, monthName, playersLabel, ranked, roomTitle, STATUS_LABEL, TASKS,
} from './adminData'

const CARD = 'rounded-[24px] bg-[#FFFDF7] text-[#24331F] shadow-[0_6px_0_#E2D6BE]'
const EYEBROW = 'text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#A9B19E]'
const PILL = {
  waiting: 'bg-[#FFF3C4] text-[#B07A0C]',
  active: 'bg-[#E2F4E5] text-[#2B8C41]',
  finished: 'bg-[#EFE6D3] text-[#6B7A62]',
}
const AMBER_BUTTON = 'rounded-[16px] bg-[#F2B53A] px-5 py-2.5 font-toy text-[17px] font-extrabold text-[#4A3200] shadow-[0_5px_0_#C98A12] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_#C98A12] disabled:opacity-60 cursor-pointer'
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const SELECTED_KEY = 'admin:room'

function readSelected() {
  try {
    return localStorage.getItem(SELECTED_KEY)
  } catch {
    return null
  }
}

function StatusPill({ status }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-extrabold ${PILL[status] ?? PILL.finished}`}>{STATUS_LABEL[status] ?? status}</span>
}

function MonthDots({ room }) {
  return (
    <span className="flex gap-0.5" aria-label={`Mês ${room.currentTurn} de ${room.maxTurns}`}>
      {Array.from({ length: room.maxTurns }, (_, i) => {
        const m = i + 1
        const tone = room.status === 'finished' || m < room.currentTurn ? 'bg-[#3DBE5A]' : m === room.currentTurn ? 'bg-[#2457C5]' : 'bg-[#EFE6D3]'
        return <i key={m} className={`h-1.5 flex-1 rounded ${tone}`} />
      })}
    </span>
  )
}

// Painel do administrador: todas as salas que ele criou numa lista, e a sala
// aberta com o que cada jogador já fez no mês.
export default function Admin() {
  const navigate = useNavigate()
  const { character, logout, user } = useGameStore()
  const [rooms, setRooms] = useState(null)
  const [selectedId, setSelectedId] = useState(readSelected)
  const [filter, setFilter] = useState('all')
  const [progress, setProgress] = useState(null) // { room, players }
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [confirm, setConfirm] = useState(null) // 'close' | 'delete' | null
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [lastResult, setLastResult] = useState(null)

  const say = (text) => {
    setToast(text)
    setTimeout(() => setToast(''), 2500)
  }

  const select = (id) => {
    setSelectedId(id)
    setConfirm(null)
    setEditing(false)
    setLastResult(null)
    try {
      localStorage.setItem(SELECTED_KEY, id)
    } catch {
      // sem storage: só não lembra a última sala aberta
    }
  }

  const loadRooms = useCallback(() => api.get('/rooms/mine').then(({ data }) => setRooms(data)).catch(() => setError('Não deu para carregar suas salas.')), [])

  const loadProgress = useCallback((id) => {
    if (!id) return Promise.resolve()
    return api.get(`/rooms/${id}/progress`)
      .then(({ data }) => setProgress(data))
      .catch((err) => {
        // sala apagada ou de outro administrador: some da tela
        if ([403, 404].includes(err.response?.status)) setProgress(null)
      })
  }, [])

  // lista de salas, atualizando de tempos em tempos (bolinha de "todo mundo pronto")
  useEffect(() => {
    loadRooms()
    const id = setInterval(loadRooms, 10000)
    return () => clearInterval(id)
  }, [loadRooms])

  // sala aberta: quem está pronto e o que falta, a cada 5 segundos
  const current = rooms?.find((r) => r.id === selectedId) ?? rooms?.[0] ?? null
  const currentId = current?.id
  useEffect(() => {
    if (!currentId) return
    loadProgress(currentId)
    const id = setInterval(() => loadProgress(currentId), 5000)
    return () => clearInterval(id)
  }, [currentId, loadProgress])

  // o admin entra no canal da sala para avisar os jogadores quando o mês vira
  useEffect(() => {
    if (!currentId) return
    socket.connect()
    socket.emit('room:join', { roomId: currentId, characterId: 'admin' })
    return () => socket.disconnect()
  }, [currentId])

  const shown = progress?.room?.id === currentId ? progress : null
  const room = shown?.room ?? current
  const players = shown?.players ?? []
  const missing = missingCount(players)

  const refresh = () => Promise.all([loadRooms(), loadProgress(currentId)])

  const createRoom = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/rooms', { name: newName, maxTurns: 12 })
      setNewName('')
      setCreating(false)
      await loadRooms()
      select(data.id)
      say(`Sala criada. Código: ${data.code}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Não deu para criar a sala.')
    } finally {
      setBusy(false)
    }
  }

  const startRoom = async () => {
    setBusy(true)
    setError('')
    try {
      await api.post(`/rooms/${room.id}/start`)
      await refresh()
      say('Partida iniciada. Janeiro começou!')
    } catch (err) {
      setError(err.response?.data?.error || 'Não deu para iniciar a partida.')
    } finally {
      setBusy(false)
    }
  }

  const closeMonth = async () => {
    setBusy(true)
    setError('')
    setConfirm(null)
    try {
      const { data } = await api.post(`/rooms/${room.id}/next-turn`)
      socket.emit('turn:broadcast', { roomId: room.id, result: data })
      setLastResult(data)
      await refresh()
      say(data.isFinished ? 'Ano fechado! A turma já vê o resultado.' : `${monthName(data.turn - 1)} fechado. ${monthName(data.turn)} começou.`)
    } catch (err) {
      setError(err.response?.data?.error || 'Não deu para fechar o mês.')
    } finally {
      setBusy(false)
    }
  }

  const saveName = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.patch(`/rooms/${room.id}`, { name: editName })
      setEditing(false)
      await refresh()
      say('Nome da sala atualizado')
    } catch (err) {
      setError(err.response?.data?.error || 'Não deu para trocar o nome.')
    } finally {
      setBusy(false)
    }
  }

  const deleteRoom = async () => {
    setBusy(true)
    setError('')
    try {
      await api.delete(`/rooms/${room.id}`)
      setConfirm(null)
      setProgress(null)
      const { data } = await api.get('/rooms/mine')
      setRooms(data)
      if (data[0]) select(data[0].id)
      say('Sala apagada')
    } catch (err) {
      setError(err.response?.data?.error || 'Não deu para apagar a sala.')
    } finally {
      setBusy(false)
    }
  }

  const copyCode = () => {
    navigator.clipboard?.writeText(room.code).then(() => say('Código copiado'), () => say(`Código: ${room.code}`))
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const list = rooms ? filterRooms(rooms, filter) : []

  return (
    <div className="min-h-screen bg-[#F3EBDA] px-4 pb-16 pt-5 text-[#24331F] sm:px-6">
      <header className="mx-auto mb-5 flex max-w-[1240px] flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className={TOY_LOGO}>Fecha o Mês</span>
          <span className="rounded-full bg-[#EFE6D3] px-3 py-1 text-xs font-extrabold text-[#6B7A62]">Painel do administrador</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm font-bold text-[#6B7A62] sm:inline">{user?.name}</span>
          {character && (
            <button type="button" onClick={() => navigate('/map')} className={`${TOY_GHOST} px-3 py-2 text-[15px]`}>Ir para o mapa</button>
          )}
          <button type="button" onClick={handleLogout} className={`${TOY_GHOST} px-3 py-2 text-[15px]`}>Sair</button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1240px] items-start gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
        {/* ─── minhas salas ─── */}
        <aside className={`${CARD} grid gap-3.5 p-4 lg:sticky lg:top-4`} aria-label="Minhas salas">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-toy text-[22px] font-extrabold">Minhas salas</h2>
            <button type="button" onClick={() => setCreating(true)} className="rounded-[14px] bg-[#3DBE5A] px-3.5 py-1.5 font-toy text-[15px] font-extrabold text-white shadow-[0_4px_0_#2B8C41] cursor-pointer">+ Nova sala</button>
          </div>

          {creating && (
            <form onSubmit={createRoom} className="grid gap-2.5 rounded-[18px] border-2 border-dashed border-[#E2D6BE] p-3.5">
              <label htmlFor="new-room-name" className="grid gap-1 text-[13px] font-extrabold text-[#6B7A62]">
                Nome da turma
                <input id="new-room-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: 3º ano B · manhã" maxLength={40} autoFocus className={TOY_INPUT} />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={busy || !newName.trim()} className="rounded-[14px] bg-[#3DBE5A] px-4 py-2 font-toy text-[15px] font-extrabold text-white shadow-[0_4px_0_#2B8C41] disabled:opacity-50 cursor-pointer">Criar sala</button>
                <button type="button" onClick={() => setCreating(false)} className="rounded-[14px] px-3 py-2 text-sm font-extrabold text-[#6B7A62] cursor-pointer">Cancelar</button>
              </div>
            </form>
          )}

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar salas">
            {FILTERS.map(([key, label]) => (
              <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1 text-[13px] font-extrabold cursor-pointer ${filter === key ? 'bg-[#24331F] text-[#FFFDF7]' : 'text-[#6B7A62] hover:bg-[#EFE6D3]'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="grid max-h-[62vh] gap-2 overflow-y-auto p-0.5">
            {rooms === null && <p className="py-4 text-center text-sm text-[#6B7A62]">Carregando suas salas…</p>}
            {rooms && list.length === 0 && (
              <p className="py-4 text-center text-sm text-[#6B7A62]">{rooms.length ? 'Nenhuma sala aqui.' : 'Você ainda não tem salas. Crie a primeira em "+ Nova sala".'}</p>
            )}
            {list.map((r) => (
              <button key={r.id} type="button" onClick={() => select(r.id)} aria-current={r.id === currentId}
                className={`grid gap-1.5 rounded-[18px] border-[3px] p-3 text-left transition-colors cursor-pointer ${r.id === currentId ? 'border-[#2457C5] bg-[#FFFDF7]' : 'border-transparent bg-[#F3EBDA] hover:border-[#E2D6BE]'}`}>
                <span className="flex items-center justify-between gap-2">
                  <b className="font-toy text-[18px] leading-tight">{roomTitle(r)}</b>
                  {r.allReady && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#EC4899]" title="Todo mundo pronto" aria-label="todo mundo pronto" />}
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[13px] text-[#6B7A62]">{r.code}</span>
                  <StatusPill status={r.status} />
                </span>
                {r.status === 'waiting'
                  ? <small className="text-xs text-[#6B7A62]">{playersLabel(r.players)} esperando você iniciar</small>
                  : <MonthDots room={r} />}
                {r.status === 'active' && <small className="text-xs text-[#6B7A62]">{monthName(r.currentTurn)} · {r.ready}/{r.players} prontos</small>}
              </button>
            ))}
          </div>
        </aside>

        {/* ─── sala aberta ─── */}
        <section className="grid min-w-0 gap-5" aria-live="polite">
          {error && <p className={TOY_ERROR}>{error}</p>}

          {!room ? (
            <div className={`${CARD} grid justify-items-center gap-3 p-10 text-center`}>
              <h1 className="font-toy text-[30px] font-extrabold">Bem-vindo ao painel</h1>
              <p className="max-w-md text-[#6B7A62]">Crie uma sala para cada turma. Você passa o código para os jogadores e controla quando cada mês fecha.</p>
              <button type="button" onClick={() => setCreating(true)} className={`${TOY_BUTTON} !w-auto`}>Criar a primeira sala</button>
            </div>
          ) : (
            <>
              <div className={`${CARD} grid items-center gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto]`}>
                <div className="grid min-w-0 gap-1.5">
                  <span className="justify-self-start"><StatusPill status={room.status} /></span>
                  {editing ? (
                    <form onSubmit={saveName} className="flex flex-wrap gap-2">
                      <label htmlFor="edit-room-name" className="sr-only">Nome da sala</label>
                      <input id="edit-room-name" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={40} autoFocus className={`${TOY_INPUT} max-w-sm flex-1`} />
                      <button type="submit" disabled={busy || !editName.trim()} className="rounded-[14px] bg-[#3DBE5A] px-4 py-2 font-toy font-extrabold text-white shadow-[0_4px_0_#2B8C41] disabled:opacity-50 cursor-pointer">Salvar</button>
                      <button type="button" onClick={() => setEditing(false)} className="px-2 text-sm font-extrabold text-[#6B7A62] cursor-pointer">Cancelar</button>
                    </form>
                  ) : (
                    <h1 className="flex flex-wrap items-baseline gap-x-3 font-toy text-[clamp(28px,4vw,38px)] font-extrabold leading-tight">
                      {roomTitle(room)}
                      <button type="button" onClick={() => { setEditName(room.name || ''); setEditing(true) }} className="text-sm font-extrabold text-[#2457C5] hover:underline cursor-pointer">Editar nome</button>
                    </h1>
                  )}
                  <p className="text-sm text-[#6B7A62]">
                    Criada em {new Date(room.createdAt).toLocaleDateString('pt-BR')} · {playersLabel(room.players)}
                    {' · '}
                    <button type="button" onClick={() => setConfirm('delete')} className="font-extrabold text-[#C4283D] hover:underline cursor-pointer">Apagar sala</button>
                  </p>
                </div>
                <div className="grid justify-items-center gap-1 rounded-[20px] bg-[#DCE7FB] px-5 py-3">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#2457C5]">Código da sala</span>
                  <span className="font-mono text-[32px] font-bold tracking-[0.14em] text-[#2457C5]">{room.code}</span>
                  <button type="button" onClick={copyCode} className="rounded-full bg-[#FFFDF7] px-3 py-0.5 text-xs font-extrabold text-[#2457C5] cursor-pointer">Copiar código</button>
                </div>
              </div>

              {confirm === 'delete' && (
                <div role="alertdialog" aria-label="Apagar sala" className="grid gap-3 rounded-[20px] border-2 border-[#F5B8C0] bg-[#FDE2E5] p-4 text-[#9F1D2F]">
                  <b className="font-toy text-lg">Apagar “{roomTitle(room)}”?</b>
                  <p className="text-sm">Isso apaga a sala, os {playersLabel(room.players)} e todo o progresso deles. Não dá para desfazer.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={deleteRoom} disabled={busy} className="rounded-[14px] bg-[#C4283D] px-4 py-2 font-toy font-extrabold text-white shadow-[0_4px_0_#8E1B2C] disabled:opacity-60 cursor-pointer">Apagar de vez</button>
                    <button type="button" onClick={() => setConfirm(null)} className="rounded-[14px] bg-white px-4 py-2 font-extrabold text-[#6B7A62] cursor-pointer">Cancelar</button>
                  </div>
                </div>
              )}

              {/* controle do mês */}
              <div className={`${CARD} grid gap-4 p-5`}>
                {room.status === 'waiting' && (
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className={EYEBROW}>Antes de começar</p>
                      <p className="font-toy text-[26px] font-extrabold">{room.players === 1 ? '1 jogador entrou' : `${room.players} jogadores entraram`}</p>
                      <p className="text-sm text-[#6B7A62]">Passe o código para a turma. Quando todos tiverem criado o personagem, inicie.</p>
                    </div>
                    <button type="button" onClick={startRoom} disabled={busy || room.players === 0} className={`${TOY_BUTTON} !w-auto`}>Iniciar partida</button>
                  </div>
                )}

                {room.status === 'active' && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className={EYEBROW}>Mês {room.currentTurn} de {room.maxTurns}</p>
                        <p className="font-toy text-[28px] font-extrabold">{monthName(room.currentTurn)}</p>
                      </div>
                      <button type="button" onClick={() => (missing ? setConfirm('close') : closeMonth())} disabled={busy || players.length === 0}
                        className={missing ? AMBER_BUTTON : `${TOY_BUTTON} !w-auto`}>
                        {busy ? 'Fechando…' : closeLabel(room)}
                      </button>
                    </div>
                    <div className="grid gap-1.5">
                      <div className="flex justify-between text-sm font-extrabold">
                        <span>{players.length - missing} de {players.length} prontos</span>
                        <span className="text-[#6B7A62]">{missing ? `faltam ${missing}` : 'todo mundo pronto'}</span>
                      </div>
                      <div className="h-3.5 overflow-hidden rounded-full bg-[#EFE6D3]">
                        <span className="block h-full rounded-full bg-[#3DBE5A] transition-[width] duration-500" style={{ width: `${players.length ? ((players.length - missing) / players.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                    {confirm === 'close' && (
                      <div role="alertdialog" aria-label="Confirmar fechamento" className="grid gap-2.5 rounded-[18px] bg-[#FFF3C4] p-4 text-[#5A3D00]">
                        <b>{missing === 1 ? '1 jogador ainda não terminou' : `${missing} jogadores ainda não terminaram`} o mês.</b>
                        <span className="text-sm">Se fechar agora, o que ficou em aberto é cobrado na virada: conta não paga vira conta atrasada (com multa e juros), o lazer é cobrado e o dilema sem resposta é decidido pela inércia.</span>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={closeMonth} disabled={busy} className={AMBER_BUTTON}>Fechar mesmo assim</button>
                          <button type="button" onClick={() => setConfirm(null)} className="rounded-[14px] bg-white px-4 py-2 font-extrabold text-[#6B7A62] cursor-pointer">Esperar</button>
                        </div>
                      </div>
                    )}
                    {!missing && players.length > 0 && confirm !== 'close' && (
                      <p className="rounded-2xl bg-[#E2F4E5] px-4 py-2.5 text-sm font-bold text-[#2B8C41]">Todo mundo terminou. Pode fechar o mês.</p>
                    )}
                  </>
                )}

                {room.status === 'finished' && (
                  <div>
                    <p className={EYEBROW}>Partida encerrada</p>
                    <p className="font-toy text-[26px] font-extrabold">
                      {players.length ? `Venceu ${ranked(players)[0].name} com ${brl(ranked(players)[0].netWorth)}` : 'Ninguém jogou nesta sala'}
                    </p>
                  </div>
                )}
              </div>

              {/* jogadores */}
              <div className={`${CARD} grid gap-3 p-5`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-toy text-[22px] font-extrabold">{room.status === 'finished' ? 'Ranking final' : 'Jogadores'}</h2>
                  {room.status === 'active' && (
                    <div className="flex flex-wrap gap-3 text-xs text-[#6B7A62]">
                      {TASKS.map(([key, icon, label]) => <span key={key}>{icon} {label}</span>)}
                    </div>
                  )}
                </div>
                {players.length === 0 ? (
                  <p className="py-4 text-center text-sm text-[#6B7A62]">Ninguém entrou ainda. Passe o código <b className="font-mono">{room.code}</b> para a turma.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] border-collapse text-sm">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-[#A9B19E]">
                          <th className="px-2.5 py-2">Jogador</th>
                          {room.status === 'active' && <th className="px-2.5 py-2">Falta no mês</th>}
                          {room.status === 'active' && <th className="px-2.5 py-2">Situação</th>}
                          <th className="px-2.5 py-2 text-right">Patrimônio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(room.status === 'active' ? players : ranked(players)).map((p, i) => (
                          <tr key={p.id} className="border-t border-[#EFE6D3]">
                            <td className="px-2.5 py-2.5 font-extrabold">{room.status === 'finished' && `${i + 1}º · `}{p.name}</td>
                            {room.status === 'active' && (
                              <td className="px-2.5 py-2.5">
                                <div className="flex gap-1">
                                  {TASKS.map(([key, icon, label]) => {
                                    const v = p.tasks?.[key]
                                    if (v === null || v === undefined) return <span key={key} className="h-[26px] w-[26px]" />
                                    return (
                                      <span key={key} title={`${label}: ${v ? 'feito' : 'falta'}`}
                                        className={`grid h-[26px] w-[26px] place-items-center rounded-lg text-[13px] ${v ? 'bg-[#E2F4E5]' : 'bg-[#EFE6D3] opacity-50 grayscale'}`}>
                                        {icon}
                                      </span>
                                    )
                                  })}
                                </div>
                              </td>
                            )}
                            {room.status === 'active' && (
                              <td className="px-2.5 py-2.5">
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${p.ready ? PILL.active : PILL.waiting}`}>{p.ready ? 'Pronto' : 'Jogando'}</span>
                              </td>
                            )}
                            <td className="px-2.5 py-2.5 text-right font-extrabold tabular-nums">{room.status === 'waiting' ? '—' : brl(p.netWorth)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {lastResult && (
                <div className={`${CARD} grid gap-2 p-5`}>
                  <h2 className="font-toy text-[20px] font-extrabold">Imprevistos da virada</h2>
                  <ul className="grid">
                    {lastResult.results?.map((r) => (
                      <li key={r.characterId} className="flex justify-between gap-3 border-t border-[#EFE6D3] py-2 text-sm">
                        <span className="font-extrabold">{r.characterName}</span>
                        <span className="text-right text-[#6B7A62]">{(r.events ?? []).map((e) => e.title).join(' · ') || '—'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {toast && (
        <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-[14px] bg-[#24331F] px-5 py-2.5 text-sm font-extrabold text-[#FFFDF7] shadow-xl">{toast}</div>
      )}
    </div>
  )
}
