import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { demoUsers } from "@shared";

interface AppStore {
  demoMode: boolean;
  actorEmail: string;
  setDemoMode: (value: boolean) => void;
  setActorEmail: (value: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      demoMode: true,
      actorEmail: demoUsers[1]?.email ?? demoUsers[0]?.email ?? "",
      setDemoMode: (value) => set({ demoMode: value }),
      setActorEmail: (value) => set({ actorEmail: value }),
    }),
    {
      name: "agp-warehouse-app",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        demoMode: state.demoMode,
        actorEmail: state.actorEmail,
      }),
    },
  ),
);
