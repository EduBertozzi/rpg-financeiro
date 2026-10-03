import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Gate from './components/gate/Gate.jsx'
import SlowServer from './components/SlowServer.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Gate>
      <App />
      <SlowServer />
    </Gate>
  </StrictMode>,
)
