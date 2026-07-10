'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  MoreVertical,
  Mail,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  UserX,
  UserCheck,
  Loader2,
  AlertCircle,
  Download,
  LogOut,
  KeyRound,
  UserSquare2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAdminUsers } from '@/hooks/use-api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

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
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  // Debounce the search box (~350ms) so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const {
    data: rawData,
    isLoading: loading,
    error,
    refetch,
  } = useAdminUsers(
    page,
    roleFilter !== 'all' ? roleFilter : undefined,
    undefined,
    debouncedSearch || undefined
  )
  const queryClient = useQueryClient()

  const users: UserRecord[] = rawData?.users || rawData || []
  const total = rawData?.total || users.length

  const toggleStatusMut = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      api.admin.updateUser(userId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setActionMenuId(null)
    },
  })

  const toggleStatus = (userId: string, newStatus: string) => {
    toggleStatusMut.mutate({ userId, status: newStatus })
  }

  const forceLogoutMut = useMutation({
    mutationFn: (userId: string) => api.admin.forceLogout(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setActionMenuId(null)
      toast.success('All sessions revoked for this user')
    },
    onError: (err: any) => toast.error(err?.detail || 'Failed to force logout'),
  })

  const resetLinkMut = useMutation({
    mutationFn: (userId: string) => api.admin.passwordResetLink(userId),
    onSuccess: async (data: { reset_link: string }) => {
      setActionMenuId(null)
      try {
        await navigator.clipboard.writeText(data.reset_link)
        toast.success('Password reset link copied to clipboard', { description: data.reset_link })
      } catch {
        toast.success('Password reset link generated', {
          description: data.reset_link,
          duration: 15000,
        })
      }
    },
    onError: (err: any) => toast.error(err?.detail || 'Failed to generate reset link'),
  })

  const impersonateMut = useMutation({
    mutationFn: (userId: string) => api.admin.impersonate(userId),
    onSuccess: (data: { access_token: string; user: any }) => {
      setActionMenuId(null)
      toast.success(`Impersonation token issued for ${data.user?.email || 'user'}`, {
        description: 'Token valid for a limited time. Opening dashboard…',
      })
      window.open('/dashboard', '_blank')
    },
    onError: (err: any) => toast.error(err?.detail || 'Failed to impersonate user'),
  })

  const makeAdminMut = useMutation({
    mutationFn: (userId: string) =>
      api.admin.updateUser(userId, { role: 'admin', confirm_grant_admin: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setActionMenuId(null)
      toast.success('Admin role granted')
    },
    onError: (err: any) => toast.error(err?.detail || 'Failed to grant admin role'),
  })

  const handleMakeAdmin = (user: UserRecord) => {
    if (window.confirm(`Grant ADMIN access to ${user.email}? This gives full platform control.`)) {
      makeAdminMut.mutate(user.id)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await api.admin.exportUsers()
      toast.success('User export downloaded')
    } catch (err: any) {
      toast.error(err?.detail || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  // Search is server-side (q); status stays a client-side convenience filter.
  const filteredUsers = users.filter((u) => statusFilter === 'all' || u.status === statusFilter)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
              <Users className="text-brand-400 h-7 w-7" />
              User Management
            </h1>
            <p className="mt-1 text-white/60">
              {total} total users · {filteredUsers.length} shown
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export CSV
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">
              {(error as any)?.detail || 'Failed to load users'}
            </p>
            <button
              onClick={() => refetch()}
              className="ml-auto text-sm font-medium text-red-400 hover:text-red-300"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="focus:ring-brand-500/50 w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="focus:ring-brand-500/50 cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:outline-none focus:ring-2"
          >
            <option value="all">All Roles</option>
            <option value="client">Clients</option>
            <option value="cleaner">Cleaners</option>
            <option value="admin">Admins</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="focus:ring-brand-500/50 cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:outline-none focus:ring-2"
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
            <Loader2 className="text-brand-400 h-8 w-8 animate-spin" />
            <span className="ml-3 text-white/60">Loading users...</span>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-sm text-white/50">
                      <th className="px-6 py-4 text-left font-medium">User</th>
                      <th className="px-4 py-4 text-left font-medium">Role</th>
                      <th className="px-4 py-4 text-left font-medium">Status</th>
                      <th className="px-4 py-4 text-left font-medium">Verified</th>
                      <th className="px-4 py-4 text-left font-medium">Joined</th>
                      <th className="px-6 py-4 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-white">{user.full_name || 'Unknown'}</p>
                            <p className="text-sm text-white/40">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                              roleColors[user.role]
                            )}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                              statusColors[user.status || 'active']
                            )}
                          >
                            {user.status || 'active'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {user.is_verified ? (
                            <ShieldCheck className="h-5 w-5 text-green-400" />
                          ) : (
                            <ShieldAlert className="h-5 w-5 text-amber-400" />
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-white/60">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="relative px-6 py-4 text-right">
                          <button
                            onClick={() =>
                              setActionMenuId(actionMenuId === user.id ? null : user.id)
                            }
                            className="rounded-lg p-2 transition-colors hover:bg-white/10"
                          >
                            <MoreVertical className="h-4 w-4 text-white/60" />
                          </button>
                          {actionMenuId === user.id && (
                            <div className="absolute right-6 top-12 z-10 w-48 rounded-lg border border-white/10 bg-slate-800 py-1 shadow-xl">
                              {user.status !== 'active' && (
                                <button
                                  onClick={() => toggleStatus(user.id, 'active')}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-green-400 hover:bg-white/5"
                                >
                                  <UserCheck className="h-4 w-4" /> Activate
                                </button>
                              )}
                              {user.status === 'active' && (
                                <button
                                  onClick={() => toggleStatus(user.id, 'suspended')}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-amber-400 hover:bg-white/5"
                                >
                                  <UserX className="h-4 w-4" /> Suspend
                                </button>
                              )}
                              {user.status !== 'banned' && (
                                <button
                                  onClick={() => toggleStatus(user.id, 'banned')}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-400 hover:bg-white/5"
                                >
                                  <ShieldAlert className="h-4 w-4" /> Ban
                                </button>
                              )}
                              <div className="my-1 border-t border-white/10" />
                              <button
                                onClick={() => forceLogoutMut.mutate(user.id)}
                                disabled={forceLogoutMut.isPending}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-white/70 hover:bg-white/5 disabled:opacity-50"
                              >
                                <LogOut className="h-4 w-4" /> Force logout
                              </button>
                              <button
                                onClick={() => resetLinkMut.mutate(user.id)}
                                disabled={resetLinkMut.isPending}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-white/70 hover:bg-white/5 disabled:opacity-50"
                              >
                                <KeyRound className="h-4 w-4" /> Password reset link
                              </button>
                              <button
                                onClick={() => impersonateMut.mutate(user.id)}
                                disabled={impersonateMut.isPending}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-white/70 hover:bg-white/5 disabled:opacity-50"
                              >
                                <UserSquare2 className="h-4 w-4" /> Impersonate
                              </button>
                              {user.role !== 'admin' && (
                                <button
                                  onClick={() => handleMakeAdmin(user)}
                                  disabled={makeAdminMut.isPending}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-purple-400 hover:bg-white/5 disabled:opacity-50"
                                >
                                  <Shield className="h-4 w-4" /> Make admin
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
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/60 hover:bg-white/10 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-white/60">
                  Page {page} of {Math.ceil(total / 20)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / 20)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/60 hover:bg-white/10 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
