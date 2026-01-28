import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ==================== CLEANERS ====================

export function useSearchCleaners(params: {
    location?: string
    service?: string
    minRating?: number
    page?: number
}) {
    return useQuery({
        queryKey: ['cleaners', 'search', params],
        queryFn: () => api.cleaners.search(params),
    })
}

export function useCleaner(id: string) {
    return useQuery({
        queryKey: ['cleaners', id],
        queryFn: () => api.cleaners.getById(id),
        enabled: !!id,
    })
}

export function useCleanerAvailability(id: string, date?: string) {
    return useQuery({
        queryKey: ['cleaners', id, 'availability', date],
        queryFn: () => api.cleaners.getAvailability(id, date),
        enabled: !!id,
    })
}

export function useCleanerReviews(id: string, page = 1) {
    return useQuery({
        queryKey: ['cleaners', id, 'reviews', page],
        queryFn: () => api.cleaners.getReviews(id, page),
        enabled: !!id,
    })
}

// ==================== PROPERTIES ====================

export function useProperties() {
    return useQuery({
        queryKey: ['properties'],
        queryFn: () => api.properties.list(),
    })
}

export function useProperty(id: string) {
    return useQuery({
        queryKey: ['properties', id],
        queryFn: () => api.properties.getById(id),
        enabled: !!id,
    })
}

export function useCreateProperty() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: any) => api.properties.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['properties'] })
        },
    })
}

export function useUpdateProperty() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            api.properties.update(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['properties'] })
            queryClient.invalidateQueries({ queryKey: ['properties', id] })
        },
    })
}

export function useDeleteProperty() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => api.properties.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['properties'] })
        },
    })
}

// ==================== JOBS ====================

export function useJobs(status?: string) {
    return useQuery({
        queryKey: ['jobs', status],
        queryFn: () => api.jobs.list(status),
    })
}

export function useJob(id: string) {
    return useQuery({
        queryKey: ['jobs', id],
        queryFn: () => api.jobs.getById(id),
        enabled: !!id,
    })
}

export function useCreateJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: any) => api.jobs.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] })
        },
    })
}

export function useJobEstimate() {
    return useMutation({
        mutationFn: (data: { propertyId: string; services: string[]; addOns?: string[] }) =>
            api.jobs.estimate(data),
    })
}

export function useAcceptJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => api.jobs.accept(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] })
            queryClient.invalidateQueries({ queryKey: ['jobs', id] })
        },
    })
}

export function useDeclineJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => api.jobs.decline(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] })
            queryClient.invalidateQueries({ queryKey: ['jobs', id] })
        },
    })
}

export function useCompleteJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => api.jobs.complete(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] })
            queryClient.invalidateQueries({ queryKey: ['jobs', id] })
        },
    })
}

// ==================== REVIEWS ====================

export function useCreateReview() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: any) => api.reviews.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reviews'] })
        },
    })
}

export function useRespondToReview() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, response }: { id: string; response: string }) =>
            api.reviews.respond(id, response),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reviews'] })
        },
    })
}

// ==================== MESSAGES ====================

export function useConversations() {
    return useQuery({
        queryKey: ['conversations'],
        queryFn: () => api.messages.getConversations(),
    })
}

export function useConversation(id: string) {
    return useQuery({
        queryKey: ['conversations', id],
        queryFn: () => api.messages.getConversation(id),
        enabled: !!id,
        refetchInterval: 5000, // Poll for new messages
    })
}

export function useSendMessage() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            conversationId,
            content,
            attachments,
        }: {
            conversationId: string
            content: string
            attachments?: string[]
        }) => api.messages.send(conversationId, content, attachments),
        onSuccess: (_, { conversationId }) => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
            queryClient.invalidateQueries({ queryKey: ['conversations', conversationId] })
        },
    })
}
