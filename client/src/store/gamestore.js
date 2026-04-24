import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useGameStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      character: null,
      room: null,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setCharacter: (character) => set({ character }),
      setRoom: (room) => set({ room }),

      logout: () => {
        set({ user: null, token: null, character: null, room: null })
      },

      hydrate: () => {}
    }),
    {
      name: 'rpg-storage',
      partialState: (state) => ({
        user: state.user,
        token: state.token,
        character: state.character,
        room: state.room,
      })
    }
  )
)

export default useGameStore