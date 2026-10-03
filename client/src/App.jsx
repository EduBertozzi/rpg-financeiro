import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import useGameStore from './store/gameStore'

import Login from './pages/Login/Login'
import Register from './pages/Register/Register'
import RegisterAdmin from './pages/RegisterAdmin/RegisterAdmin'
import CharacterCreation from './pages/CharacterCreation/CharacterCreation'
import Map from './pages/Map/Map'
import Bank from './pages/Bank/Bank'
import SkillTree from './pages/SkillTree/SkillTree'
import Admin from './pages/Admin/Admin'
import Finished from './pages/Finished/Finished'

import { applyAvatarTheme } from './data/avatarTheme'

function ProtectedRoute({ children }) {
  const user = useGameStore((state) => state.user)

  if (!user) return <Navigate to="/login" replace />

  return children
}

function AdminRoute({ children }) {
  const user = useGameStore((state) => state.user)

  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/login" replace />

  return children
}

function App() {
  const hydrate = useGameStore((state) => state.hydrate)
  const character = useGameStore((state) => state.character)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (character?.avatarId) {
      applyAvatarTheme(character.avatarId)
      return
    }

    applyAvatarTheme(1)
  }, [character?.avatarId])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register-admin" element={<RegisterAdmin />} />

        <Route
          path="/character"
          element={
            <ProtectedRoute>
              <CharacterCreation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <Map />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bank"
          element={
            <ProtectedRoute>
              <Bank />
            </ProtectedRoute>
          }
        />

        {/* a Corretora virou a seção de Ações dentro do Banco */}
        <Route path="/broker" element={<Navigate to="/bank" replace />} />

        <Route
          path="/skills"
          element={
            <ProtectedRoute>
              <SkillTree />
            </ProtectedRoute>
          }
        />

        <Route
          path="/finished"
          element={
            <ProtectedRoute>
              <Finished />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App