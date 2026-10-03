import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'
import AuthShell, { PasswordField } from '../../components/town/AuthShell'
import { TOY_ERROR, TOY_INPUT, TOY_LABEL } from '../../components/town/toy'

const BLUE_BUTTON = 'w-full rounded-[18px] bg-[#2457C5] px-5 py-3 font-toy text-[19px] font-extrabold text-white shadow-[0_6px_0_#173A8A] transition-[transform,box-shadow] active:translate-y-1 active:shadow-[0_2px_0_#173A8A] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer'

// Cadastro de administrador: quem organiza uma turma. Precisa do código de
// convite. Quem já tem conta de jogador usa o mesmo e-mail e senha.
export default function RegisterAdmin() {
  const [form, setForm] = useState({ name: '', email: '', password: '', inviteCode: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setUser, setToken, setCharacter, setRoom } = useGameStore()
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register-admin', form)
      setToken(data.token)
      setUser(data.user)
      setCharacter(null)
      setRoom(null)
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.error || 'Não deu para criar a conta de administrador')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="grid gap-1">
        <span className="justify-self-center rounded-full bg-[#DCE7FB] px-3 py-0.5 text-xs font-extrabold text-[#2457C5]">Administrador</span>
        <h2 className="font-toy text-[24px] font-extrabold leading-tight">Organize uma turma</h2>
        <p className="text-sm text-[#6B7A62]">Você cria as salas, passa o código para a turma e decide quando cada mês fecha.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <label htmlFor="admin-name" className={TOY_LABEL}>
          Seu nome
          <input id="admin-name" autoComplete="name" value={form.name} onChange={set('name')} className={TOY_INPUT} placeholder="Como a turma te chama?" />
        </label>
        <label htmlFor="admin-email" className={TOY_LABEL}>
          Email
          <input id="admin-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} className={TOY_INPUT} placeholder="seu@email.com" required />
        </label>
        <PasswordField id="admin-password" autoComplete="new-password" value={form.password} onChange={set('password')} />
        <label htmlFor="admin-invite" className={TOY_LABEL}>
          Código de convite
          <input id="admin-invite" autoComplete="off" value={form.inviteCode} onChange={set('inviteCode')} className={`${TOY_INPUT} font-mono uppercase tracking-[0.12em]`} required />
        </label>
        <p className="rounded-2xl bg-[#FFF3C4] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#7A5200]">
          O código vem de quem cuida do jogo. Já tem conta de jogador? Use o mesmo e-mail e senha: a conta vira de administrador.
        </p>

        {error && <p className={TOY_ERROR}>{error}</p>}

        <button type="submit" disabled={loading} className={BLUE_BUTTON}>
          {loading ? 'Criando…' : 'Criar conta de administrador'}
        </button>
      </form>

      <p className="text-sm text-[#6B7A62]">
        <Link to="/login" className="font-extrabold text-[#2457C5] underline-offset-2 hover:underline">Voltar para entrar</Link>
      </p>
    </AuthShell>
  )
}
