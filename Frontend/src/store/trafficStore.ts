import { create } from 'zustand';
import { createMockNetwork, advanceMockNetwork } from '../services/mockTraffic';
import { DashboardSection, NetworkSnapshot } from '../types/traffic';

interface TrafficStoreState {
  network: NetworkSnapshot;
  selectedJunctionId: string | null;
  selectedRoadId: string | null;
  selectedDistrictId: string | null;
  sidebarCollapsed: boolean;
  activeSection: DashboardSection;
  tick: () => void;
  selectJunction: (junctionId: string | null) => void;
  selectRoad: (roadId: string | null) => void;
  selectDistrict: (districtId: string | null) => void;
  setActiveSection: (section: DashboardSection) => void;
  toggleSidebar: () => void;
}

const initialNetwork = createMockNetwork();

export const useTrafficStore = create<TrafficStoreState>((set, get) => ({
  network: initialNetwork,
  selectedJunctionId: initialNetwork.junctions[12]?.id ?? null,
  selectedRoadId: initialNetwork.roads[8]?.id ?? null,
  selectedDistrictId: initialNetwork.districts[1]?.id ?? null,
  sidebarCollapsed: false,
  activeSection: 'overview',
  tick: () => set({ network: advanceMockNetwork(get().network) }),
  selectJunction: (junctionId) => set({ selectedJunctionId: junctionId, selectedRoadId: null }),
  selectRoad: (roadId) => set({ selectedRoadId: roadId, selectedJunctionId: null }),
  selectDistrict: (districtId) => set({ selectedDistrictId: districtId }),
  setActiveSection: (section) => set({ activeSection: section }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
