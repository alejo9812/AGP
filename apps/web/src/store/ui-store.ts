import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { demoUsers } from "@shared";

export interface InventoryFiltersState {
  search: string;
  customer: string;
  vehicle: string;
  product: string;
  operationalStatus: string;
  sourceStatus: string;
}

export interface RecommendationFiltersState {
  search: string;
  decisionStatus: string;
  sourceType: string;
}

const defaultInventoryFilters: InventoryFiltersState = {
  search: "",
  customer: "all",
  vehicle: "all",
  product: "all",
  operationalStatus: "all",
  sourceStatus: "all",
};

const defaultRecommendationFilters: RecommendationFiltersState = {
  search: "",
  decisionStatus: "all",
  sourceType: "all",
};

interface UiState {
  sidebarCollapsed: boolean;
  activeUserId: string;
  inventoryFilters: InventoryFiltersState;
  recommendationFilters: RecommendationFiltersState;
  setSidebarCollapsed: (value: boolean) => void;
  setActiveUserId: (value: string) => void;
  updateInventoryFilters: (patch: Partial<InventoryFiltersState>) => void;
  resetInventoryFilters: () => void;
  updateRecommendationFilters: (patch: Partial<RecommendationFiltersState>) => void;
  resetRecommendationFilters: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      activeUserId: demoUsers[0]?.id ?? "",
      inventoryFilters: defaultInventoryFilters,
      recommendationFilters: defaultRecommendationFilters,
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
      setActiveUserId: (value) => set({ activeUserId: value }),
      updateInventoryFilters: (patch) =>
        set((state) => ({
          inventoryFilters: { ...state.inventoryFilters, ...patch },
        })),
      resetInventoryFilters: () => set({ inventoryFilters: defaultInventoryFilters }),
      updateRecommendationFilters: (patch) =>
        set((state) => ({
          recommendationFilters: { ...state.recommendationFilters, ...patch },
        })),
      resetRecommendationFilters: () => set({ recommendationFilters: defaultRecommendationFilters }),
    }),
    {
      name: "agp-warehouse-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        activeUserId: state.activeUserId,
        inventoryFilters: state.inventoryFilters,
        recommendationFilters: state.recommendationFilters,
      }),
    },
  ),
);
