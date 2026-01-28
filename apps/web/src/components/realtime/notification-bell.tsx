'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, X, Check, CheckCheck, Trash2, Calendar, MessageCircle, Briefcase, Star, AlertCircle } from 'lucide-react'
import { useNotifications } from '@/hooks/use-websocket'
import { formatDistanceToNow } from 'date-fns'

interface NotificationBellProps {
    className?: string
}

const notificationIcons: Record<string, React.ReactNode> = {
    booking: <Calendar className="w-4 h-4 text-blue-600" />,
    message: <MessageCircle className="w-4 h-4 text-green-600" />,
    job: <Briefcase className="w-4 h-4 text-orange-600" />,
    review: <Star className="w-4 h-4 text-yellow-600" />,
    alert: <AlertCircle className="w-4 h-4 text-red-600" />,
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false)
    const { notifications, unreadCount, markAsRead, clearAll, isConnected } = useNotifications()

    return (
        <div className={`relative ${className}`}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
                {!isConnected && (
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-yellow-500 rounded-full" />
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border z-50 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                            <div>
                                <h3 className="font-semibold text-gray-900">Notifications</h3>
                                <p className="text-xs text-gray-500">
                                    {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {notifications.length > 0 && (
                                    <button
                                        onClick={clearAll}
                                        className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                        Clear all
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-gray-200 rounded"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="py-12 text-center text-gray-500">
                                    <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                                    <p>No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notification, i) => (
                                    <div
                                        key={notification.id || i}
                                        className={`flex gap-3 p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${!notification.read ? 'bg-violet-50' : ''
                                            }`}
                                        onClick={() => markAsRead(notification.id)}
                                    >
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                            {notificationIcons[notification.type] || <Bell className="w-4 h-4 text-gray-600" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900 line-clamp-2">
                                                {notification.title || notification.message}
                                            </p>
                                            {notification.description && (
                                                <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                                    {notification.description}
                                                </p>
                                            )}
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                {notification.timestamp
                                                    ? formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })
                                                    : 'Just now'}
                                            </p>
                                        </div>
                                        {!notification.read && (
                                            <div className="flex-shrink-0 w-2 h-2 bg-violet-600 rounded-full mt-2" />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="p-3 border-t bg-gray-50">
                                <Button variant="ghost" size="sm" className="w-full text-violet-600">
                                    View all notifications
                                </Button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

export default NotificationBell
