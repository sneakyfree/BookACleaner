'use client'

import { useState } from 'react'
import {
    Newspaper, Plus, Send, Loader2, AlertCircle, Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/auth/api-client'

const feedTypes = ['announcement', 'tip', 'promo', 'feature', 'community', 'update']
const roleOptions = ['client', 'cleaner']

export default function AdminFeedManagerPage() {
    const [form, setForm] = useState({
        type: 'announcement',
        title: '',
        content: '',
        image_url: '',
        cta_text: '',
        cta_url: '',
        target_roles: ['client', 'cleaner'] as string[],
        priority: 50,
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            setLoading(true)
            setError('')
            setSuccess('')
            await apiFetch('/api/v1/feed', {
                method: 'POST',
                body: JSON.stringify({
                    ...form,
                    image_url: form.image_url || null,
                    cta_text: form.cta_text || null,
                    cta_url: form.cta_url || null,
                }),
            })
            setSuccess('Feed item published successfully!')
            setForm(prev => ({ ...prev, title: '', content: '', image_url: '', cta_text: '', cta_url: '' }))
        } catch (err: any) {
            setError(err?.detail || err?.message || 'Failed to create feed item')
        } finally {
            setLoading(false)
        }
    }

    const toggleRole = (role: string) => {
        setForm(prev => ({
            ...prev,
            target_roles: prev.target_roles.includes(role)
                ? prev.target_roles.filter(r => r !== role)
                : [...prev.target_roles, role],
        }))
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Newspaper className="w-7 h-7 text-brand-400" />
                        Feed Manager
                    </h1>
                    <p className="text-white/60 mt-1">Create and publish content to the community feed</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-400 shrink-0" />
                        <p className="text-green-300 text-sm">{success}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white/5 rounded-xl border border-white/10 p-6 space-y-5">
                    {/* Type */}
                    <div>
                        <label className="text-white/60 text-sm font-medium mb-2 block">Type</label>
                        <div className="flex flex-wrap gap-2">
                            {feedTypes.map(t => (
                                <button key={t} type="button" onClick={() => setForm(p => ({ ...p, type: t }))}
                                    className={cn('px-3 py-1.5 rounded-lg text-sm transition-colors capitalize',
                                        form.type === t ? 'bg-brand-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10')}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="text-white/60 text-sm font-medium mb-2 block">Title</label>
                        <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                            required placeholder="Enter feed item title..."
                            className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="text-white/60 text-sm font-medium mb-2 block">Content</label>
                        <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                            required placeholder="Write your feed content..." rows={4}
                            className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none" />
                    </div>

                    {/* CTA */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-white/60 text-sm font-medium mb-2 block">CTA Button Text</label>
                            <input type="text" value={form.cta_text} onChange={e => setForm(p => ({ ...p, cta_text: e.target.value }))}
                                placeholder="e.g. Learn More"
                                className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
                        </div>
                        <div>
                            <label className="text-white/60 text-sm font-medium mb-2 block">CTA URL</label>
                            <input type="url" value={form.cta_url} onChange={e => setForm(p => ({ ...p, cta_url: e.target.value }))}
                                placeholder="https://..."
                                className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
                        </div>
                    </div>

                    {/* Target audience */}
                    <div>
                        <label className="text-white/60 text-sm font-medium mb-2 block">Target Audience</label>
                        <div className="flex gap-3">
                            {roleOptions.map(role => (
                                <button key={role} type="button" onClick={() => toggleRole(role)}
                                    className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize',
                                        form.target_roles.includes(role)
                                            ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                                            : 'bg-white/5 text-white/40 border border-white/10')}>
                                    {role}s
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="text-white/60 text-sm font-medium mb-2 block">
                            Priority: {form.priority}
                        </label>
                        <input type="range" min="0" max="100" value={form.priority}
                            onChange={e => setForm(p => ({ ...p, priority: Number(e.target.value) }))}
                            className="w-full" />
                    </div>

                    {/* Submit */}
                    <button type="submit" disabled={loading || !form.title || !form.content}
                        className="w-full px-6 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Publish to Feed
                    </button>
                </form>
            </div>
        </div>
    )
}
