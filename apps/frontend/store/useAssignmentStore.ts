import { create } from "zustand";

interface AssignmentStore {
  assignmentCount: number;
  setAssignmentCount: (count: number) => void;
  incrementCount: () => void;
  decrementCount: () => void;
}

export const useAssignmentStore = create<AssignmentStore>((set) => ({
  assignmentCount: 0,
  setAssignmentCount: (count) => set({ assignmentCount: count }),
  incrementCount: () => set((state) => ({ assignmentCount: state.assignmentCount + 1 })),
  decrementCount: () => set((state) => ({ assignmentCount: Math.max(0, state.assignmentCount - 1) })),
}));