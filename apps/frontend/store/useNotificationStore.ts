import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: number;
}

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (
    notification: Omit<AppNotification, "id" | "createdAt">,
  ) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const buildId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      addNotification: (notification) => {
        set((state) => ({
          notifications: [
            {
              ...notification,
              id: buildId(),
              createdAt: Date.now(),
            },
            ...state.notifications,
          ].slice(0, 50),
        }));
      },
      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((item) => item.id !== id),
        }));
      },
      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: "vedaai-notifications",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
