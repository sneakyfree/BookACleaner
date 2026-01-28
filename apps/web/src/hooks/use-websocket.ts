'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

export type WSMessageType =
    | 'connection'
    | 'ping'
    | 'pong'
    | 'chat_message'
    | 'chat_typing'
    | 'chat_read'
    | 'job_update'
    | 'job_accepted'
    | 'job_declined'
    | 'job_started'
    | 'job_completed'
    | 'job_cancelled'
    | 'notification'
    | 'join_room'
    | 'leave_room'
    | 'room_joined'
    | 'room_left'
    | 'message_sent'
    | 'error'

export interface WSMessage<T = any> {
    type: WSMessageType
    data: T
    timestamp: string
}

interface UseWebSocketOptions {
    onMessage?: (message: WSMessage) => void
    onConnect?: () => void
    onDisconnect?: () => void
    onError?: (error: Event) => void
    autoReconnect?: boolean
    reconnectInterval?: number
    maxReconnectAttempts?: number
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
    const {
        onMessage,
        onConnect,
        onDisconnect,
        onError,
        autoReconnect = true,
        reconnectInterval = 3000,
        maxReconnectAttempts = 5,
    } = options

    const { data: session } = useSession()
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectAttemptsRef = useRef(0)
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
    const pingIntervalRef = useRef<NodeJS.Timeout>()

    const [isConnected, setIsConnected] = useState(false)
    const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (!session?.user?.id) return
        if (wsRef.current?.readyState === WebSocket.OPEN) return

        const token = (session as any).accessToken || session.user.id
        const ws = new WebSocket(`${WS_URL}/api/v1/ws?token=${token}`)

        ws.onopen = () => {
            setIsConnected(true)
            reconnectAttemptsRef.current = 0
            onConnect?.()

            // Start ping interval
            pingIntervalRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping', data: {} }))
                }
            }, 30000)
        }

        ws.onmessage = (event) => {
            try {
                const message: WSMessage = JSON.parse(event.data)
                setLastMessage(message)
                onMessage?.(message)
            } catch (e) {
                console.error('Failed to parse WebSocket message:', e)
            }
        }

        ws.onclose = () => {
            setIsConnected(false)
            onDisconnect?.()

            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current)
            }

            // Auto reconnect
            if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
                reconnectAttemptsRef.current++
                reconnectTimeoutRef.current = setTimeout(() => {
                    connect()
                }, reconnectInterval)
            }
        }

        ws.onerror = (error) => {
            console.error('WebSocket error:', error)
            onError?.(error)
        }

        wsRef.current = ws
    }, [session, onConnect, onDisconnect, onMessage, onError, autoReconnect, reconnectInterval, maxReconnectAttempts])

    // Disconnect from WebSocket
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
        }
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current)
        }
        reconnectAttemptsRef.current = maxReconnectAttempts // Prevent auto-reconnect

        if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
        }
    }, [maxReconnectAttempts])

    // Send message
    const send = useCallback((type: WSMessageType, data: any = {}) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type, data }))
        } else {
            console.warn('WebSocket not connected, cannot send message')
        }
    }, [])

    // Join a conversation room
    const joinRoom = useCallback((roomId: string) => {
        send('join_room', { room_id: roomId })
    }, [send])

    // Leave a conversation room
    const leaveRoom = useCallback((roomId: string) => {
        send('leave_room', { room_id: roomId })
    }, [send])

    // Send a chat message
    const sendChatMessage = useCallback((roomId: string, content: string, messageId?: string) => {
        send('chat_message', {
            room_id: roomId,
            content,
            message_id: messageId || `msg_${Date.now()}`
        })
    }, [send])

    // Send typing indicator
    const sendTyping = useCallback((roomId: string, isTyping: boolean = true) => {
        send('chat_typing', { room_id: roomId, is_typing: isTyping })
    }, [send])

    // Send read receipt
    const sendReadReceipt = useCallback((roomId: string, lastReadId: string) => {
        send('chat_read', { room_id: roomId, last_read_id: lastReadId })
    }, [send])

    // Connect when session is available
    useEffect(() => {
        if (session?.user?.id) {
            connect()
        }
        return () => {
            disconnect()
        }
    }, [session?.user?.id, connect, disconnect])

    return {
        isConnected,
        lastMessage,
        send,
        connect,
        disconnect,
        joinRoom,
        leaveRoom,
        sendChatMessage,
        sendTyping,
        sendReadReceipt,
    }
}


// ==================== SPECIALIZED HOOKS ====================

/**
 * Hook for real-time chat in a specific conversation
 */
export function useRealtimeChat(conversationId: string | null) {
    const [messages, setMessages] = useState<any[]>([])
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())

    const handleMessage = useCallback((msg: WSMessage) => {
        switch (msg.type) {
            case 'chat_message':
                if (msg.data.room_id === conversationId) {
                    setMessages(prev => [...prev, msg.data])
                }
                break
            case 'chat_typing':
                if (msg.data.room_id === conversationId) {
                    setTypingUsers(prev => {
                        const next = new Set(prev)
                        if (msg.data.is_typing) {
                            next.add(msg.data.user_id)
                        } else {
                            next.delete(msg.data.user_id)
                        }
                        return next
                    })
                }
                break
        }
    }, [conversationId])

    const ws = useWebSocket({ onMessage: handleMessage })

    useEffect(() => {
        if (conversationId && ws.isConnected) {
            ws.joinRoom(conversationId)
            return () => {
                ws.leaveRoom(conversationId)
            }
        }
        return undefined
    }, [conversationId, ws.isConnected])

    return {
        ...ws,
        messages,
        typingUsers: Array.from(typingUsers),
        clearMessages: () => setMessages([]),
    }
}


/**
 * Hook for real-time job status updates
 */
export function useJobUpdates(jobIds: string[] = []) {
    const [updates, setUpdates] = useState<Map<string, any>>(new Map())

    const handleMessage = useCallback((msg: WSMessage) => {
        if (msg.type === 'job_update' && jobIds.includes(msg.data.job_id)) {
            setUpdates(prev => new Map(prev).set(msg.data.job_id, msg.data))
        }
    }, [jobIds])

    const ws = useWebSocket({ onMessage: handleMessage })

    const getJobStatus = (jobId: string) => updates.get(jobId)

    return {
        isConnected: ws.isConnected,
        updates,
        getJobStatus,
    }
}


/**
 * Hook for real-time notifications
 */
export function useNotifications() {
    const [notifications, setNotifications] = useState<any[]>([])
    const [unreadCount, setUnreadCount] = useState(0)

    const handleMessage = useCallback((msg: WSMessage) => {
        if (msg.type === 'notification') {
            setNotifications(prev => [msg.data, ...prev])
            setUnreadCount(prev => prev + 1)
        }
    }, [])

    const ws = useWebSocket({ onMessage: handleMessage })

    const markAsRead = (notificationId: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const clearAll = () => {
        setNotifications([])
        setUnreadCount(0)
    }

    return {
        isConnected: ws.isConnected,
        notifications,
        unreadCount,
        markAsRead,
        clearAll,
    }
}
