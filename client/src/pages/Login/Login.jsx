import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const navigate = useNavigate()
  const { setUser, setToken, setCharacter, setRoom } = useGameStore()

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }

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

        // se for admin vai pro painel
        if (data.user.role === 'admin') {
          navigate('/admin')
        } else {
          navigate('/map')
        }
      } catch {
        if (data.user.role === 'admin') {
          navigate('/admin')
        } else {
          navigate('/character')
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#0B0D17]"
      onMouseMove={handleMouseMove}
    >
      {/* Grid 3D em Perspectiva (Cyber Floor) */}
      <div className="absolute inset-0 z-0 perspective-grid opacity-30"></div>

      {/* Lanterna de Mouse (Spotlight) */}
      <div 
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(168,85,247,0.15), transparent 40%)`
        }}
      />

      {/* Elementos de fundo dinâmicos (Orbes de luz grandes) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] animate-float pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] animate-float pointer-events-none z-0" style={{ animationDelay: '2s' }}></div>

      {/* Ticker da Bolsa passando no fundo */}
      <div className="absolute top-[40%] left-0 w-full overflow-hidden whitespace-nowrap opacity-10 pointer-events-none select-none -rotate-2 transform-gpu z-0">
        <div className="flex w-max animate-marquee text-5xl font-extrabold text-white tracking-widest gap-16">
          <span className="flex gap-16">
            PETR4 <span className="text-green-500">▲ 2.4%</span> • VALE3 <span className="text-red-500">▼ 1.2%</span> • MGLU3 <span className="text-green-500">▲ 5.7%</span> • ITUB4 <span className="text-green-500">▲ 0.8%</span> • WEGE3 <span className="text-red-500">▼ 0.3%</span> • BBDC4 <span className="text-green-500">▲ 1.5%</span> • INTL3 <span className="text-green-500">▲ 8.9%</span> • RENT3 <span className="text-red-500">▼ 2.1%</span> • BBAS3 <span className="text-green-500">▲ 1.1%</span>
          </span>
          <span className="flex gap-16">
            PETR4 <span className="text-green-500">▲ 2.4%</span> • VALE3 <span className="text-red-500">▼ 1.2%</span> • MGLU3 <span className="text-green-500">▲ 5.7%</span> • ITUB4 <span className="text-green-500">▲ 0.8%</span> • WEGE3 <span className="text-red-500">▼ 0.3%</span> • BBDC4 <span className="text-green-500">▲ 1.5%</span> • INTL3 <span className="text-green-500">▲ 8.9%</span> • RENT3 <span className="text-red-500">▼ 2.1%</span> • BBAS3 <span className="text-green-500">▲ 1.1%</span>
          </span>
        </div>
      </div>

      {/* Cartão principal de Login com Glassmorphism Realista */}
      <div className="relative w-full max-w-md p-10 bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] z-20 animate-fade-in-up ring-1 ring-white/5">
        
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-3 tracking-tighter drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">INATEL</h1>
          <p className="text-xs text-gray-400 font-semibold tracking-[0.25em] uppercase">Simulador Financeiro</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-inner"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all pr-12 shadow-inner"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:-translate-y-0.5 tracking-[0.15em] uppercase text-sm"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-8">
          Não tem conta?{' '}
          <Link to="/register" className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}