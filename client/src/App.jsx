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
        <Route path="/character" element={<CharacterCreation />} />
        <Route path="/map" element={<Map />} />
        <Route path="/bank" element={<Bank />} />
        <Route path="/broker" element={<Broker />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/skills" element={<SkillTree />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App