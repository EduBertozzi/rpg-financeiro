import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import useGameStore from './store/gameStore'

import Login from './pages/Login/Login'
import Register from './pages/Register/Register'
import CharacterCreation from './pages/CharacterCreation/CharacterCreation'
import Map from './pages/Map/Map'
import Bank from './pages/Bank/Bank'
import Broker from './pages/Broker/Broker'
import Companies from './pages/Companies/Companies'
import SkillTree from './pages/SkillTree/SkillTree'
import Admin from './pages/Admin/Admin'
import Finished from './pages/Finished/Finished'

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

  useEffect(() => {
    hydrate()
  }, [hydrate])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/character" element={<ProtectedRoute><CharacterCreation /></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><Map /></ProtectedRoute>} />
        <Route path="/bank" element={<ProtectedRoute><Bank /></ProtectedRoute>} />
        <Route path="/broker" element={<ProtectedRoute><Broker /></ProtectedRoute>} />
        <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
        <Route path="/skills" element={<ProtectedRoute><SkillTree /></ProtectedRoute>} />

        <Route path="/finished" element={<ProtectedRoute><Finished /></ProtectedRoute>} />

        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App