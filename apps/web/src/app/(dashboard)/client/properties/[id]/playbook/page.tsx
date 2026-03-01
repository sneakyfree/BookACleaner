'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Book, Save, Plus, Trash2, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/auth/api-client'
import { useQuery } from '@tanstack/react-query'

/**
 * Property Playbook Editor — G6
 * Clients can create detailed instructions for cleaners per property
 */

interface PlaybookSection {
    id: string
    title: string
    content: string
}

const defaultSections: PlaybookSection[] = [
    { id: 's1', title: 'Access Instructions', content: '' },
    { id: 's2', title: 'Pet Information', content: '' },
    { id: 's3', title: 'Special Cleaning Areas', content: '' },
    { id: 's4', title: 'Supply Notes', content: '' },
    { id: 's5', title: 'Airbnb Turnover Checklist', content: '' },
]

export default function PropertyPlaybookPage() {
    const params = useParams()
    const propertyId = params?.id as string
    const [sections, setSections] = useState<PlaybookSection[]>(defaultSections)
    const [saved, setSaved] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
    const initialized = useRef(false)

    // Load playbook from API
    const { data: playbookData } = useQuery({
        queryKey: ['playbook', propertyId],
        queryFn: () => apiFetch(`/api/v1/properties/${propertyId}/playbook`),
        enabled: !!propertyId,
    })

    // Initialize sections from API data
    useEffect(() => {
        if (playbookData && !initialized.current) {
            initialized.current = true
            if (playbookData.sections && playbookData.sections.length > 0) {
                setSections(playbookData.sections)
            }
        }
    }, [playbookData])

    const updateSection = (id: string, field: 'title' | 'content', value: string) => {
        setSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
        setSaved(false)
        // Debounced auto-save
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
        autoSaveTimer.current = setTimeout(() => { doSave() }, 800)
    }

    const addSection = () => {
        setSections(prev => [...prev, { id: `s${Date.now()}`, title: 'New Section', content: '' }])
        setSaved(false)
    }

    const removeSection = (id: string) => {
        setSections(prev => prev.filter(s => s.id !== id))
        setSaved(false)
        // Auto-save after removal
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
        autoSaveTimer.current = setTimeout(() => { doSave() }, 800)
    }

    const doSave = useCallback(async () => {
        setSaving(true)
        setError(null)
        try {
            await apiFetch(`/api/v1/properties/${propertyId}/playbook`, {
                method: 'PUT',
                body: JSON.stringify({ sections }),
            })
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }, [propertyId, sections])

    const handleSave = () => {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
        doSave()
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Book className="w-7 h-7 text-brand-400" />
                            Property Playbook
                        </h1>
                        <p className="text-white/60 mt-1">Detailed cleaning instructions for your property</p>
                    </div>
                    <button onClick={handleSave}
                        className={cn('px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2',
                            saved ? 'bg-green-600 text-white' : 'bg-brand-600 hover:bg-brand-500 text-white')}>
                        {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save Playbook</>}
                    </button>
                </div>

                <div className="space-y-4">
                    {sections.map((section, idx) => (
                        <div key={section.id} className="bg-white/5 rounded-xl border border-white/10 p-5">
                            <div className="flex items-center justify-between mb-3">
                                <input
                                    value={section.title}
                                    onChange={e => updateSection(section.id, 'title', e.target.value)}
                                    className="text-white font-semibold bg-transparent border-none focus:outline-none focus:ring-0 text-lg w-full"
                                    placeholder="Section Title"
                                />
                                <button onClick={() => removeSection(section.id)}
                                    className="p-2 text-white/30 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <textarea
                                value={section.content}
                                onChange={e => updateSection(section.id, 'content', e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white/80 text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none min-h-[100px]"
                                placeholder="Add cleaning instructions, notes, or checklists..."
                                rows={4}
                            />
                        </div>
                    ))}
                </div>

                <button onClick={addSection}
                    className="mt-4 w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-white/40 hover:text-white/60 hover:border-white/20 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Section
                </button>
            </div>
        </div>
    )
}
