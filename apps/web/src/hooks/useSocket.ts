/**
 * @deprecated Use `use-websocket.ts` instead.
 * This file is kept for backward compatibility.
 * 
 * Note: The original useSocket used socket.io. The canonical
 * use-websocket.ts uses native WebSockets. If you need socket.io
 * features, consider extending use-websocket.ts.
 */
'use client'

import { useWebSocket, useRealtimeChat } from './use-websocket'

export function useSocket() {
    const ws = useWebSocket()

    return {
        socket: null, // native WebSocket, not socket.io
        connected: ws.isConnected,
        sendMessage: (conversationId: string, content: string) => {
            ws.sendChatMessage(conversationId, content)
        },
        setTyping: (conversationId: string, isTyping: boolean) => {
            ws.sendTyping(conversationId, isTyping)
        },
        markRead: (conversationId: string, messageId?: string) => {
            ws.sendReadReceipt(conversationId, messageId || '')
        },
        joinConversation: (conversationId: string) => {
            ws.joinRoom(conversationId)
        },
        leaveConversation: (conversationId: string) => {
            ws.leaveRoom(conversationId)
        },
    }
}

export { useRealtimeChat as useConversation }
