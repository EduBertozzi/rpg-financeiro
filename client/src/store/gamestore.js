import { create } from 'zustand'

const useGameStore = create((set) => ({
  user: null,
  token: null,
  character: null,
  room: null,

  setUser: (user) => set({ user }),
  setToken: (token) => {
    localStorage.setItem('token', token)
    set({ token })
  },
  setCharacter: (character) => set({ character }),
  setRoom: (room) => set({ room }),

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null, character: null, room: null })
  },

  hydrate: () => {
    const token = localStorage.getItem('token')
    if (token) set({ token })
  }
}))

export default useGameStore