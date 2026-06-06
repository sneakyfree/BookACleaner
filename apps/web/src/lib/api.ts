const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ApiError {
    detail: string
    status: number
}

// AI Feature Types
interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

interface ChatResponse {
    success: boolean
    response: string
    usage: { prompt_tokens: number; completion_tokens: number }
}

interface DocumentParseResult {
    success: boolean
    document_type: string
    extracted_data: Record<string, any>
    confidence: 'high' | 'low'
}

interface DocumentVerifyResult {
    success: boolean
    is_valid: boolean
    confidence: number
    concerns: string[]
    recommendations: string[]
}

interface EstimateResult {
    success: boolean
    estimated_price: number
    price_range: { min: number; max: number }
    duration_hours: number
    breakdown: { item: string; price: number }[]
    notes: string
}

interface PropertyDetectResult {
    success: boolean
    estimated_sqft: number
    estimated_bedrooms: number
    estimated_bathrooms: number
    property_type: string
    confidence: string
    notes: string
}

interface JobSummaryResult {
    success: boolean
    title: string
    summary: string
    highlights: string[]
    recommendations: string[]
}

class ApiClient {
    private baseUrl: string
    private token: string | null = null

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl
    }

    setToken(token: string | null) {
        this.token = token
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...((options.headers as Record<string, string>) || {}),
        }

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`
        }

        const response = await fetch(url, {
            ...options,
            headers,
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Request failed' }))
            throw { detail: error.detail || 'Request failed', status: response.status } as ApiError
        }

        return response.json()
    }

    // Auth endpoints
    auth = {
        login: (email: string, password: string) =>
            this.request<{ access_token: string; user: any }>('/api/v1/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            }),

        register: (email: string, password: string, role: 'client' | 'cleaner') =>
            this.request<{ access_token: string; user: any }>('/api/v1/auth/register', {
                method: 'POST',
                body: JSON.stringify({ email, password, role }),
            }),

        forgotPassword: (email: string) =>
            this.request<{ message: string }>('/api/v1/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email }),
            }),

        me: () => this.request<any>('/api/v1/auth/me'),
    }

    // Cleaners endpoints
    cleaners = {
        search: (params: { location?: string; service?: string; minRating?: number; page?: number }) =>
            this.request<any[]>(`/api/v1/cleaners?${new URLSearchParams(params as any)}`),

        getById: (id: string) => this.request<any>(`/api/v1/cleaners/${id}`),

        getAvailability: (id: string, date?: string) =>
            this.request<any>(`/api/v1/cleaners/${id}/availability${date ? `?date=${date}` : ''}`),

        getReviews: (id: string, page = 1) =>
            this.request<any[]>(`/api/v1/cleaners/${id}/reviews?page=${page}`),
    }

    // Properties endpoints
    properties = {
        list: () => this.request<any[]>('/api/v1/properties'),

        create: (data: any) =>
            this.request<any>('/api/v1/properties', {
                method: 'POST',
                body: JSON.stringify(data),
            }),

        getById: (id: string) => this.request<any>(`/api/v1/properties/${id}`),

        update: (id: string, data: any) =>
            this.request<any>(`/api/v1/properties/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            }),

        delete: (id: string) =>
            this.request<void>(`/api/v1/properties/${id}`, { method: 'DELETE' }),
    }

    // Jobs endpoints
    jobs = {
        list: (status?: string) =>
            this.request<any[]>(`/api/v1/jobs${status ? `?status=${status}` : ''}`),

        create: (data: any) =>
            this.request<any>('/api/v1/jobs', {
                method: 'POST',
                body: JSON.stringify(data),
            }),

        getById: (id: string) => this.request<any>(`/api/v1/jobs/${id}`),

        estimate: (data: { propertyId: string; services: string[]; addOns?: string[] }) =>
            this.request<any>('/api/v1/jobs/estimate', {
                method: 'POST',
                body: JSON.stringify(data),
            }),

        accept: (id: string) =>
            this.request<any>(`/api/v1/jobs/${id}/accept`, { method: 'POST' }),

        decline: (id: string) =>
            this.request<any>(`/api/v1/jobs/${id}/decline`, { method: 'POST' }),

        start: (id: string) =>
            this.request<any>(`/api/v1/jobs/${id}/start`, { method: 'POST' }),

        complete: (id: string) =>
            this.request<any>(`/api/v1/jobs/${id}/complete`, { method: 'POST' }),

        cancel: (id: string) =>
            this.request<any>(`/api/v1/jobs/${id}/cancel`, { method: 'POST' }),
    }

    // Reviews endpoints
    reviews = {
        list: () =>
            this.request<any>('/api/v1/reviews/'),

        create: (data: any) =>
            this.request<any>('/api/v1/reviews', {
                method: 'POST',
                body: JSON.stringify(data),
            }),

        respond: (id: string, response: string) =>
            this.request<any>(`/api/v1/reviews/${id}/respond`, {
                method: 'POST',
                body: JSON.stringify({ response }),
            }),
    }

    // Messages endpoints
    messages = {
        getConversations: () => this.request<any[]>('/api/v1/messages/conversations'),

        getConversation: (id: string) =>
            this.request<any>(`/api/v1/messages/conversations/${id}`),

        send: (conversationId: string, content: string, attachments?: string[]) =>
            this.request<any>('/api/v1/messages/send', {
                method: 'POST',
                body: JSON.stringify({ conversationId, content, attachments }),
            }),

        markAsRead: (conversationId: string) =>
            this.request<void>(`/api/v1/messages/conversations/${conversationId}/read`, {
                method: 'POST',
            }),
    }

    // AI endpoints
    ai = {
        chat: (messages: ChatMessage[], userContext?: Record<string, any>, role: 'client' | 'cleaner' = 'client') =>
            this.request<ChatResponse>('/api/v1/ai/chat', {
                method: 'POST',
                body: JSON.stringify({ messages, user_context: userContext, role }),
            }),

        parseDocument: (imageUrl: string, documentType: 'business_license' | 'insurance' | 'certification' | 'id') =>
            this.request<DocumentParseResult>('/api/v1/ai/parse-document', {
                method: 'POST',
                body: JSON.stringify({ image_url: imageUrl, document_type: documentType }),
            }),

        verifyDocument: (imageUrl: string, documentType: string) =>
            this.request<DocumentVerifyResult>('/api/v1/ai/verify-document', {
                method: 'POST',
                body: JSON.stringify({ image_url: imageUrl, document_type: documentType }),
            }),

        generateEstimate: (propertyDetails: Record<string, any>, services: string[]) =>
            this.request<EstimateResult>('/api/v1/ai/estimate', {
                method: 'POST',
                body: JSON.stringify({ property_details: propertyDetails, services }),
            }),

        detectProperty: (address: string) =>
            this.request<PropertyDetectResult>('/api/v1/ai/detect-property', {
                method: 'POST',
                body: JSON.stringify({ address }),
            }),

        generateJobSummary: (jobDetails: Record<string, any>, beforePhotos: string[] = [], afterPhotos: string[] = []) =>
            this.request<JobSummaryResult>('/api/v1/ai/job-summary', {
                method: 'POST',
                body: JSON.stringify({ job_details: jobDetails, before_photos: beforePhotos, after_photos: afterPhotos }),
            }),
    }

    // Notifications endpoints
    notifications = {
        list: (page = 1, limit = 20) =>
            this.request<any>(`/api/v1/notifications?page=${page}&limit=${limit}`),

        unreadCount: () =>
            this.request<{ count: number }>('/api/v1/notifications/unread-count'),

        markAsRead: (id: string) =>
            this.request<void>(`/api/v1/notifications/${id}/read`, { method: 'POST' }),

        markAllRead: () =>
            this.request<void>('/api/v1/notifications/mark-all-read', { method: 'POST' }),
    }

    // Feed endpoints
    feed = {
        list: (page = 1, limit = 20) =>
            this.request<any>(`/api/v1/feed?page=${page}&limit=${limit}`),

        like: (id: string) =>
            this.request<any>(`/api/v1/feed/${id}/like`, { method: 'POST' }),

        create: (data: any) =>
            this.request<any>('/api/v1/feed', {
                method: 'POST',
                body: JSON.stringify(data),
            }),

        update: (id: string, data: any) =>
            this.request<any>(`/api/v1/feed/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            }),

        delete: (id: string) =>
            this.request<void>(`/api/v1/feed/${id}`, { method: 'DELETE' }),
    }

    // Payments endpoints
    payments = {
        createIntent: (data: { amount: number; jobId: string; capture_method?: string }) =>
            this.request<any>('/api/v1/payments/create-intent', {
                method: 'POST',
                body: JSON.stringify(data),
            }),

        release: (jobId: string) =>
            this.request<any>(`/api/v1/payments/release/${jobId}`, { method: 'POST' }),

        refund: (paymentIntentId: string, amount?: number) =>
            this.request<any>(`/api/v1/payments/refund/${paymentIntentId}`, {
                method: 'POST',
                body: JSON.stringify({ amount }),
            }),

        createConnectedAccount: (data: { email: string; businessName?: string }) =>
            this.request<any>('/api/v1/payments/create-connected-account', {
                method: 'POST',
                body: JSON.stringify(data),
            }),

        getAccountStatus: (accountId: string) =>
            this.request<any>(`/api/v1/payments/account-status/${accountId}`),

        createCheckoutSession: (plan: string) =>
            this.request<any>(`/api/v1/payments/create-checkout-session?plan=${plan}`, {
                method: 'POST',
            }),

        createCustomerPortal: () =>
            this.request<any>('/api/v1/payments/customer-portal', { method: 'POST' }),
    }

    // Admin endpoints
    admin = {
        stats: (timeRange?: string) =>
            this.request<any>(`/api/v1/admin/stats${timeRange ? `?time_range=${timeRange}` : ''}`),

        users: (page = 1, role?: string, status?: string) => {
            const params = new URLSearchParams({ page: String(page) })
            if (role) params.set('role', role)
            if (status) params.set('status', status)
            return this.request<any>(`/api/v1/admin/users?${params}`)
        },

        getUser: (id: string) => this.request<any>(`/api/v1/admin/users/${id}`),

        updateUser: (id: string, data: any) =>
            this.request<any>(`/api/v1/admin/users/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            }),

        jobs: (page = 1, status?: string) => {
            const params = new URLSearchParams({ page: String(page) })
            if (status) params.set('status', status)
            return this.request<any>(`/api/v1/admin/jobs?${params}`)
        },

        disputes: (page = 1, status?: string) => {
            const params = new URLSearchParams({ page: String(page) })
            if (status) params.set('status', status)
            return this.request<any>(`/api/v1/admin/disputes?${params}`)
        },

        resolveDispute: (id: string, data: any) =>
            this.request<any>(`/api/v1/admin/disputes/${id}/resolve`, {
                method: 'POST',
                body: JSON.stringify(data),
            }),

        verifications: (page = 1, status?: string) => {
            const params = new URLSearchParams({ page: String(page) })
            if (status) params.set('status', status)
            return this.request<any>(`/api/v1/admin/verifications/queue?${params}`)
        },

        approvals: (page = 1, status?: string) => {
            const params = new URLSearchParams({ page: String(page) })
            if (status) params.set('status', status)
            return this.request<any>(`/api/v1/admin/approvals?${params}`)
        },

        approveItem: (id: string, notes?: string) =>
            this.request<any>(`/api/v1/admin/approvals/${id}/approve`, {
                method: 'POST',
                body: JSON.stringify({ notes }),
            }),

        rejectItem: (id: string, reason: string) =>
            this.request<any>(`/api/v1/admin/approvals/${id}/reject`, {
                method: 'POST',
                body: JSON.stringify({ reason }),
            }),

        auditLog: (page = 1, action?: string) => {
            const params = new URLSearchParams({ page: String(page) })
            if (action) params.set('action', action)
            return this.request<any>(`/api/v1/admin/audit?${params}`)
        },

        moderation: (page = 1, status?: string) => {
            const params = new URLSearchParams({ page: String(page) })
            if (status) params.set('status', status)
            return this.request<any>(`/api/v1/admin/moderation?${params}`)
        },
    }

    // Verification endpoints
    verification = {
        getStatus: () => this.request<any>('/api/v1/verification/status'),

        submit: (data: { type: string; document_url: string }) =>
            this.request<any>('/api/v1/verification/submit', {
                method: 'POST',
                body: JSON.stringify(data),
            }),

        sendPhoneCode: (phone: string) =>
            this.request<any>('/api/v1/verification/phone/send', {
                method: 'POST',
                body: JSON.stringify({ phone }),
            }),

        verifyPhone: (code: string) =>
            this.request<any>('/api/v1/verification/phone/verify', {
                method: 'POST',
                body: JSON.stringify({ code }),
            }),
    }

    // Bids endpoints
    bids = {
        list: (status?: string) =>
            this.request<any[]>(`/api/v1/bids${status ? `?status=${status}` : ''}`),

        create: (data: { job_id: string; amount: number; message?: string }) =>
            this.request<any>('/api/v1/bids', {
                method: 'POST',
                body: JSON.stringify(data),
            }),

        accept: (id: string) =>
            this.request<any>(`/api/v1/bids/${id}/accept`, { method: 'POST' }),

        decline: (id: string) =>
            this.request<any>(`/api/v1/bids/${id}/decline`, { method: 'POST' }),

        withdraw: (id: string) =>
            this.request<any>(`/api/v1/bids/${id}/withdraw`, { method: 'POST' }),
    }

    // Cleaner-specific management endpoints
    cleanerProfile = {
        getMe: () => this.request<any>('/api/v1/cleaners/me'),

        updateMe: (data: any) =>
            this.request<any>('/api/v1/cleaners/me', {
                method: 'PATCH',
                body: JSON.stringify(data),
            }),

        getAvailability: () => this.request<any>('/api/v1/cleaners/me/availability'),

        updateAvailability: (schedule: any[]) =>
            this.request<any>('/api/v1/cleaners/me/availability', {
                method: 'PUT',
                body: JSON.stringify({ schedule }),
            }),

        getPortfolio: () => this.request<any[]>('/api/v1/cleaners/me/portfolio'),

        addPhoto: (url: string, caption?: string) =>
            this.request<any>('/api/v1/cleaners/me/portfolio', {
                method: 'POST',
                body: JSON.stringify({ url, caption }),
            }),

        deletePhoto: (photoId: string) =>
            this.request<void>(`/api/v1/cleaners/me/portfolio/${photoId}`, { method: 'DELETE' }),
    }

    // Scheduling & routes endpoints
    scheduling = {
        optimizeRoute: (date?: string) =>
            this.request<any>('/api/v1/route/optimize', {
                method: 'POST',
                body: JSON.stringify({ date }),
            }),

        getGaps: (startDate?: string, endDate?: string) =>
            this.request<any>(`/api/v1/schedule/gaps${startDate ? `?start_date=${startDate}` : ''}`),

        syncCalendar: (propertyId: string) =>
            this.request<any>(`/api/v1/properties/${propertyId}/sync-ical`, { method: 'POST' }),
    }

    // Upload endpoints
    uploads = {
        upload: (file: File, type: string = 'general') => {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('type', type)

            const headers: Record<string, string> = {}
            if (this.token) headers['Authorization'] = `Bearer ${this.token}`

            return fetch(`${this.baseUrl}/api/v1/uploads/`, {
                method: 'POST',
                headers,
                body: formData,
            }).then(res => {
                if (!res.ok) throw { detail: 'Upload failed', status: res.status }
                return res.json()
            })
        },
    }

    // Sponsored listings endpoints
    sponsored = {
        list: () => this.request<any[]>('/api/v1/sponsored'),

        create: (data: any) =>
            this.request<any>('/api/v1/sponsored', {
                method: 'POST',
                body: JSON.stringify(data),
            }),
    }

    // Settings/privacy endpoints
    settings = {
        exportData: () => this.request<any>('/api/v1/privacy/export', { method: 'POST' }),

        deleteAccount: () => this.request<void>('/api/v1/privacy/delete', { method: 'DELETE' }),

        updateSettings: (data: any) =>
            this.request<any>('/api/v1/auth/settings', {
                method: 'PATCH',
                body: JSON.stringify(data),
            }),
    }

    // Agreements endpoints
    agreements = {
        list: () => this.request<any[]>('/api/v1/agreements'),

        accept: (jobId: string) =>
            this.request<any>('/api/v1/agreements/accept', {
                method: 'POST',
                body: JSON.stringify({ job_id: jobId }),
            }),
    }
}

export const api = new ApiClient(API_URL)
export type { ApiError, ChatMessage, ChatResponse, DocumentParseResult, DocumentVerifyResult, EstimateResult, PropertyDetectResult, JobSummaryResult }
