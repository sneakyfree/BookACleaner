'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000'

interface Message {
    id: string
    conversation_id: string
    sender_id: string
    sender_name?: string
    content: string
    created_at: string
}

interface TypingUser {
    user_id: string
    is_typing: boolean
}

interface UseSocketReturn {
    socket: Socket | null
    connected: boolean
    sendMessage: (conversationId: string, content: string) => void
    setTyping: (conversationId: string, isTyping: boolean) => void
    markRead: (conversationId: string, messageId?: string) => void
    joinConversation: (conversationId: string) => void
    leaveConversation: (conversationId: string) => void
}

export function useSocket(): UseSocketReturn {
    const { data: session } = useSession()
    const [socket, setSocket] = useState<Socket | null>(null)
    const [connected, setConnected] = useState(false)
    const socketRef = useRef<Socket | null>(null)

    useEffect(() => {
        const token = (session as any)?.accessToken

        if (!token) {
            return
        }

        // Prevent duplicate connections
        if (socketRef.current?.connected) {
            return
        }

        const newSocket = io(`${WS_URL}/ws`, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        })

        newSocket.on('connect', () => {
            console.log('WebSocket connected')
            setConnected(true)
        })

        newSocket.on('disconnect', () => {
            console.log('WebSocket disconnected')
            setConnected(false)
        })

        newSocket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error)
            setConnected(false)
        })

        newSocket.on('connected', (data) => {
            console.log('Connected as user:', data.user_id)
        })

        newSocket.on('error', (data) => {
            console.error('WebSocket error:', data.message)
        })

        socketRef.current = newSocket
        setSocket(newSocket)

        return () => {
            newSocket.close()
            socketRef.current = null
        }
    }, [session])

    const sendMessage = useCallback((conversationId: string, content: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('send_message', {
                conversation_id: conversationId,
                content,
            })
        }
    }, [])

    const setTyping = useCallback((conversationId: string, isTyping: boolean) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('typing', {
                conversation_id: conversationId,
                is_typing: isTyping,
            })
        }
    }, [])

    const markRead = useCallback((conversationId: string, messageId?: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('mark_read', {
                conversation_id: conversationId,
                message_id: messageId,
            })
        }
    }, [])

    const joinConversation = useCallback((conversationId: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('join_conversation', {
                conversation_id: conversationId,
            })
        }
    }, [])

    const leaveConversation = useCallback((conversationId: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('leave_conversation', {
                conversation_id: conversationId,
            })
        }
    }, [])

    return {
        socket,
        connected,
        sendMessage,
        setTyping,
        markRead,
        joinConversation,
        leaveConversation,
    }
}


interface UseConversationOptions {
    conversationId: string
    onNewMessage?: (message: Message) => void
    onTyping?: (data: TypingUser) => void
    onRead?: (data: { user_id: string; message_id?: string }) => void
}

export function useConversation(options: UseConversationOptions) {
    const { socket, connected, sendMessage, setTyping, markRead, joinConversation, leaveConversation } = useSocket()
    const [messages, setMessages] = useState<Message[]>([])
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (!socket || !connected || !options.conversationId) return

        // Join conversation room
        joinConversation(options.conversationId)

        // Listen for new messages
        const handleNewMessage = (message: Message) => {
            if (message.conversation_id === options.conversationId) {
                setMessages(prev => [...prev, message])
                options.onNewMessage?.(message)
            }
        }

        // Listen for typing
        const handleTyping = (data: TypingUser) => {
            setTypingUsers(prev => {
                const next = new Set(prev)
                if (data.is_typing) {
                    next.add(data.user_id)
                } else {
                    next.delete(data.user_id)
                }
                return next
            })
            options.onTyping?.(data)
        }

        // Listen for read receipts
        const handleRead = (data: { user_id: string; message_id?: string }) => {
            options.onRead?.(data)
        }

        socket.on('new_message', handleNewMessage)
        socket.on('user_typing', handleTyping)
        socket.on('messages_read', handleRead)

        return () => {
            leaveConversation(options.conversationId)
            socket.off('new_message', handleNewMessage)
            socket.off('user_typing', handleTyping)
            socket.off('messages_read', handleRead)
        }
    }, [socket, connected, options.conversationId])

    const send = useCallback((content: string) => {
        sendMessage(options.conversationId, content)
    }, [options.conversationId, sendMessage])

    const startTyping = useCallback(() => {
        setTyping(options.conversationId, true)
    }, [options.conversationId, setTyping])

    const stopTyping = useCallback(() => {
        setTyping(options.conversationId, false)
    }, [options.conversationId, setTyping])

    const read = useCallback((messageId?: string) => {
        markRead(options.conversationId, messageId)
    }, [options.conversationId, markRead])

    return {
        messages,
        typingUsers: Array.from(typingUsers),
        send,
        startTyping,
        stopTyping,
        read,
        connected,
    }
}
