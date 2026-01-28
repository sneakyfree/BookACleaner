import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Auth Store
interface AuthState {
    token: string | null;
    user: any | null;
    isLoading: boolean;

    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    loadToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    token: null,
    user: null,
    isLoading: true,

    login: async (email: string, password: string) => {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            await SecureStore.setItemAsync('token', data.access_token);
            await SecureStore.setItemAsync('user', JSON.stringify(data.user));

            set({ token: data.access_token, user: data.user });
            return true;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    },

    logout: async () => {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');
        set({ token: null, user: null });
    },

    loadToken: async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const userStr = await SecureStore.getItemAsync('user');
            const user = userStr ? JSON.parse(userStr) : null;
            set({ token, user, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
        }
    },
}));

// API Hook
export async function apiFetch(
    endpoint: string,
    options: RequestInit = {}
): Promise<any> {
    const token = await SecureStore.getItemAsync('token');

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}

// Jobs Hook
export function useJobs() {
    const fetchJobs = async (status?: string) => {
        const query = status ? `?status=${status}` : '';
        return apiFetch(`/jobs${query}`);
    };

    const getJob = async (id: string) => {
        return apiFetch(`/jobs/${id}`);
    };

    const updateJobStatus = async (id: string, status: string) => {
        return apiFetch(`/jobs/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
    };

    return { fetchJobs, getJob, updateJobStatus };
}

// Cleaners Hook
export function useCleaners() {
    const fetchCleaners = async (filters?: { service?: string; city?: string }) => {
        const params = new URLSearchParams();
        if (filters?.service) params.append('service', filters.service);
        if (filters?.city) params.append('city', filters.city);
        const query = params.toString() ? `?${params.toString()}` : '';
        return apiFetch(`/cleaners${query}`);
    };

    const getCleaner = async (id: string) => {
        return apiFetch(`/cleaners/${id}`);
    };

    return { fetchCleaners, getCleaner };
}

// Messages Hook
export function useMessages() {
    const fetchConversations = async () => {
        return apiFetch('/messages/conversations');
    };

    const fetchMessages = async (conversationId: string) => {
        return apiFetch(`/messages/conversations/${conversationId}`);
    };

    const sendMessage = async (conversationId: string, content: string) => {
        return apiFetch('/messages', {
            method: 'POST',
            body: JSON.stringify({ conversation_id: conversationId, content }),
        });
    };

    return { fetchConversations, fetchMessages, sendMessage };
}
