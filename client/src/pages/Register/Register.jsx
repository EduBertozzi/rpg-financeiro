import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'
import AuthShell, { PasswordField } from '../../components/town/AuthShell'
import { TOY_BUTTON, TOY_ERROR, TOY_INPUT, TOY_LABEL } from '../../components/town/toy'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setUser, setToken } = useGameStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      setToken(data.token)
      setUser(data.user)
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell subtitle="Crie sua conta para morar na cidade.">
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label htmlFor="register-name" className={TOY_LABEL}>
          Nome
          <input
            id="register-name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={TOY_INPUT}
            placeholder="Como você se chama?"
            required
          />
        </label>

        <label htmlFor="register-email" className={TOY_LABEL}>
          Email
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={TOY_INPUT}
            placeholder="seu@email.com"
            required
          />
        </label>

        <PasswordField id="register-password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

        {error && <p className={TOY_ERROR}>{error}</p>}

        <button type="submit" disabled={loading} className={`${TOY_BUTTON} mt-1`}>
          {loading ? 'Criando…' : 'Criar conta'}
        </button>
      </form>

      <p className="text-sm text-[#6B7A62]">
        Já tem conta?{' '}
        <Link to="/login" className="font-extrabold text-[#2457C5] underline-offset-2 hover:underline">Entrar</Link>
      </p>
    </AuthShell>
  )
}
