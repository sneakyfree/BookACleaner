'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

type WebSocketMessage = {
    type: string
    payload: any
}

type WebSocketOptions = {
    onMessage?: (message: WebSocketMessage) => void
    onConnect?: () => void
    onDisconnect?: () => void
    onError?: (error: Event) => void
    reconnectInterval?: number
    maxReconnectAttempts?: number
}

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export function useWebSocket(url: string, options: WebSocketOptions = {}) {
    const {
        onMessage,
        onConnect,
        onDisconnect,
        onError,
        reconnectInterval = 3000,
        maxReconnectAttempts = 5,
    } = options

    const [status, setStatus] = useState<WebSocketStatus>('disconnected')
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectAttemptsRef = useRef(0)
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return
        }

        setStatus('connecting')

        try {
            wsRef.current = new WebSocket(url)

            wsRef.current.onopen = () => {
                setStatus('connected')
                reconnectAttemptsRef.current = 0
                onConnect?.()
            }

            wsRef.current.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data) as WebSocketMessage
                    setLastMessage(message)
                    onMessage?.(message)
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e)
                }
            }

            wsRef.current.onclose = () => {
                setStatus('disconnected')
                onDisconnect?.()

                // Attempt reconnection
                if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttemptsRef.current++
                        connect()
                    }, reconnectInterval * Math.pow(2, reconnectAttemptsRef.current))
                }
            }

            wsRef.current.onerror = (error) => {
                setStatus('error')
                onError?.(error)
            }
        } catch (e) {
            setStatus('error')
            console.error('WebSocket connection failed:', e)
        }
    }, [url, onConnect, onDisconnect, onMessage, onError, maxReconnectAttempts, reconnectInterval])

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
        }
        reconnectAttemptsRef.current = maxReconnectAttempts // Prevent reconnection
        wsRef.current?.close()
    }, [maxReconnectAttempts])

    const sendMessage = useCallback((type: string, payload: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type, payload }))
            return true
        }
        return false
    }, [])

    const sendTypingIndicator = useCallback((conversationId: string, isTyping: boolean) => {
        return sendMessage('typing', { conversationId, isTyping })
    }, [sendMessage])

    const sendReadReceipt = useCallback((conversationId: string, messageId: string) => {
        return sendMessage('read', { conversationId, messageId })
    }, [sendMessage])

    useEffect(() => {
        connect()
        return () => {
            disconnect()
        }
    }, [connect, disconnect])

    return {
        status,
        lastMessage,
        sendMessage,
        sendTypingIndicator,
        sendReadReceipt,
        connect,
        disconnect,
        isConnected: status === 'connected',
    }
}

export default useWebSocket
