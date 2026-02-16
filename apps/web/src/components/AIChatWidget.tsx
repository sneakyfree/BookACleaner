'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './AIChatWidget.module.css';

interface Message {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const QUICK_PROMPTS = [
    'How does booking work?',
    'What are your prices?',
    'How do I become a cleaner?',
    'Is there a satisfaction guarantee?',
];

export default function AIChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            type: 'assistant',
            content: 'Hi! 👋 I\'m your BookACleaner assistant. Ask me about booking, pricing, becoming a cleaner, or anything else!',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (content: string) => {
        if (!content.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: content.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: content }),
            });

            const data = await response.json();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                content: data.response || 'I can help with booking, pricing, becoming a cleaner, and more. What would you like to know?',
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                content: 'Connection issue. Please try again.',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    return (
        <>
            <button
                className={`${styles.fab} ${isOpen ? styles.hidden : ''}`}
                onClick={() => setIsOpen(true)}
                aria-label="Open AI Chat"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className={styles.fabBadge}>AI</span>
            </button>

            {isOpen && (
                <div className={styles.panel}>
                    <div className={styles.header}>
                        <div className={styles.headerContent}>
                            <div className={styles.avatar}>🧹</div>
                            <div>
                                <h3>BookACleaner</h3>
                                <span className={styles.status}>Online</span>
                            </div>
                        </div>
                        <button className={styles.close} onClick={() => setIsOpen(false)}>✕</button>
                    </div>

                    <div className={styles.messages}>
                        {messages.map(msg => (
                            <div key={msg.id} className={`${styles.message} ${styles[msg.type]}`}>
                                <div className={styles.messageContent}>{msg.content}</div>
                                <span className={styles.time}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                        {isLoading && (
                            <div className={`${styles.message} ${styles.assistant}`}>
                                <div className={styles.typing}>
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className={styles.prompts}>
                        {QUICK_PROMPTS.map((prompt, i) => (
                            <button key={i} className={styles.prompt} onClick={() => sendMessage(prompt)} disabled={isLoading}>
                                {prompt}
                            </button>
                        ))}
                    </div>

                    <form className={styles.inputForm} onSubmit={handleSubmit}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about cleaning services..."
                            className={styles.input}
                            disabled={isLoading}
                        />
                        <button type="submit" className={styles.send} disabled={isLoading || !input.trim()}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}
