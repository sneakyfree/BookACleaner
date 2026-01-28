'use client'

import { useState, useEffect, useRef } from 'react'
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
} from 'lucide-react'

export default function ClientMessagesPage() {
    const [selectedConversation, setSelectedConversation] = useState<string | null>('1')
    const [message, setMessage] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Mock conversations (client view - talking to cleaners)
    const conversations = [
        {
            id: '1',
            participant: { name: "Maria's Cleaning", role: 'Cleaner', avatar: null, rating: 4.9 },
            lastMessage: 'Perfect! I\'ve received the booking.',
            lastMessageTime: '10 min ago',
            unread: 0,
            jobTitle: 'Deep Clean - Lake House',
        },
        {
            id: '2',
            participant: { name: 'Sparkle Pro', role: 'Cleaner', avatar: null, rating: 4.8 },
            lastMessage: 'Yes, I can do 9am instead.',
            lastMessageTime: '2 hours ago',
            unread: 1,
            jobTitle: 'Airbnb Turnover',
        },
    ]

    const messages = [
        {
            id: '1',
            senderId: 'me',
            content: 'Hi! I saw your profile and I\'d like to book a deep clean for my lake house.',
            timestamp: '10:30 AM',
            read: true,
        },
        {
            id: '2',
            senderId: 'other',
            content: 'Hello! I\'d be happy to help. When were you thinking?',
            timestamp: '10:32 AM',
            read: true,
        },
        {
            id: '3',
            senderId: 'me',
            content: 'Tomorrow at 10am would be ideal. The house is about 2200 sq ft.',
            timestamp: '10:35 AM',
            read: true,
        },
        {
            id: '4',
            senderId: 'other',
            content: 'That works for me! For a deep clean on a 2200 sq ft home, my rate is $180. Does that work for you?',
            timestamp: '10:38 AM',
            read: true,
        },
        {
            id: '5',
            senderId: 'me',
            content: 'Yes, that sounds great! I\'ll book it now.',
            timestamp: '10:40 AM',
            read: true,
        },
        {
            id: '6',
            senderId: 'other',
            content: 'Perfect! I\'ve received the booking.',
            timestamp: '10:42 AM',
            read: true,
        },
    ]

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const selectedConvo = conversations.find((c) => c.id === selectedConversation)

    function handleSend() {
        if (!message.trim()) return
        console.log('Sending:', message)
        setMessage('')
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
                                            {convo.participant.name[0]}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="font-medium truncate">{convo.participant.name}</p>
                                            <span className="text-xs text-muted-foreground">{convo.lastMessageTime}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{convo.jobTitle}</p>
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
                                            {selectedConvo.participant.name[0]}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium">{selectedConvo.participant.name}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span className="text-amber-500 flex items-center">
                                                <Star className="w-3 h-3 fill-current mr-0.5" />
                                                {selectedConvo.participant.rating}
                                            </span>
                                            <span>•</span>
                                            <span>{selectedConvo.jobTitle}</span>
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-5 h-5" />
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="flex-1 overflow-auto p-4 space-y-4">
                            {messages.map((msg) => (
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
                                        <p>{msg.content}</p>
                                        <div
                                            className={`flex items-center justify-end gap-1 mt-1 text-xs ${msg.senderId === 'me' ? 'text-white/70' : 'text-muted-foreground'
                                                }`}
                                        >
                                            <span>{msg.timestamp}</span>
                                            {msg.senderId === 'me' && <CheckCheck className="w-3 h-3" />}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </CardContent>

                        <div className="p-4 border-t">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon">
                                    <Paperclip className="w-5 h-5" />
                                </Button>
                                <Button variant="ghost" size="icon">
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
                                    onClick={handleSend}
                                    disabled={!message.trim()}
                                    className="bg-brand-500 hover:bg-brand-600"
                                >
                                    <Send className="w-4 h-4" />
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
