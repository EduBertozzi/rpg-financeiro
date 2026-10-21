// Medidas dos prédios desenhados (Shops.jsx) que o mapa também usa: onde fica
// o "!" em cima de cada um e onde fica a plaquinha do nome, na frente da base.
import { PLOT, iso } from './geometry'

export const BASE_Z = 12 // altura da base creme
export const INSET = 40 // a base ocupa o meio do quarteirão, com rua e calçada em volta
export const SHOP_HEIGHT = { bank: 54, mercadinho: 52, utilities: 50, internet: 56, leisure: 46 }

// Altura do topo (base + casinha + símbolo do telhado).
// (o "!" fica à direita, nessa altura, para não cobrir o nome do prédio de trás)
const TOP = { university: 172, bank: 150, mercadinho: 112, utilities: 128, internet: 150, leisure: 150 }
export const shopTop = (id) => TOP[id] ?? 140

// Canto da frente da base (o de baixo do losango), em pixels da cena.
export const shopFront = (pu, pv) => iso(pu + PLOT - INSET, pv + PLOT - INSET)
