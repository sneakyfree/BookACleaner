'use client'

import { create } from 'zustand'

type Message = {
    id: string
    conversationId: string
    senderId: string
    content: string
    createdAt: string
    read: boolean
}

type Conversation = {
    id: string
    participants: { id: string; name: string; avatar?: string }[]
    lastMessage?: Message
    unreadCount: number
}

type TypingIndicator = {
    conversationId: string
    userId: string
    userName: string
}

interface MessageStore {
    conversations: Conversation[]
    activeConversationId: string | null
    messages: Record<string, Message[]>
    typingUsers: TypingIndicator[]
    totalUnreadCount: number

    // Actions
    setConversations: (conversations: Conversation[]) => void
    setActiveConversation: (id: string | null) => void
    addMessage: (message: Message) => void
    setMessages: (conversationId: string, messages: Message[]) => void
    markAsRead: (conversationId: string) => void
    addTypingUser: (indicator: TypingIndicator) => void
    removeTypingUser: (conversationId: string, userId: string) => void
    updateTotalUnreadCount: () => void
}

export const useMessageStore = create<MessageStore>((set, get) => ({
    conversations: [],
    activeConversationId: null,
    messages: {},
    typingUsers: [],
    totalUnreadCount: 0,

    setConversations: (conversations) => {
        set({ conversations })
        get().updateTotalUnreadCount()
    },

    setActiveConversation: (id) => {
        set({ activeConversationId: id })
        if (id) {
            get().markAsRead(id)
        }
    },

    addMessage: (message) => {
        set((state) => {
            const conversationMessages = state.messages[message.conversationId] || []
            return {
                messages: {
                    ...state.messages,
                    [message.conversationId]: [...conversationMessages, message],
                },
                conversations: state.conversations.map((conv) =>
                    conv.id === message.conversationId
                        ? {
                            ...conv,
                            lastMessage: message,
                            unreadCount: conv.id === state.activeConversationId
                                ? 0
                                : conv.unreadCount + 1,
                        }
                        : conv
                ),
            }
        })
        get().updateTotalUnreadCount()
    },

    setMessages: (conversationId, messages) => {
        set((state) => ({
            messages: {
                ...state.messages,
                [conversationId]: messages,
            },
        }))
    },

    markAsRead: (conversationId) => {
        set((state) => ({
            conversations: state.conversations.map((conv) =>
                conv.id === conversationId
                    ? { ...conv, unreadCount: 0 }
                    : conv
            ),
            messages: {
                ...state.messages,
                [conversationId]: (state.messages[conversationId] || []).map((msg) => ({
                    ...msg,
                    read: true,
                })),
            },
        }))
        get().updateTotalUnreadCount()
    },

    addTypingUser: (indicator) => {
        set((state) => ({
            typingUsers: [
                ...state.typingUsers.filter(
                    (t) => !(t.conversationId === indicator.conversationId && t.userId === indicator.userId)
                ),
                indicator,
            ],
        }))
    },

    removeTypingUser: (conversationId, userId) => {
        set((state) => ({
            typingUsers: state.typingUsers.filter(
                (t) => !(t.conversationId === conversationId && t.userId === userId)
            ),
        }))
    },

    updateTotalUnreadCount: () => {
        set((state) => ({
            totalUnreadCount: state.conversations.reduce((sum, conv) => sum + conv.unreadCount, 0),
        }))
    },
}))

export default useMessageStore
