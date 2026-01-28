'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

/**
 * Accessible Tooltip Component
 * Implements WAI-ARIA tooltip pattern
 */

interface TooltipProps {
    content: React.ReactNode
    children: React.ReactNode
    position?: 'top' | 'bottom' | 'left' | 'right'
    delay?: number
    className?: string
}

export function Tooltip({
    content,
    children,
    position = 'top',
    delay = 200,
    className,
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const tooltipId = useRef(`tooltip-${Math.random().toString(36).substr(2, 9)}`)

    const showTooltip = () => {
        timeoutRef.current = setTimeout(() => setIsVisible(true), delay)
    }

    const hideTooltip = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        setIsVisible(false)
    }

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [])

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    }

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-700 border-x-transparent border-b-transparent',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-700 border-x-transparent border-t-transparent',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-700 border-y-transparent border-r-transparent',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-700 border-y-transparent border-l-transparent',
    }

    return (
        <div className="relative inline-block">
            <div
                onMouseEnter={showTooltip}
                onMouseLeave={hideTooltip}
                onFocus={showTooltip}
                onBlur={hideTooltip}
                aria-describedby={isVisible ? tooltipId.current : undefined}
            >
                {children}
            </div>

            {isVisible && (
                <div
                    id={tooltipId.current}
                    role="tooltip"
                    className={cn(
                        'absolute z-50 px-3 py-2 text-sm text-white bg-slate-700 rounded-lg shadow-lg',
                        'whitespace-nowrap animate-fade-in',
                        positionClasses[position],
                        className
                    )}
                >
                    {content}
                    <div
                        className={cn(
                            'absolute w-0 h-0 border-4',
                            arrowClasses[position]
                        )}
                    />
                </div>
            )}
        </div>
    )
}

// ============================================
// Info Tooltip (with icon)
// ============================================

import { Info } from 'lucide-react'

interface InfoTooltipProps {
    content: React.ReactNode
    position?: 'top' | 'bottom' | 'left' | 'right'
    iconClassName?: string
}

export function InfoTooltip({ content, position = 'top', iconClassName }: InfoTooltipProps) {
    return (
        <Tooltip content={content} position={position}>
            <button
                type="button"
                className={cn(
                    'inline-flex items-center justify-center',
                    'text-white/40 hover:text-white/60 transition-colors',
                    iconClassName
                )}
                aria-label="More information"
            >
                <Info className="w-4 h-4" />
            </button>
        </Tooltip>
    )
}

// ============================================
// Popover Component
// ============================================

interface PopoverProps {
    trigger: React.ReactNode
    content: React.ReactNode
    position?: 'top' | 'bottom' | 'left' | 'right'
    className?: string
}

export function Popover({ trigger, content, position = 'bottom', className }: PopoverProps) {
    const [isOpen, setIsOpen] = useState(false)
    const popoverRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    }

    return (
        <div ref={popoverRef} className="relative inline-block">
            <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

            {isOpen && (
                <div
                    className={cn(
                        'absolute z-50 bg-slate-800 rounded-lg shadow-xl border border-white/10',
                        'animate-fade-in',
                        positionClasses[position],
                        className
                    )}
                >
                    {content}
                </div>
            )}
        </div>
    )
}

// ============================================
// Dropdown Menu
// ============================================

interface DropdownItem {
    label: string
    onClick: () => void
    icon?: React.ReactNode
    disabled?: boolean
    danger?: boolean
}

interface DropdownMenuProps {
    trigger: React.ReactNode
    items: DropdownItem[]
    className?: string
}

export function DropdownMenu({ trigger, items, className }: DropdownMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    return (
        <div ref={menuRef} className="relative inline-block">
            <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

            {isOpen && (
                <div
                    className={cn(
                        'absolute right-0 top-full mt-2 min-w-[160px] z-50',
                        'bg-slate-800 rounded-lg shadow-xl border border-white/10',
                        'py-1 animate-fade-in',
                        className
                    )}
                    role="menu"
                >
                    {items.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                if (!item.disabled) {
                                    item.onClick()
                                    setIsOpen(false)
                                }
                            }}
                            disabled={item.disabled}
                            className={cn(
                                'w-full px-4 py-2 text-left text-sm flex items-center gap-2',
                                'transition-colors',
                                item.disabled && 'opacity-50 cursor-not-allowed',
                                item.danger
                                    ? 'text-red-400 hover:bg-red-500/10'
                                    : 'text-white/80 hover:bg-white/5'
                            )}
                            role="menuitem"
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
