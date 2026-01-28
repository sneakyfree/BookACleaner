'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ChatMessage } from '@/lib/api'

// ==================== AI CHAT ====================

export function useAIChat() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            messages,
            userContext,
            role = 'client'
        }: {
            messages: ChatMessage[]
            userContext?: Record<string, any>
            role?: 'client' | 'cleaner'
        }) => api.ai.chat(messages, userContext, role),
        onSuccess: () => {
            // Optionally invalidate any cached chat data
        },
    })
}

// ==================== DOCUMENT PARSING ====================

export function useParseDocument() {
    return useMutation({
        mutationFn: ({
            imageUrl,
            documentType
        }: {
            imageUrl: string
            documentType: 'business_license' | 'insurance' | 'certification' | 'id'
        }) => api.ai.parseDocument(imageUrl, documentType),
    })
}

export function useVerifyDocument() {
    return useMutation({
        mutationFn: ({
            imageUrl,
            documentType
        }: {
            imageUrl: string
            documentType: string
        }) => api.ai.verifyDocument(imageUrl, documentType),
    })
}

// ==================== ESTIMATES ====================

export function useGenerateEstimate() {
    return useMutation({
        mutationFn: ({
            propertyDetails,
            services
        }: {
            propertyDetails: Record<string, any>
            services: string[]
        }) => api.ai.generateEstimate(propertyDetails, services),
    })
}

// ==================== PROPERTY DETECTION ====================

export function useDetectProperty() {
    return useMutation({
        mutationFn: (address: string) => api.ai.detectProperty(address),
    })
}

// ==================== JOB SUMMARY ====================

export function useGenerateJobSummary() {
    return useMutation({
        mutationFn: ({
            jobDetails,
            beforePhotos = [],
            afterPhotos = []
        }: {
            jobDetails: Record<string, any>
            beforePhotos?: string[]
            afterPhotos?: string[]
        }) => api.ai.generateJobSummary(jobDetails, beforePhotos, afterPhotos),
    })
}
