'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Users, Search, Shield, ShieldAlert, ShieldCheck, MoreVertical,
    Mail, Calendar, Filter, ChevronLeft, ChevronRight, UserX, UserCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Admin User Management Page
 * List, search, filter, and manage platform users
 */

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

// Demo data for initial render
const mockUsers: UserRecord[] = [
    { id: '1', email: 'maria@example.com', full_name: 'Maria Garcia', role: 'cleaner', status: 'active', is_verified: true, created_at: '2025-12-01', cleaner_profile: { verification_tier: 4, completed_jobs: 89 }, client_profile: null },
    { id: '2', email: 'james@example.com', full_name: 'James Wilson', role: 'client', status: 'active', is_verified: true, created_at: '2025-11-15', cleaner_profile: null, client_profile: { jobs_completed: 12 } },
    { id: '3', email: 'sarah@example.com', full_name: 'Sarah Johnson', role: 'cleaner', status: 'active', is_verified: true, created_at: '2025-10-20', cleaner_profile: { verification_tier: 5, completed_jobs: 134 }, client_profile: null },
    { id: '4', email: 'david@example.com', full_name: 'David Chen', role: 'client', status: 'suspended', is_verified: false, created_at: '2026-01-05', cleaner_profile: null, client_profile: { jobs_completed: 3 } },
    { id: '5', email: 'emily@example.com', full_name: 'Emily Brown', role: 'cleaner', status: 'active', is_verified: true, created_at: '2025-09-12', cleaner_profile: { verification_tier: 3, completed_jobs: 45 }, client_profile: null },
    { id: '6', email: 'alex@example.com', full_name: 'Alex Rivera', role: 'client', status: 'active', is_verified: true, created_at: '2025-12-22', cleaner_profile: null, client_profile: { jobs_completed: 8 } },
    { id: '7', email: 'lisa@example.com', full_name: 'Lisa Park', role: 'cleaner', status: 'active', is_verified: false, created_at: '2026-01-18', cleaner_profile: { verification_tier: 1, completed_jobs: 2 }, client_profile: null },
    { id: '8', email: 'mike@example.com', full_name: 'Mike Thompson', role: 'client', status: 'banned', is_verified: true, created_at: '2025-08-30', cleaner_profile: null, client_profile: { jobs_completed: 0 } },
]

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
    const [users, setUsers] = useState<UserRecord[]>(mockUsers)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [page, setPage] = useState(1)
    const [actionMenuId, setActionMenuId] = useState<string | null>(null)

    const filteredUsers = users.filter(u => {
        const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
        const matchRole = roleFilter === 'all' || u.role === roleFilter
        const matchStatus = statusFilter === 'all' || u.status === statusFilter
        return matchSearch && matchRole && matchStatus
    })

    const toggleStatus = useCallback((userId: string, newStatus: string) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u))
        setActionMenuId(null)
    }, [])

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
                        <p className="text-white/60 mt-1">{filteredUsers.length} users found</p>
                    </div>
                </div>

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
                                                <p className="text-white font-medium">{user.full_name}</p>
                                                <p className="text-white/40 text-sm">{user.email}</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium capitalize', roleColors[user.role])}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium capitalize', statusColors[user.status])}>
                                                {user.status}
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
                                            {new Date(user.created_at).toLocaleDateString()}
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
            </div>
        </div>
    )
}
