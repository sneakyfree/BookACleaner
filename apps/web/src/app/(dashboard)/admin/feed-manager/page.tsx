'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Newspaper, Plus, Send, Loader2, AlertCircle, Check, Pencil, Trash2, X, Heart, Eye
} from 'lucide-react'
import { cn, errText } from '@/lib/utils'
import { apiFetch } from '@/lib/auth/api-client'

const feedTypes = ['announcement', 'tip', 'promo', 'feature', 'community', 'update']
const roleOptions = ['client', 'cleaner']

interface FeedItem {
    id: string
    type: string
    title: string
    content: string
    image_url?: string | null
    cta_text?: string | null
    cta_url?: string | null
    target_roles?: string[]
    priority?: number
    likes?: number
    views?: number
}

const emptyForm = {
    type: 'announcement',
    title: '',
    content: '',
    image_url: '',
    cta_text: '',
    cta_url: '',
    target_roles: ['client', 'cleaner'] as string[],
    priority: 50,
}

export default function AdminFeedManagerPage() {
    const [form, setForm] = useState({ ...emptyForm })
    const [editingId, setEditingId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const [items, setItems] = useState<FeedItem[]>([])
    const [listLoading, setListLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const loadItems = useCallback(async () => {
        try {
            setListLoading(true)
            const data = await apiFetch('/api/v1/feed?limit=50')
            setItems((data?.items || []) as FeedItem[])
        } catch (err: any) {
            setError(errText(err, 'Failed to load feed items'))
        } finally {
            setListLoading(false)
        }
    }, [])

    useEffect(() => { loadItems() }, [loadItems])

    const resetForm = () => {
        setForm({ ...emptyForm })
        setEditingId(null)
    }

    const startEdit = (item: FeedItem) => {
        setEditingId(item.id)
        setForm({
            type: item.type || 'announcement',
            title: item.title || '',
            content: item.content || '',
            image_url: item.image_url || '',
            cta_text: item.cta_text || '',
            cta_url: item.cta_url || '',
            target_roles: item.target_roles?.length ? item.target_roles : ['client', 'cleaner'],
            priority: item.priority ?? 50,
        })
        setSuccess('')
        setError('')
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setLoading(true)
            setError('')
            setSuccess('')
            const body = {
                ...form,
                image_url: form.image_url || null,
                cta_text: form.cta_text || null,
                cta_url: form.cta_url || null,
            }
            if (editingId) {
                await apiFetch(`/api/v1/feed/${editingId}`, { method: 'PATCH', body: JSON.stringify(body) })
                setSuccess('Feed item updated successfully!')
            } else {
                await apiFetch('/api/v1/feed', { method: 'POST', body: JSON.stringify(body) })
                setSuccess('Feed item published successfully!')
            }
            resetForm()
            await loadItems()
        } catch (err: any) {
            setError(errText(err, 'Failed to save feed item'))
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (typeof window !== 'undefined' && !window.confirm('Delete this feed item? This cannot be undone.')) return
        try {
            setDeletingId(id)
            setError('')
            await apiFetch(`/api/v1/feed/${id}`, { method: 'DELETE' })
            if (editingId === id) resetForm()
            setSuccess('Feed item deleted.')
            await loadItems()
        } catch (err: any) {
            setError(errText(err, 'Failed to delete feed item'))
        } finally {
            setDeletingId(null)
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
                    <p className="text-white/60 mt-1">Create, edit, and remove content in the community feed</p>
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
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            {editingId ? <Pencil className="w-4 h-4 text-brand-400" /> : <Plus className="w-4 h-4 text-brand-400" />}
                            {editingId ? 'Edit feed item' : 'New feed item'}
                        </h2>
                        {editingId && (
                            <button type="button" onClick={resetForm}
                                className="text-white/50 hover:text-white text-sm flex items-center gap-1">
                                <X className="w-4 h-4" /> Cancel edit
                            </button>
                        )}
                    </div>

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
                        {editingId ? 'Save Changes' : 'Publish to Feed'}
                    </button>
                </form>

                {/* Existing items */}
                <div className="mt-10">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Newspaper className="w-5 h-5 text-brand-400" />
                        Published items <span className="text-white/40 text-sm font-normal">({items.length})</span>
                    </h2>

                    {listLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="py-10 text-center text-white/40 bg-white/5 rounded-xl border border-white/10">
                            No feed items yet. Publish one above.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map(item => (
                                <div key={item.id}
                                    className={cn('bg-white/5 rounded-xl border p-4 flex items-start gap-4',
                                        editingId === item.id ? 'border-brand-500/50' : 'border-white/10')}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-brand-500/20 text-brand-300 capitalize">{item.type}</span>
                                            <span className="text-white/40 text-xs">priority {item.priority ?? 0}</span>
                                            <span className="text-white/40 text-xs flex items-center gap-1"><Heart className="w-3 h-3" />{item.likes ?? 0}</span>
                                            <span className="text-white/40 text-xs flex items-center gap-1"><Eye className="w-3 h-3" />{item.views ?? 0}</span>
                                        </div>
                                        <p className="text-white font-medium truncate">{item.title}</p>
                                        <p className="text-white/50 text-sm line-clamp-2">{item.content}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => startEdit(item)} title="Edit"
                                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 transition-colors">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} title="Delete"
                                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50">
                                            {deletingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
