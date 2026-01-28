'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageCircle, X, Send, Bot, User, Minimize2, Maximize2, Sparkles } from 'lucide-react'
import { useAIChat } from '@/hooks/use-ai'
import { ChatMessage } from '@/lib/api'

interface AIChatAssistantProps {
    role?: 'client' | 'cleaner'
    userContext?: Record<string, any>
    variant?: 'floating' | 'embedded'
    className?: string
}

export function AIChatAssistant({
    role = 'client',
    userContext,
    variant = 'floating',
    className = '',
}: AIChatAssistantProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const chatMutation = useAIChat()

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || chatMutation.isPending) return

        const userMessage: ChatMessage = { role: 'user', content: input.trim() }
        const newMessages = [...messages, userMessage]
        setMessages(newMessages)
        setInput('')

        try {
            const response = await chatMutation.mutateAsync({
                messages: newMessages,
                userContext,
                role,
            })

            if (response.success) {
                setMessages([
                    ...newMessages,
                    { role: 'assistant', content: response.response },
                ])
            }
        } catch (error) {
            setMessages([
                ...newMessages,
                { role: 'assistant', content: "I'm sorry, I'm having trouble connecting. Please try again." },
            ])
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const suggestedQuestions = role === 'client'
        ? [
            "How do I book a cleaning?",
            "What services do you offer?",
            "How does payment work?",
        ]
        : [
            "How do I get more bookings?",
            "How does verification work?",
            "When do I get paid?",
        ]

    // Embedded variant
    if (variant === 'embedded') {
        return (
            <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${className}`}>
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">AI Assistant</h3>
                            <p className="text-xs text-white/80">Powered by GPT-4o</p>
                        </div>
                    </div>
                </div>

                <div className="h-[350px] overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.length === 0 ? (
                        <div className="text-center py-8">
                            <Sparkles className="w-12 h-12 text-violet-500 mx-auto mb-4" />
                            <p className="text-gray-600 mb-4">Hi! How can I help you today?</p>
                            <div className="space-y-2">
                                {suggestedQuestions.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setInput(q)
                                            handleSend()
                                        }}
                                        className="block w-full text-left px-4 py-2 bg-white rounded-lg border hover:bg-gray-50 text-sm text-gray-700"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-4 h-4 text-white" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === 'user'
                                            ? 'bg-violet-600 text-white'
                                            : 'bg-white border shadow-sm text-gray-800'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-gray-600" />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    {chatMutation.isPending && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-white" />
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

                <div className="p-4 border-t bg-white">
                    <div className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your message..."
                            className="flex-1"
                            disabled={chatMutation.isPending}
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || chatMutation.isPending}
                            className="bg-violet-600 hover:bg-violet-700"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // Floating variant
    return (
        <>
            {/* Floating button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50 hover:scale-110"
                >
                    <MessageCircle className="w-6 h-6" />
                </button>
            )}

            {/* Chat window */}
            {isOpen && (
                <div
                    className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border z-50 transition-all duration-300 ${isMinimized ? 'w-72 h-16' : 'w-96 h-[500px]'
                        } ${className}`}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 rounded-t-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <Bot className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">AI Assistant</h3>
                                {!isMinimized && (
                                    <p className="text-xs text-white/80">Ask me anything!</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="p-2 hover:bg-white/10 rounded-lg text-white"
                            >
                                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-lg text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* Messages */}
                            <div className="h-[350px] overflow-y-auto p-4 space-y-4 bg-gray-50">
                                {messages.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Sparkles className="w-12 h-12 text-violet-500 mx-auto mb-4" />
                                        <p className="text-gray-600 mb-4">Hi! How can I help you today?</p>
                                        <div className="space-y-2">
                                            {suggestedQuestions.map((q, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setInput(q)}
                                                    className="block w-full text-left px-4 py-2 bg-white rounded-lg border hover:bg-gray-50 text-sm text-gray-700"
                                                >
                                                    {q}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    messages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            {msg.role === 'assistant' && (
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                                    <Bot className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                            <div
                                                className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === 'user'
                                                        ? 'bg-violet-600 text-white'
                                                        : 'bg-white border shadow-sm text-gray-800'
                                                    }`}
                                            >
                                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                            </div>
                                            {msg.role === 'user' && (
                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-4 h-4 text-gray-600" />
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                                {chatMutation.isPending && (
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center">
                                            <Bot className="w-4 h-4 text-white" />
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
                            <div className="p-4 border-t bg-white rounded-b-2xl">
                                <div className="flex gap-2">
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Type your message..."
                                        className="flex-1"
                                        disabled={chatMutation.isPending}
                                    />
                                    <Button
                                        onClick={handleSend}
                                        disabled={!input.trim() || chatMutation.isPending}
                                        className="bg-violet-600 hover:bg-violet-700"
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    )
}

export default AIChatAssistant
