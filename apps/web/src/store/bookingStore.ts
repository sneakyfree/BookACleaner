/**
 * Booking Store — P3c
 * Manages booking wizard state: step progression, selections, and pricing
 */
import { create } from 'zustand'

interface BookingSelection {
    propertyId?: string
    serviceType?: string
    scheduledDate?: string
    scheduledTime?: string
    estimatedHours?: number
    specialRequests?: string
    urgency: 'normal' | 'urgent' | 'flexible'
    cleanerId?: string
    addons: string[]
}

interface BookingState {
    step: number
    totalSteps: number
    selection: BookingSelection
    estimatedPrice: number | null

    setStep: (step: number) => void
    nextStep: () => void
    prevStep: () => void
    updateSelection: (partial: Partial<BookingSelection>) => void
    setEstimatedPrice: (price: number) => void
    reset: () => void
}

const initialSelection: BookingSelection = {
    urgency: 'normal',
    addons: [],
}

export const useBookingStore = create<BookingState>((set) => ({
    step: 0,
    totalSteps: 5,
    selection: { ...initialSelection },
    estimatedPrice: null,

    setStep: (step) => set({ step }),
    nextStep: () => set((s) => ({ step: Math.min(s.step + 1, s.totalSteps - 1) })),
    prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 0) })),
    updateSelection: (partial) =>
        set((s) => ({ selection: { ...s.selection, ...partial } })),
    setEstimatedPrice: (price) => set({ estimatedPrice: price }),
    reset: () => set({ step: 0, selection: { ...initialSelection }, estimatedPrice: null }),
}))
