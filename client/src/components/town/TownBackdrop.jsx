import CityScene from '../../pages/Map/CityScene'
import bankArt from '../../assets/buildings/bank.png'
import leisureArt from '../../assets/buildings/leisure.png'
import mercadinhoArt from '../../assets/buildings/mercadinho.png'
import utilitiesArt from '../../assets/buildings/utilities.png'
import internetArt from '../../assets/buildings/internet.png'
import universityArt from '../../assets/buildings/university.png'

// A própria cidade do mapa, viva e desfocada, como fundo das telas de entrada.
const BUILDINGS = [
  { id: 'bank', name: 'Banco', art: bankArt, glow: 'rgba(59,130,246,0.55)' },
  { id: 'leisure', name: 'Lazer', art: leisureArt, glow: 'rgba(236,72,153,0.55)' },
  { id: 'mercadinho', name: 'Mercadinho', art: mercadinhoArt, glow: 'rgba(34,197,94,0.55)' },
  { id: 'utilities', name: 'Água e Luz', art: utilitiesArt, glow: 'rgba(234,179,8,0.55)' },
  { id: 'internet', name: 'Internet e Celular', art: internetArt, glow: 'rgba(34,211,238,0.55)' },
  { id: 'university', name: 'Universidade', art: universityArt, glow: 'rgba(168,85,247,0.55)' },
]

export default function TownBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#BFE3F2]">
      <div className="absolute -inset-6 blur-[3px]">
        <CityScene buildings={BUILDINGS} onSelect={() => {}} interactive={false} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#BFE3F2]/50 via-[#EAF6E8]/10 to-[#FFFDF7]/35" />
    </div>
  )
}
