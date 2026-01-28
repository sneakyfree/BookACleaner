'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Paperclip, Image as ImageIcon, Check, CheckCheck } from 'lucide-react'
import { useRealtimeChat } from '@/hooks/use-websocket'
import { format } from 'date-fns'

interface Message {
    id: string
    sender_id: string
    content: string
    timestamp: string
    read?: boolean
}

interface RealtimeChatProps {
    conversationId: string
    currentUserId: string
    otherUser: {
        id: string
        name: string
        avatar?: string
    }
    initialMessages?: Message[]
    className?: string
}

export function RealtimeChat({
    conversationId,
    currentUserId,
    otherUser,
    initialMessages = [],
    className = '',
}: RealtimeChatProps) {
    const [allMessages, setAllMessages] = useState<Message[]>(initialMessages)
    const [input, setInput] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const {
        isConnected,
        messages: realtimeMessages,
        typingUsers,
        sendChatMessage,
        sendTyping,
        sendReadReceipt,
    } = useRealtimeChat(conversationId)

    // Combine initial + realtime messages
    useEffect(() => {
        if (realtimeMessages.length > 0) {
            setAllMessages(prev => {
                const newMessages = realtimeMessages.filter(
                    rm => !prev.find(pm => pm.id === rm.message_id)
                ).map(rm => ({
                    id: rm.message_id,
                    sender_id: rm.sender_id,
                    content: rm.content,
                    timestamp: rm.timestamp || new Date().toISOString(),
                }))
                return [...prev, ...newMessages]
            })
        }
    }, [realtimeMessages])

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [allMessages])

    // Mark messages as read when conversation is viewed
    useEffect(() => {
        if (allMessages.length > 0) {
            const lastMessage = allMessages[allMessages.length - 1]
            if (lastMessage.sender_id !== currentUserId) {
                sendReadReceipt(conversationId, lastMessage.id)
            }
        }
    }, [allMessages, conversationId, currentUserId, sendReadReceipt])

    const handleSend = () => {
        if (!input.trim()) return

        const messageId = `msg_${Date.now()}`

        // Optimistic update
        setAllMessages(prev => [...prev, {
            id: messageId,
            sender_id: currentUserId,
            content: input.trim(),
            timestamp: new Date().toISOString(),
        }])

        // Send via WebSocket
        sendChatMessage(conversationId, input.trim(), messageId)
        setInput('')
        sendTyping(conversationId, false)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value)
        sendTyping(conversationId, e.target.value.length > 0)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className={`flex flex-col h-full bg-white rounded-xl border overflow-hidden ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b bg-gray-50">
                <div className="relative">
                    {otherUser.avatar ? (
                        <img
                            src={otherUser.avatar}
                            alt={otherUser.name}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center text-white font-medium">
                            {otherUser.name.charAt(0)}
                        </div>
                    )}
                    {isConnected && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{otherUser.name}</h3>
                    <p className="text-xs text-gray-500">
                        {typingUsers.length > 0 ? (
                            <span className="text-violet-600">Typing...</span>
                        ) : isConnected ? (
                            'Online'
                        ) : (
                            'Connecting...'
                        )}
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {allMessages.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p>No messages yet</p>
                        <p className="text-sm">Say hello! 👋</p>
                    </div>
                ) : (
                    allMessages.map((msg, i) => {
                        const isMe = msg.sender_id === currentUserId
                        const showAvatar = !isMe && (i === 0 || allMessages[i - 1].sender_id !== msg.sender_id)

                        return (
                            <div
                                key={msg.id}
                                className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                {!isMe && showAvatar && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs">
                                        {otherUser.name.charAt(0)}
                                    </div>
                                )}
                                {!isMe && !showAvatar && <div className="w-8" />}

                                <div className={`max-w-[70%] ${isMe ? 'order-1' : ''}`}>
                                    <div
                                        className={`rounded-2xl px-4 py-2 ${isMe
                                                ? 'bg-violet-600 text-white rounded-br-md'
                                                : 'bg-white border shadow-sm text-gray-800 rounded-bl-md'
                                            }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                    <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                                        <span className="text-[10px] text-gray-400">
                                            {format(new Date(msg.timestamp), 'h:mm a')}
                                        </span>
                                        {isMe && (
                                            msg.read ? (
                                                <CheckCheck className="w-3 h-3 text-blue-500" />
                                            ) : (
                                                <Check className="w-3 h-3 text-gray-400" />
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs">
                            {otherUser.name.charAt(0)}
                        </div>
                        <div className="bg-white border shadow-sm rounded-2xl px-4 py-2">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-white">
                <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                        <ImageIcon className="w-5 h-5" />
                    </button>
                    <Input
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1"
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!input.trim() || !isConnected}
                        className="bg-violet-600 hover:bg-violet-700"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default RealtimeChat
