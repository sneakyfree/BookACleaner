'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
    Users, Search, Shield, ShieldAlert, ShieldCheck, MoreVertical,
    Mail, Calendar, Filter, ChevronLeft, ChevronRight, UserX, UserCheck,
    Loader2, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface UserRecord {
    id: string
    email: string
    full_name: string
    role: string
    status: string
    is_verified: boolean
    created_at: string
    cleaner_profile?: { verification_tier: number; completed_jobs: number } | null
    client_profile?: { jobs_completed: number } | null
}

const roleColors: Record<string, string> = {
    cleaner: 'bg-emerald-500/20 text-emerald-400',
    client: 'bg-blue-500/20 text-blue-400',
    admin: 'bg-purple-500/20 text-purple-400',
}

const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    suspended: 'bg-amber-500/20 text-amber-400',
    banned: 'bg-red-500/20 text-red-400',
}

export default function AdminUsersPage() {
    const { data: session } = useSession()
    const [users, setUsers] = useState<UserRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [actionMenuId, setActionMenuId] = useState<string | null>(null)

    const fetchUsers = useCallback(async () => {
        const token = (session as any)?.accessToken
        if (!token) return

        try {
            setLoading(true)
            setError('')
            const params = new URLSearchParams({ page: String(page), limit: '20' })
            if (roleFilter !== 'all') params.set('role', roleFilter)

            const res = await fetch(`${API_URL}/api/v1/admin/users?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error(`Failed to load users (${res.status})`)
            const data = await res.json()
            setUsers(data.users || [])
            setTotal(data.total || 0)
        } catch (err: any) {
            setError(err.message || 'Failed to load users')
        } finally {
            setLoading(false)
        }
    }, [session, page, roleFilter])

    useEffect(() => {
        if (session) fetchUsers()
    }, [session, fetchUsers])

    const toggleStatus = useCallback(async (userId: string, newStatus: string) => {
        const token = (session as any)?.accessToken
        if (!token) return

        try {
            const res = await fetch(`${API_URL}/api/v1/admin/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            })
            if (!res.ok) throw new Error('Failed to update user')
            // Update local state
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u))
        } catch (err: any) {
            setError(err.message || 'Failed to update user status')
        }
        setActionMenuId(null)
    }, [session])

    const filteredUsers = users.filter(u => {
        const matchSearch = !search || (u.full_name || '').toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'all' || u.status === statusFilter
        return matchSearch && matchStatus
    })

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Users className="w-7 h-7 text-brand-400" />
                            User Management
                        </h1>
                        <p className="text-white/60 mt-1">{total} total users · {filteredUsers.length} shown</p>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-red-300 text-sm">{error}</p>
                        <button onClick={fetchUsers} className="ml-auto text-red-400 hover:text-red-300 text-sm font-medium">Retry</button>
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or email..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={e => setRoleFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                    >
                        <option value="all">All Roles</option>
                        <option value="client">Clients</option>
                        <option value="cleaner">Cleaners</option>
                        <option value="admin">Admins</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="banned">Banned</option>
                    </select>
                </div>

                {/* Loading */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                        <span className="ml-3 text-white/60">Loading users...</span>
                    </div>
                ) : (
                    <>
                        {/* Table */}
                        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-white/50 text-sm border-b border-white/10">
                                            <th className="text-left py-4 px-6 font-medium">User</th>
                                            <th className="text-left py-4 px-4 font-medium">Role</th>
                                            <th className="text-left py-4 px-4 font-medium">Status</th>
                                            <th className="text-left py-4 px-4 font-medium">Verified</th>
                                            <th className="text-left py-4 px-4 font-medium">Joined</th>
                                            <th className="text-right py-4 px-6 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map(user => (
                                            <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                                <td className="py-4 px-6">
                                                    <div>
                                                        <p className="text-white font-medium">{user.full_name || 'Unknown'}</p>
                                                        <p className="text-white/40 text-sm">{user.email}</p>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium capitalize', roleColors[user.role])}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium capitalize', statusColors[user.status || 'active'])}>
                                                        {user.status || 'active'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    {user.is_verified ? (
                                                        <ShieldCheck className="w-5 h-5 text-green-400" />
                                                    ) : (
                                                        <ShieldAlert className="w-5 h-5 text-amber-400" />
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-white/60 text-sm">
                                                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                                                </td>
                                                <td className="py-4 px-6 text-right relative">
                                                    <button
                                                        onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                    >
                                                        <MoreVertical className="w-4 h-4 text-white/60" />
                                                    </button>
                                                    {actionMenuId === user.id && (
                                                        <div className="absolute right-6 top-12 z-10 w-48 bg-slate-800 border border-white/10 rounded-lg shadow-xl py-1">
                                                            {user.status !== 'active' && (
                                                                <button onClick={() => toggleStatus(user.id, 'active')} className="w-full px-4 py-2 text-left text-sm text-green-400 hover:bg-white/5 flex items-center gap-2">
                                                                    <UserCheck className="w-4 h-4" /> Activate
                                                                </button>
                                                            )}
                                                            {user.status === 'active' && (
                                                                <button onClick={() => toggleStatus(user.id, 'suspended')} className="w-full px-4 py-2 text-left text-sm text-amber-400 hover:bg-white/5 flex items-center gap-2">
                                                                    <UserX className="w-4 h-4" /> Suspend
                                                                </button>
                                                            )}
                                                            {user.status !== 'banned' && (
                                                                <button onClick={() => toggleStatus(user.id, 'banned')} className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/5 flex items-center gap-2">
                                                                    <ShieldAlert className="w-4 h-4" /> Ban
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredUsers.length === 0 && (
                                <div className="py-12 text-center text-white/40">No users match your filters</div>
                            )}
                        </div>

                        {/* Pagination */}
                        {total > 20 && (
                            <div className="flex items-center justify-center gap-4 mt-6">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-white/10 disabled:opacity-30"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-white/60 text-sm">Page {page} of {Math.ceil(total / 20)}</span>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= Math.ceil(total / 20)}
                                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-white/10 disabled:opacity-30"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
