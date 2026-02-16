/**
 * UI Store — P3b
 * Manages UI state: sidebar visibility, modal state, toasts
 */
import { create } from 'zustand'

interface Toast {
    id: string
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
    duration?: number
}

interface UIState {
    sidebarOpen: boolean
    toggleSidebar: () => void
    setSidebarOpen: (open: boolean) => void

    activeModal: string | null
    modalData: Record<string, unknown> | null
    openModal: (id: string, data?: Record<string, unknown>) => void
    closeModal: () => void

    toasts: Toast[]
    addToast: (toast: Omit<Toast, 'id'>) => void
    removeToast: (id: string) => void
}

export const useUIStore = create<UIState>((set) => ({
    sidebarOpen: true,
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    activeModal: null,
    modalData: null,
    openModal: (id, data) => set({ activeModal: id, modalData: data ?? null }),
    closeModal: () => set({ activeModal: null, modalData: null }),

    toasts: [],
    addToast: (toast) =>
        set((s) => ({
            toasts: [...s.toasts, { ...toast, id: `toast-${Date.now()}` }],
        })),
    removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
