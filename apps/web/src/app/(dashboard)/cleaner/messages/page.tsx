'use client'

import { useState, useEffect, useRef } from 'react'
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
  Loader2,
  AlertCircle,
  FileText,
  Download,
} from 'lucide-react'
import { useRealtimeChat } from '@/hooks/use-websocket'
import { apiFetch } from '@/lib/auth/api-client'

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
  other_participant?: {
    id: string
    name?: string
    avatar_url?: string
  } | null
}

interface ApiMessage {
  id: string
  content: string
  created_at?: string
  read_at?: string
  sender?: { id: string; name?: string; avatar?: string }
  is_mine: boolean
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

export default function CleanerMessagesPage() {
  const { data: session } = useSession()
  const [conversations, setConversations] = useState<DisplayConversation[]>([])
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(() =>
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('conversation')
      : null
  )
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

  // Populate current user id from session for WS message comparison
  useEffect(() => {
    if ((session as any)?.user?.id) {
      currentUserId.current = (session as any).user.id
    }
  }, [session])

  // Fetch conversations
  useEffect(() => {
    async function fetchConversations() {
      try {
        setError(null)
        const data: ApiConversation[] = await apiFetch('/api/v1/messages/conversations')

        const timeAgo = (dateStr?: string) => {
          if (!dateStr) return ''
          const diff = Date.now() - new Date(dateStr).getTime()
          const mins = Math.floor(diff / 60000)
          if (mins < 1) return 'Just now'
          if (mins < 60) return `${mins} min ago`
          const hours = Math.floor(mins / 60)
          if (hours < 24) return `${hours}h ago`
          const days = Math.floor(hours / 24)
          if (days < 7) return `${days}d ago`
          return 'Over a week ago'
        }

        const mapped: DisplayConversation[] = data.map((conv) => {
          const name = conv.other_participant?.name || 'Conversation'
          return {
            id: conv.id,
            participantName: name,
            participantInitial: name.charAt(0).toUpperCase(),
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
  }, [])

  // Fetch messages when conversation selected
  useEffect(() => {
    if (!selectedConversation) return

    async function fetchMessages() {
      setMessagesLoading(true)
      try {
        const data = await apiFetch(`/api/v1/messages/conversations/${selectedConversation}`)

        const mapped: DisplayMessage[] = (data.messages || []).map((msg: ApiMessage) => ({
          id: msg.id,
          senderId: msg.is_mine ? 'me' : 'other',
          content: msg.content,
          timestamp: msg.created_at
            ? new Date(msg.created_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })
            : '',
          read: !!msg.read_at,
        }))

        setMessages(mapped)

        // Mark as read
        apiFetch(`/api/v1/messages/conversations/${selectedConversation}/read`, {
          method: 'POST',
        }).catch(() => {})
      } catch (err) {
        console.error('Failed to fetch messages:', err)
      } finally {
        setMessagesLoading(false)
      }
    }

    fetchMessages()
  }, [selectedConversation])

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const selectedConvo = conversations.find((c) => c.id === selectedConversation)

  async function handleSend(
    attachmentUrl?: string,
    attachmentType?: 'image' | 'file',
    attachmentName?: string
  ) {
    if ((!message.trim() && !attachmentUrl) || !selectedConversation || sending) return

    const content = message.trim() || (attachmentType === 'image' ? '📷 Image' : '📎 File')
    setMessage('')
    setSending(true)

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

      const sent = await apiFetch('/api/v1/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: selectedConversation,
          recipient_id: '',
          content,
          attachment_url: attachmentUrl,
        }),
      })

      setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? { ...m, id: sent.id } : m)))
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
      const fd = new FormData()
      fd.append('file', file)
      const { url } = await apiFetch('/api/v1/uploads/upload/message_attachment', {
        method: 'POST',
        body: fd,
        headers: {},
      })
      await handleSend(url, type, file.name)
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-brand-600 h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="text-lg font-medium text-red-600">{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Conversations List */}
      <Card className="flex w-80 flex-shrink-0 flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
          <div className="relative mt-2">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input placeholder="Search conversations..." className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          {conversations.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => setSelectedConversation(convo.id)}
                  className={`w-full p-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    selectedConversation === convo.id ? 'bg-brand-50 dark:bg-brand-500/10' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="bg-brand-100 dark:bg-brand-500/20 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full">
                      <span className="text-brand-600 text-lg font-semibold">
                        {convo.participantInitial}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate font-medium">{convo.participantName}</p>
                        <span className="text-muted-foreground text-xs">
                          {convo.lastMessageTime}
                        </span>
                      </div>
                      {convo.jobTitle && (
                        <p className="text-muted-foreground text-xs">{convo.jobTitle}</p>
                      )}
                      <p className="text-muted-foreground mt-1 truncate text-sm">
                        {convo.lastMessage}
                      </p>
                    </div>
                    {convo.unread > 0 && (
                      <span className="bg-brand-500 flex h-5 w-5 items-center justify-center rounded-full text-xs text-white">
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
      <Card className="flex flex-1 flex-col">
        {selectedConvo ? (
          <>
            <CardHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-100 dark:bg-brand-500/20 flex h-10 w-10 items-center justify-center rounded-full">
                    <span className="text-brand-600 font-semibold">
                      {selectedConvo.participantInitial}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{selectedConvo.participantName}</p>
                    {selectedConvo.jobTitle && (
                      <p className="text-muted-foreground text-sm">{selectedConvo.jobTitle}</p>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-4 overflow-auto p-4">
              {messagesLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="text-brand-600 h-6 w-6 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-muted-foreground flex h-full items-center justify-center">
                  <p>No messages yet. Send one to start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        msg.senderId === 'me'
                          ? 'bg-brand-500 rounded-br-md text-white'
                          : 'rounded-bl-md bg-slate-100 dark:bg-slate-800'
                      }`}
                    >
                      {msg.attachment_url && msg.attachment_type === 'image' ? (
                        <img
                          src={msg.attachment_url}
                          alt="Shared image"
                          className="mb-1 max-h-48 max-w-full cursor-pointer rounded-lg"
                          onClick={() => window.open(msg.attachment_url, '_blank')}
                        />
                      ) : msg.attachment_url ? (
                        <a
                          href={msg.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mb-1 flex items-center gap-2 rounded-lg p-2 ${msg.senderId === 'me' ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-200 hover:opacity-80 dark:bg-slate-700'} transition`}
                        >
                          <FileText className="h-5 w-5 shrink-0" />
                          <span className="flex-1 truncate text-sm">
                            {msg.attachment_name || 'File'}
                          </span>
                          <Download className="h-4 w-4 shrink-0" />
                        </a>
                      ) : null}
                      {(!msg.attachment_url ||
                        (msg.content !== '📷 Image' && msg.content !== '📎 File')) && (
                        <p>{msg.content}</p>
                      )}
                      <div
                        className={`mt-1 flex items-center justify-end gap-1 text-xs ${
                          msg.senderId === 'me' ? 'text-white/70' : 'text-muted-foreground'
                        }`}
                      >
                        <span>{msg.timestamp}</span>
                        {msg.senderId === 'me' && <CheckCheck className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            <div className="border-t p-4">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileUpload(f, 'file')
                    e.target.value = ''
                  }}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileUpload(f, 'image')
                    e.target.value = ''
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Paperclip className="h-5 w-5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading}
                >
                  <ImageIcon className="h-5 w-5" />
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
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <CardContent className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageSquare className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
              <p className="text-muted-foreground">Select a conversation to start messaging</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
