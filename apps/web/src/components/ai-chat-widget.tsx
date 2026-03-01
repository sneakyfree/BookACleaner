'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    X,
    Send,
    Loader2,
    Sparkles,
    User,
    Bot,
    Minimize2
} from 'lucide-react'
import { apiFetch } from '@/lib/auth/api-client'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

export function AIChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Hi! I'm your BookACleaner AI assistant. How can I help you today? I can help with booking cleaners, answering questions, or getting estimates."
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Lock body scroll when chat is open on mobile
    useEffect(() => {
        const isMobile = window.innerWidth < 768
        if (isOpen && isMobile) {
            document.body.style.overflow = 'hidden'
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    async function handleSend() {
        if (!input.trim() || isLoading) return

        const userMessage: Message = { role: 'user', content: input }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            const data = await apiFetch('/api/v1/ai/chat', {
                method: 'POST',
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    role: 'client'
                }),
            })
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.response
            }])
        } catch (error) {
            console.error('Chat error:', error)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm having trouble connecting right now. Please check your internet connection and try again."
            }])
        } finally {
            setIsLoading(false)
        }
    }

    function handleKeyPress(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 px-3 py-3 sm:px-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 touch-manipulation"
                style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
                aria-label="Open AI Assistant"
            >
                <Sparkles className="w-5 h-5" />
                {/* Hide text label on small screens to save space */}
                <span className="font-medium hidden sm:inline">AI Assistant</span>
            </button>
        )
    }

    return (
        <>
            {/* Desktop: floating panel. Mobile: full-screen overlay */}
            <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 sm:w-[380px] sm:h-[520px] bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl sm:border sm:border-slate-200 sm:dark:border-slate-700 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white safe-area-top">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        <span className="font-semibold">AI Assistant</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-white/20 rounded-lg transition touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                            aria-label="Minimize chat"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-white/20 rounded-lg transition touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                            aria-label="Close chat"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user'
                                ? 'bg-brand-100 text-brand-600'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}>
                                {message.role === 'user' ? (
                                    <User className="w-4 h-4" />
                                ) : (
                                    <Bot className="w-4 h-4" />
                                )}
                            </div>
                            <div className={`max-w-[80%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl ${message.role === 'user'
                                ? 'bg-brand-500 text-white rounded-tr-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                                }`}>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {message.content}
                                </p>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-700" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
                    <div className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Ask me anything..."
                            disabled={isLoading}
                            className="flex-1 h-11"
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="bg-brand-500 hover:bg-brand-600 min-w-[44px] min-h-[44px] touch-manipulation"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                        Powered by OpenAI GPT-4
                    </p>
                </div>
            </div>
        </>
    )
}
