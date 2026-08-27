import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useGameStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      character: null,
      room: null,
      sidebarExpanded: false,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setCharacter: (character) => set({ character }),
      setRoom: (room) => set({ room }),
      toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
      setSidebarExpanded: (sidebarExpanded) => set({ sidebarExpanded }),

      logout: () => {
        localStorage.removeItem('token')
        set({ user: null, token: null, character: null, room: null })
      },

      hydrate: () => {}
    }),
    {
      name: 'rpg-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        character: state.character,
        room: state.room,
      })
    }
  )
)

export default useGameStore