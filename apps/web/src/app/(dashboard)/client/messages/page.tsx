'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    MessageSquare,
    Send,
    Search,
    MoreVertical,
    CheckCheck,
    Paperclip,
    Image as ImageIcon,
    Star,
    Loader2,
    AlertCircle,
    FileText,
    Download,
    X,
} from 'lucide-react'
import { useRealtimeChat } from '@/hooks/use-websocket'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ApiConversation {
    id: string
    job_id?: string
    last_message?: {
        content: string
        sent_at: string
        sender_id: string
    } | null
    unread_count: number
    updated_at?: string
}

interface ApiMessage {
    id: string
    content: string
    created_at?: string
    read_at?: string
    sender?: {
        id: string
        name?: string
        avatar?: string
    }
    is_mine: boolean
}

interface ApiConversationDetail {
    id: string
    job_id?: string
    messages: ApiMessage[]
}

interface DisplayConversation {
    id: string
    participantName: string
    participantInitial: string
    lastMessage: string
    lastMessageTime: string
    unread: number
    jobTitle: string
}

interface DisplayMessage {
    id: string
    senderId: string
    content: string
    timestamp: string
    read: boolean
    attachment_url?: string
    attachment_type?: 'image' | 'file'
    attachment_name?: string
}

export default function ClientMessagesPage() {
    const { data: session } = useSession()
    const [conversations, setConversations] = useState<DisplayConversation[]>([])
    const [messages, setMessages] = useState<DisplayMessage[]>([])
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [messagesLoading, setMessagesLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const currentUserId = useRef<string>('')

    // Real-time WebSocket integration
    const {
        messages: wsMessages,
        sendChatMessage,
        isConnected: wsConnected,
        clearMessages: clearWsMessages,
    } = useRealtimeChat(selectedConversation)

    const getHeaders = useCallback(() => ({
        Authorization: `Bearer ${(session as any)?.accessToken}`,
        'Content-Type': 'application/json',
    }), [session])

    // Populate current user id from session for WS message comparison
    useEffect(() => {
        if ((session as any)?.user?.id) {
            currentUserId.current = (session as any).user.id
        }
    }, [session])

    // Fetch conversations
    useEffect(() => {
        const token = (session as any)?.accessToken
        if (!token) {
            setLoading(false)
            return
        }

        async function fetchConversations() {
            try {
                setError(null)
                const res = await fetch(`${API_URL}/api/v1/messages/conversations`, {
                    headers: { Authorization: `Bearer ${(session as any)?.accessToken}` },
                })

                if (!res.ok) throw new Error(`Failed to load conversations (${res.status})`)

                const data: ApiConversation[] = await res.json()

                const mapped: DisplayConversation[] = data.map((conv) => {
                    const timeAgo = (dateStr?: string) => {
                        if (!dateStr) return ''
                        const diff = Date.now() - new Date(dateStr).getTime()
                        const mins = Math.floor(diff / 60000)
                        if (mins < 1) return 'Just now'
                        if (mins < 60) return `${mins} min ago`
                        const hours = Math.floor(mins / 60)
                        if (hours < 24) return `${hours}h ago`
                        const days = Math.floor(hours / 24)
                        return `${days}d ago`
                    }

                    return {
                        id: conv.id,
                        participantName: `Conversation`,
                        participantInitial: 'C',
                        lastMessage: conv.last_message?.content || 'No messages yet',
                        lastMessageTime: timeAgo(conv.last_message?.sent_at || conv.updated_at),
                        unread: conv.unread_count || 0,
                        jobTitle: conv.job_id ? `Job #${conv.job_id.slice(0, 8)}` : '',
                    }
                })

                setConversations(mapped)
                if (mapped.length > 0 && !selectedConversation) {
                    setSelectedConversation(mapped[0].id)
                }
            } catch (err) {
                console.error('Failed to fetch conversations:', err)
                setError(err instanceof Error ? err.message : 'Failed to load conversations')
            } finally {
                setLoading(false)
            }
        }

        fetchConversations()
    }, [session])

    // Fetch messages when conversation selected
    useEffect(() => {
        if (!selectedConversation || !(session as any)?.accessToken) return

        async function fetchMessages() {
            setMessagesLoading(true)
            try {
                const res = await fetch(
                    `${API_URL}/api/v1/messages/conversations/${selectedConversation}`,
                    { headers: { Authorization: `Bearer ${(session as any)?.accessToken}` } }
                )

                if (!res.ok) throw new Error(`Failed to load messages (${res.status})`)

                const data: ApiConversationDetail = await res.json()

                const mapped: DisplayMessage[] = (data.messages || []).map((msg) => ({
                    id: msg.id,
                    senderId: msg.is_mine ? 'me' : 'other',
                    content: msg.content,
                    timestamp: msg.created_at
                        ? new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                        : '',
                    read: !!msg.read_at,
                }))

                setMessages(mapped)

                // Mark as read
                await fetch(
                    `${API_URL}/api/v1/messages/conversations/${selectedConversation}/read`,
                    { method: 'POST', headers: { Authorization: `Bearer ${(session as any)?.accessToken}` } }
                ).catch(() => { })

            } catch (err) {
                console.error('Failed to fetch messages:', err)
            } finally {
                setMessagesLoading(false)
            }
        }

        fetchMessages()
    }, [selectedConversation, session])

    // Append incoming WebSocket messages to the list
    useEffect(() => {
        if (wsMessages.length === 0) return
        const latest = wsMessages[wsMessages.length - 1]
        if (!latest) return
        const senderId = latest.sender_id || latest.user_id || ''
        const newMsg: DisplayMessage = {
            id: latest.message_id || `ws-${Date.now()}`,
            senderId: senderId === currentUserId.current ? 'me' : 'other',
            content: latest.content,
            timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            read: false,
        }
        setMessages((prev: DisplayMessage[]) => {
            // Avoid duplicates
            if (prev.some((m: DisplayMessage) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
        })
    }, [wsMessages])

    // Clear WebSocket message buffer when switching conversations
    useEffect(() => {
        clearWsMessages()
    }, [selectedConversation])

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const selectedConvo = conversations.find((c) => c.id === selectedConversation)

    async function handleSend(attachmentUrl?: string, attachmentType?: 'image' | 'file', attachmentName?: string) {
        if ((!message.trim() && !attachmentUrl) || !selectedConversation || sending) return

        const content = message.trim() || (attachmentType === 'image' ? '📷 Image' : '📎 File')
        setMessage('')
        setSending(true)

        // Optimistic update
        const tempMsg: DisplayMessage = {
            id: `temp-${Date.now()}`,
            senderId: 'me',
            content,
            timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            read: false,
            attachment_url: attachmentUrl,
            attachment_type: attachmentType,
            attachment_name: attachmentName,
        }
        setMessages((prev) => [...prev, tempMsg])

        try {
            if (wsConnected && selectedConversation) {
                sendChatMessage(selectedConversation, content, tempMsg.id)
            }

            const res = await fetch(`${API_URL}/api/v1/messages/send`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    conversation_id: selectedConversation,
                    recipient_id: '',
                    content,
                    attachment_url: attachmentUrl,
                }),
            })

            if (!res.ok) throw new Error('Failed to send message')

            const sent = await res.json()
            setMessages((prev) =>
                prev.map((m) => (m.id === tempMsg.id ? { ...m, id: sent.id } : m))
            )
        } catch (err) {
            console.error('Failed to send message:', err)
            setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id))
            setMessage(content)
        } finally {
            setSending(false)
        }
    }

    async function handleFileUpload(file: File, type: 'image' | 'file') {
        if (!selectedConversation) return
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await fetch(`${API_URL}/api/v1/uploads/upload/message_attachment`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${(session as any)?.accessToken}` },
                body: formData,
            })
            if (!res.ok) throw new Error('Upload failed')
            const { url } = await res.json()
            await handleSend(url, type, file.name)
        } catch (err) {
            console.error('Upload failed:', err)
        } finally {
            setUploading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                    <p className="text-lg font-medium text-red-600">{error}</p>
                    <Button className="mt-4" onClick={() => window.location.reload()}>
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="h-[calc(100vh-8rem)] flex gap-6">
            {/* Conversations List */}
            <Card className="w-80 flex-shrink-0 flex flex-col">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Messages
                    </CardTitle>
                    <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search conversations..." className="pl-9" />
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-0">
                    {conversations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No conversations yet</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {conversations.map((convo) => (
                                <button
                                    key={convo.id}
                                    onClick={() => setSelectedConversation(convo.id)}
                                    className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition ${selectedConversation === convo.id ? 'bg-brand-50 dark:bg-brand-500/10' : ''
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                                            <span className="text-lg font-semibold text-brand-600">
                                                {convo.participantInitial}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="font-medium truncate">{convo.participantName}</p>
                                                <span className="text-xs text-muted-foreground">{convo.lastMessageTime}</span>
                                            </div>
                                            {convo.jobTitle && (
                                                <p className="text-xs text-muted-foreground">{convo.jobTitle}</p>
                                            )}
                                            <p className="text-sm text-muted-foreground truncate mt-1">
                                                {convo.lastMessage}
                                            </p>
                                        </div>
                                        {convo.unread > 0 && (
                                            <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center">
                                                {convo.unread}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Chat Area */}
            <Card className="flex-1 flex flex-col">
                {selectedConvo ? (
                    <>
                        <CardHeader className="pb-3 border-b">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                                        <span className="font-semibold text-brand-600">
                                            {selectedConvo.participantInitial}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium">{selectedConvo.participantName}</p>
                                        {selectedConvo.jobTitle && (
                                            <p className="text-sm text-muted-foreground">{selectedConvo.jobTitle}</p>
                                        )}
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-5 h-5" />
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="flex-1 overflow-auto p-4 space-y-4">
                            {messagesLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    <p>No messages yet. Send one to start the conversation!</p>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.senderId === 'me'
                                                ? 'bg-brand-500 text-white rounded-br-md'
                                                : 'bg-slate-100 dark:bg-slate-800 rounded-bl-md'
                                                }`}
                                        >
                                            {msg.attachment_url && msg.attachment_type === 'image' ? (
                                                <img src={msg.attachment_url} alt="Shared image" className="rounded-lg max-w-full max-h-48 mb-1 cursor-pointer" onClick={() => window.open(msg.attachment_url, '_blank')} />
                                            ) : msg.attachment_url ? (
                                                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-lg mb-1 ${msg.senderId === 'me' ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-200 dark:bg-slate-700 hover:opacity-80'} transition`}>
                                                    <FileText className="w-5 h-5 shrink-0" />
                                                    <span className="text-sm truncate flex-1">{msg.attachment_name || 'File'}</span>
                                                    <Download className="w-4 h-4 shrink-0" />
                                                </a>
                                            ) : null}
                                            {(!msg.attachment_url || msg.content !== '📷 Image' && msg.content !== '📎 File') && <p>{msg.content}</p>}
                                            <div
                                                className={`flex items-center justify-end gap-1 mt-1 text-xs ${msg.senderId === 'me' ? 'text-white/70' : 'text-muted-foreground'
                                                    }`}
                                            >
                                                <span>{msg.timestamp}</span>
                                                {msg.senderId === 'me' && <CheckCheck className="w-3 h-3" />}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </CardContent>

                        {/* Typing indicator (shows when WS connected) */}
                        {wsConnected && message.length > 0 && (
                            <div className="px-4 py-1">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className="flex gap-0.5">
                                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                    <span>typing...</span>
                                </div>
                            </div>
                        )}

                        <div className="p-4 border-t">
                            <div className="flex items-center gap-2">
                                <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'file'); e.target.value = '' }} />
                                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'image'); e.target.value = '' }} />
                                <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
                                    <ImageIcon className="w-5 h-5" />
                                </Button>
                                <Input
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                />
                                <Button
                                    onClick={() => handleSend()}
                                    disabled={(!message.trim() && !uploading) || sending}
                                    className="bg-brand-500 hover:bg-brand-600"
                                >
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <CardContent className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">Select a conversation to start messaging</p>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    )
}
