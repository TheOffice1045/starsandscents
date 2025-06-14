import { create } from 'zustand';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: Date;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (notification) => set((state) => ({
    notifications: [
      {
        ...notification,
        id: crypto.randomUUID(),
        read: false,
        createdAt: new Date(),
      },
      ...state.notifications,
    ],
  })),
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    ),
  })),
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, read: true })),
  })),
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id),
  })),
}));