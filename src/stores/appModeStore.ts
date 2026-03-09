/**
 * @file appModeStore.ts
 * @description 应用模式状态管理 - Consumer/Studio 模式切换 - App Mode Store
 * @author Fance Studio
 * @copyright Copyright (c) 2025 Fance Studio. MIT License.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppMode = 'consumer' | 'studio';

// Context for Eject (seamless transition with data)
export interface EjectContext {
  agentId: string;
  targetPage: 'builder' | 'runtime';
  chatSessionId?: string;
  returnUrl?: string;
}

interface AppModeState {
  mode: AppMode;
  isTransitioning: boolean;
  transitionDirection: 'to-studio' | 'to-consumer' | null;
  ejectContext: EjectContext | null;
  
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  startTransition: (direction: 'to-studio' | 'to-consumer') => void;
  endTransition: () => void;
  
  // Eject methods - for seamless data-carrying transitions
  ejectToStudio: (context: EjectContext) => void;
  returnToConsumer: (returnUrl?: string) => void;
  clearEjectContext: () => void;
}

export const useAppModeStore = create<AppModeState>()(
  persist(
    (set, get) => ({
      mode: 'consumer',
      isTransitioning: false,
      transitionDirection: null,
      ejectContext: null,
      
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
      
      // Eject to Studio with context (agentId, chatSessionId, etc.)
      ejectToStudio: (context) => {
        set({ 
          isTransitioning: true, 
          transitionDirection: 'to-studio',
          ejectContext: context,
        });
        
        setTimeout(() => {
          set({ mode: 'studio' });
        }, 800);
        
        setTimeout(() => {
          set({ isTransitioning: false, transitionDirection: null });
        }, 1600);
      },
      
      // Return to Consumer mode
      returnToConsumer: (returnUrl) => {
        const currentContext = get().ejectContext;
        set({ 
          isTransitioning: true, 
          transitionDirection: 'to-consumer',
          ejectContext: returnUrl ? { ...currentContext!, returnUrl } : null,
        });
        
        setTimeout(() => {
          set({ mode: 'consumer' });
        }, 800);
        
        setTimeout(() => {
          set({ isTransitioning: false, transitionDirection: null, ejectContext: null });
        }, 1600);
      },
      
      clearEjectContext: () => set({ ejectContext: null }),
    }),
    {
      name: 'fance-studio-mode',
      partialize: (state) => ({ mode: state.mode }),
    }
  )
);
