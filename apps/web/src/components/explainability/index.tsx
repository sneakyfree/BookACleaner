'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Info, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 4-Layer Explainability Components
 * Implements DNA Strand's Explanatory Voice chromosome
 */

interface PriceComponent {
    name: string
    description: string
    amount: number
    is_discount?: boolean
    formula?: string
}

interface ExplanationFactor {
    name: string
    description: string
    impact: 'positive' | 'negative' | 'neutral'
    weight: number
    value?: any
    source?: string
}

interface Explanation {
    client_summary: string
    client_factors: string[]
    admin_summary: string
    admin_factors: ExplanationFactor[]
    technical_summary?: string
    price_components?: PriceComponent[]
    final_amount?: number
}

// ============================================
// Client View - Simple, friendly explanation
// ============================================

interface ClientExplanationProps {
    explanation: Explanation
    className?: string
}

export function ClientExplanation({ explanation, className }: ClientExplanationProps) {
    return (
        <div className={cn('rounded-lg bg-white/5 border border-white/10 p-4', className)}>
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <Info className="w-4 h-4 text-brand-400" />
                </div>
                <div className="flex-1">
                    <h4 className="text-white font-medium mb-1">{explanation.client_summary}</h4>
                    <ul className="space-y-1">
                        {explanation.client_factors.map((factor, idx) => (
                            <li key={idx} className="text-white/60 text-sm flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-brand-400" />
                                {factor}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}

// ============================================
// Admin View - Detailed breakdown
// ============================================

interface AdminExplanationProps {
    explanation: Explanation
    className?: string
}

export function AdminExplanation({ explanation, className }: AdminExplanationProps) {
    const [expanded, setExpanded] = useState(false)

    return (
        <div className={cn('rounded-lg bg-white/5 border border-white/10', className)}>
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-4 text-left"
            >
                <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-white/40" />
                    <span className="text-white font-medium">Decision Analysis</span>
                </div>
                {expanded ? (
                    <ChevronUp className="w-5 h-5 text-white/40" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-white/40" />
                )}
            </button>

            {expanded && (
                <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-4">
                    <p className="text-white/70 text-sm">{explanation.admin_summary}</p>

                    {/* Factor breakdown */}
                    <div className="space-y-2">
                        <h5 className="text-white/50 text-xs uppercase tracking-wider">Factors</h5>
                        {explanation.admin_factors.map((factor, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-2 rounded bg-white/5"
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className={cn(
                                            'w-2 h-2 rounded-full',
                                            factor.impact === 'positive' && 'bg-green-500',
                                            factor.impact === 'negative' && 'bg-red-500',
                                            factor.impact === 'neutral' && 'bg-gray-500'
                                        )}
                                    />
                                    <span className="text-white/80 text-sm">{factor.description}</span>
                                </div>
                                <span className="text-white/50 text-xs">
                                    {(factor.weight * 100).toFixed(0)}%
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Technical details */}
                    {explanation.technical_summary && (
                        <div className="p-2 rounded bg-white/5 font-mono text-xs text-white/50">
                            {explanation.technical_summary}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ============================================
// Price Breakdown Popover
// ============================================

interface PriceBreakdownProps {
    components: PriceComponent[]
    finalAmount: number
    className?: string
}

export function PriceBreakdown({ components, finalAmount, className }: PriceBreakdownProps) {
    const [showDetails, setShowDetails] = useState(false)

    return (
        <div className={cn('relative inline-block', className)}>
            <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1"
            >
                <Info className="w-4 h-4" />
                Why this price?
            </button>

            {showDetails && (
                <div className="absolute z-50 top-full mt-2 left-0 w-80 rounded-lg bg-slate-800 border border-white/10 shadow-xl p-4">
                    <h4 className="text-white font-medium mb-3">Price Breakdown</h4>

                    <div className="space-y-2">
                        {components.map((component, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between text-sm"
                            >
                                <div>
                                    <span className="text-white/80">{component.name}</span>
                                    <p className="text-white/40 text-xs">{component.description}</p>
                                </div>
                                <span
                                    className={cn(
                                        'font-medium',
                                        component.is_discount ? 'text-green-400' : 'text-white'
                                    )}
                                >
                                    {component.is_discount ? '-' : ''}${Math.abs(component.amount).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                        <span className="text-white font-medium">Total</span>
                        <span className="text-xl font-bold text-brand-400">
                            ${finalAmount.toFixed(2)}
                        </span>
                    </div>

                    <button
                        onClick={() => setShowDetails(false)}
                        className="mt-3 w-full text-center text-white/50 text-xs hover:text-white/70"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    )
}

// ============================================
// Contradiction Warning
// ============================================

interface Contradiction {
    id: string
    severity: 'info' | 'warning' | 'error' | 'blocker'
    field1: string
    field2: string
    message: string
    suggestion?: string
}

interface ContradictionWarningProps {
    contradictions: Contradiction[]
    className?: string
}

export function ContradictionWarning({ contradictions, className }: ContradictionWarningProps) {
    if (contradictions.length === 0) return null

    const blockers = contradictions.filter(c => c.severity === 'blocker')
    const warnings = contradictions.filter(c => c.severity === 'warning' || c.severity === 'error')
    const infos = contradictions.filter(c => c.severity === 'info')

    return (
        <div className={cn('space-y-2', className)}>
            {blockers.map(c => (
                <div key={c.id} className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-red-400 font-medium">{c.message}</p>
                            {c.suggestion && (
                                <p className="text-red-400/70 text-sm mt-1">{c.suggestion}</p>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {warnings.map(c => (
                <div key={c.id} className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-amber-400">{c.message}</p>
                            {c.suggestion && (
                                <p className="text-amber-400/70 text-sm mt-1">{c.suggestion}</p>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {infos.map(c => (
                <div key={c.id} className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
                    <div className="flex items-start gap-2">
                        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-blue-300">{c.message}</p>
                            {c.suggestion && (
                                <p className="text-blue-300/70 text-sm mt-1">{c.suggestion}</p>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

// Export all components
export { type Explanation, type ExplanationFactor, type PriceComponent, type Contradiction }
