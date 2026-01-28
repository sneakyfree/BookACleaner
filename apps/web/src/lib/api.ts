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
}

export const api = new ApiClient(API_URL)
export type { ApiError, ChatMessage, ChatResponse, DocumentParseResult, DocumentVerifyResult, EstimateResult, PropertyDetectResult, JobSummaryResult }

