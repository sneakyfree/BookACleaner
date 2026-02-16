'use client'

import { Brain, Zap, Clock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * AI Schedule Suggestions Card — P6
 * Shows top AI-generated schedule optimization suggestions on the cleaner dashboard
 */

interface Suggestion {
    id: string
    title: string
    description: string
    impact: string
    confidence: number
}

const mockSuggestions: Suggestion[] = [
    { id: 's1', title: 'Fill Tuesday 2–4 PM gap', description: 'Take the Standard Clean at 456 Elm St — it\'s 5 min from your next job.', impact: '+$120 revenue', confidence: 0.92 },
    { id: 's2', title: 'Swap Wednesday route order', description: 'Start with Rivera Apartment instead of Johnson — saves 18 min drive time.', impact: '-18 min commute', confidence: 0.87 },
    { id: 's3', title: 'Accept recurring Friday slot', description: 'Chen House needs weekly cleaning — matches your availability perfectly.', impact: '+$480/mo recurring', confidence: 0.95 },
]

export function AISuggestionsCard() {
    return (
        <div className="bg-white/5 rounded-xl border border-white/10 p-5">
            <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-brand-400" />
                <h3 className="text-white font-semibold">AI Suggestions</h3>
            </div>
            <div className="space-y-3">
                {mockSuggestions.map(s => (
                    <div key={s.id} className="bg-black/20 rounded-lg p-3 border border-white/5 hover:border-brand-500/30 transition-colors group">
                        <div className="flex items-start justify-between mb-1">
                            <p className="text-white text-sm font-medium">{s.title}</p>
                            <span className="text-brand-400 text-xs font-medium whitespace-nowrap ml-2">{s.impact}</span>
                        </div>
                        <p className="text-white/50 text-xs mb-2">{s.description}</p>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <Zap className="w-3 h-3 text-brand-400" />
                                <span className="text-white/40 text-xs">{Math.round(s.confidence * 100)}% confident</span>
                            </div>
                            <button className="text-brand-400 hover:text-brand-300 text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                Apply <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
