'use client'

import { Inbox, Search, Calendar, FileText, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Empty State — contextual empty state with illustration and CTA
 * Usage: <EmptyState icon="inbox" title="No messages" action={{ label: "Start a chat", onClick: fn }} />
 */

const ICONS: Record<string, any> = {
    inbox: Inbox,
    search: Search,
    calendar: Calendar,
    file: FileText,
    users: Users,
}

interface EmptyStateProps {
    icon?: string
    title: string
    description?: string
    action?: {
        label: string
        onClick: () => void
    }
    className?: string
}

export function EmptyState({ icon = 'inbox', title, description, action, className = '' }: EmptyStateProps) {
    const Icon = ICONS[icon] || Inbox

    return (
        <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5">
                <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    {description}
                </p>
            )}
            {action && (
                <Button onClick={action.onClick} className="bg-brand-500 hover:bg-brand-600">
                    {action.label}
                </Button>
            )}
        </div>
    )
}

export default EmptyState
