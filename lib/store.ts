import { create } from "zustand"

interface User {
  id?: string
  telegramId: string
  username: string
  firstName?: string
  avatarUrl?: string
  name?: string
  blocked?: boolean
  phone?: string
  phoneVerified?: boolean
  referralCoinsEarned?: number
  unlockedSkins?: string[]
  selectedSkin?: string
}

interface StoreState {
  user: User | null
  balance: number
  demoBalance: number
  selectedSkin: string
  unlockedSkins: string[]
  setUser: (user: User) => void
  setBalance: (balance: number) => void
  setDemoBalance: (demoBalance: number) => void
  adjustBalance: (amount: number) => void
  adjustDemoBalance: (amount: number) => void
  setSelectedSkin: (skinId: string) => void
  unlockSkin: (skinId: string) => void
}

export const useStore = create<StoreState>((set) => ({
  user: null,
  balance: 0,
  demoBalance: 500,
  selectedSkin: 'default',
  unlockedSkins: ['default'],
  setUser: (user) => set({
    user,
    selectedSkin: user.selectedSkin || 'default',
    unlockedSkins: user.unlockedSkins || ['default'],
  }),
  setBalance: (balance) => set({ balance }),
  setDemoBalance: (demoBalance) => set({ demoBalance }),
  adjustBalance: (amount) =>
    set((state) => ({ balance: state.balance + amount })),
  adjustDemoBalance: (amount) =>
    set((state) => ({ demoBalance: state.demoBalance + amount })),
  setSelectedSkin: (skinId) =>
    set((state) => ({
      selectedSkin: skinId,
      user: state.user ? { ...state.user, selectedSkin: skinId } : null,
    })),
  unlockSkin: (skinId) =>
    set((state) => {
      const skins = state.unlockedSkins.includes(skinId)
        ? state.unlockedSkins
        : [...state.unlockedSkins, skinId];
      return {
        unlockedSkins: skins,
        selectedSkin: skinId,
        user: state.user
          ? { ...state.user, unlockedSkins: skins, selectedSkin: skinId }
          : null,
      };
    }),
}))
