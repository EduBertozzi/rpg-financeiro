import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import useGameStore from './store/gameStore'

import Login from './pages/Login/Login'
import Register from './pages/Register/Register'
import CharacterCreation from './pages/CharacterCreation/CharacterCreation'
import Map from './pages/Map/Map'

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
        <Route path="*" element={<Navigate to="/login" />} />
        <Route path="/map" element={<Map />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App