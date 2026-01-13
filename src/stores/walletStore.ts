import { create } from "zustand";

interface WalletState {
  // UI State
  isTopupDialogOpen: boolean;
  isWalletPanelOpen: boolean;
  selectedPackageId: string | null;
  
  // Actions
  openTopupDialog: (packageId?: string) => void;
  closeTopupDialog: () => void;
  openWalletPanel: () => void;
  closeWalletPanel: () => void;
  setSelectedPackage: (packageId: string | null) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  // Initial state
  isTopupDialogOpen: false,
  isWalletPanelOpen: false,
  selectedPackageId: null,
  
  // Actions
  openTopupDialog: (packageId) => set({ 
    isTopupDialogOpen: true, 
    selectedPackageId: packageId || null 
  }),
  
  closeTopupDialog: () => set({ 
    isTopupDialogOpen: false,
    selectedPackageId: null 
  }),
  
  openWalletPanel: () => set({ isWalletPanelOpen: true }),
  
  closeWalletPanel: () => set({ isWalletPanelOpen: false }),
  
  setSelectedPackage: (packageId) => set({ selectedPackageId: packageId }),
}));
