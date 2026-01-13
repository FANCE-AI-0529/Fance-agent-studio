import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppMode = 'consumer' | 'studio';

interface AppModeState {
  mode: AppMode;
  isTransitioning: boolean;
  transitionDirection: 'to-studio' | 'to-consumer' | null;
  
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  startTransition: (direction: 'to-studio' | 'to-consumer') => void;
  endTransition: () => void;
}

export const useAppModeStore = create<AppModeState>()(
  persist(
    (set, get) => ({
      mode: 'consumer',
      isTransitioning: false,
      transitionDirection: null,
      
      setMode: (mode) => set({ mode }),
      
      toggleMode: () => {
        const current = get().mode;
        const newMode = current === 'consumer' ? 'studio' : 'consumer';
        const direction = newMode === 'studio' ? 'to-studio' : 'to-consumer';
        
        set({ isTransitioning: true, transitionDirection: direction });
        
        setTimeout(() => {
          set({ mode: newMode });
        }, 800);
        
        setTimeout(() => {
          set({ isTransitioning: false, transitionDirection: null });
        }, 1600);
      },
      
      startTransition: (direction) => set({ isTransitioning: true, transitionDirection: direction }),
      endTransition: () => set({ isTransitioning: false, transitionDirection: null }),
    }),
    {
      name: 'fance-app-mode',
      partialize: (state) => ({ mode: state.mode }),
    }
  )
);
