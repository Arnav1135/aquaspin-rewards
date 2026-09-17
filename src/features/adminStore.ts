import { create } from 'zustand';

interface AdminState {
  houseEdgeMultiplier: number;
  globalMaintenanceMode: boolean;
  setHouseEdge: (val: number) => void;
  toggleMaintenance: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  houseEdgeMultiplier: 1.0,
  globalMaintenanceMode: false,
  setHouseEdge: (val) => set({ houseEdgeMultiplier: val }),
  toggleMaintenance: () => set((state) => ({ globalMaintenanceMode: !state.globalMaintenanceMode })),
}));
