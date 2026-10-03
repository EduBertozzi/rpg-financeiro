import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'
import AuthShell, { PasswordField } from '../../components/town/AuthShell'
import { TOY_BUTTON, TOY_ERROR, TOY_INPUT, TOY_LABEL } from '../../components/town/toy'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setUser, setToken, setCharacter, setRoom } = useGameStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      setToken(data.token)
      setUser(data.user)

      // tenta buscar personagem existente
      try {
        const { data: charData } = await api.get('/characters/me', {
          headers: { Authorization: `Bearer ${data.token}` }
        })
        setCharacter(charData)
        setRoom(charData.room)
        navigate(data.user.role === 'admin' ? '/admin' : '/map')
      } catch {
        navigate(data.user.role === 'admin' ? '/admin' : '/character')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label htmlFor="login-email" className={TOY_LABEL}>
          Email
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={TOY_INPUT}
            placeholder="seu@email.com"
            required
          />
        </label>

        <PasswordField id="login-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

        {error && <p className={TOY_ERROR}>{error}</p>}

        <button type="submit" disabled={loading} className={`${TOY_BUTTON} mt-1`}>
          {loading ? 'Entrando…' : 'Entrar na cidade'}
        </button>
      </form>

      <p className="text-sm text-[#6B7A62]">
        Primeira vez aqui?{' '}
        <Link to="/register" className="font-extrabold text-[#2457C5] underline-offset-2 hover:underline">Criar conta</Link>
      </p>
    </AuthShell>
  )
}
