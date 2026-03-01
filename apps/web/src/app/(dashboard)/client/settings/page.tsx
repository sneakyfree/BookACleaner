'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    User,
    Camera,
    Save,
    Loader2,
    CreditCard,
    Bell,
    Shield,
    Trash2,
    Plus,
    Check,
    ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/auth/api-client'

export default function ClientSettingsPage() {
    const { data: session } = useSession()
    const [isLoading, setIsLoading] = useState(false)
    const [portalLoading, setPortalLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'profile' | 'payment' | 'notifications' | 'security'>('profile')
    const [exportingData, setExportingData] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [deletingAccount, setDeletingAccount] = useState(false)

    const [profile, setProfile] = useState({
        displayName: '',
        email: session?.user?.email || '',
        phone: '',
    })

    const [paymentMethods, setPaymentMethods] = useState<any[]>([])

    const [notifications, setNotifications] = useState({
        bookingConfirmations: true,
        cleaningReminders: true,
        reviewRequests: true,
        promotions: false,
        smsEnabled: true,
        emailEnabled: true,
    })

    // Fetch profile + payment methods + notifications from API
    useQuery({
        queryKey: ['client-settings'],
        queryFn: async () => {
            try {
                const [profileData, paymentData, notifData] = await Promise.all([
                    apiFetch('/api/v1/users/me/profile').catch(() => null),
                    apiFetch('/api/v1/payments/payment-methods').catch(() => null),
                    apiFetch('/api/v1/users/me/notifications').catch(() => null),
                ])

                if (profileData) {
                    setProfile({
                        displayName: profileData.display_name || profileData.full_name || '',
                        email: profileData.email || session?.user?.email || '',
                        phone: profileData.phone || '',
                    })
                }
                if (paymentData) {
                    setPaymentMethods(Array.isArray(paymentData) ? paymentData : [])
                }
                if (notifData) {
                    setNotifications((prev) => ({ ...prev, ...notifData }))
                }
                return { profileData, paymentData, notifData }
            } catch {
                return null
            }
        },
    })

    async function handleSaveProfile() {
        setIsLoading(true)
        try {
            await apiFetch('/api/v1/users/me/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    display_name: profile.displayName,
                    phone: profile.phone,
                }),
            })
            toast.success('Profile updated successfully!')
        } catch {
            toast.error('Failed to update profile')
        } finally {
            setIsLoading(false)
        }
    }

    async function handleManageBilling() {
        setPortalLoading(true)
        try {
            const data = await apiFetch('/api/v1/payments/customer-portal', {
                method: 'POST',
                body: JSON.stringify({
                    return_url: window.location.href,
                }),
            })
            if (data.url) {
                window.location.href = data.url
            }
        } catch {
            toast.error('Unable to open billing portal')
        } finally {
            setPortalLoading(false)
        }
    }

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'payment', label: 'Payment', icon: CreditCard },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield },
    ]

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your account preferences</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
                {tabs.map((tab) => (
                    <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? 'default' : 'ghost'}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={activeTab === tab.id ? 'bg-brand-500' : ''}
                    >
                        <tab.icon className="w-4 h-4 mr-2" />
                        {tab.label}
                    </Button>
                ))}
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Profile Photo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                                        <User className="w-10 h-10 text-brand-600" />
                                    </div>
                                    <button className="absolute bottom-0 right-0 p-2 bg-brand-500 rounded-full text-white hover:bg-brand-600 transition">
                                        <Camera className="w-4 h-4" />
                                    </button>
                                </div>
                                <div>
                                    <p className="font-medium">Upload a photo</p>
                                    <p className="text-sm text-muted-foreground">
                                        JPG or PNG, max 5MB
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Personal Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Display Name</label>
                                <Input
                                    value={profile.displayName}
                                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <Input value={profile.email} disabled className="bg-slate-50" />
                                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Phone Number</label>
                                <Input
                                    value={profile.phone}
                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={handleSaveProfile} disabled={isLoading} className="bg-brand-500 hover:bg-brand-600">
                                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save Changes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Payment Tab */}
            {activeTab === 'payment' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Payment Methods</CardTitle>
                            <Button size="sm" className="bg-brand-500 hover:bg-brand-600">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Card
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {paymentMethods.map((method) => (
                                    <div
                                        key={method.id}
                                        className={`flex items-center justify-between p-4 rounded-xl border ${method.isDefault ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-8 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center">
                                                <CreditCard className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium capitalize">
                                                    {method.brand} •••• {method.last4}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    Expires {method.expMonth}/{method.expYear}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {method.isDefault ? (
                                                <span className="text-xs px-2 py-1 rounded-full bg-brand-500 text-white">
                                                    Default
                                                </span>
                                            ) : (
                                                <Button variant="ghost" size="sm">
                                                    Set Default
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" className="text-red-500">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Manage Billing via Stripe Customer Portal */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Subscription & Billing</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Manage Billing</p>
                                    <p className="text-sm text-muted-foreground">
                                        View invoices, update payment method, or cancel subscription
                                    </p>
                                </div>
                                <Button
                                    onClick={handleManageBilling}
                                    disabled={portalLoading}
                                    className="bg-brand-500 hover:bg-brand-600"
                                >
                                    {portalLoading ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                    )}
                                    Manage Billing
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Email Notifications</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { key: 'bookingConfirmations', label: 'Booking confirmations', desc: 'Get notified when bookings are confirmed' },
                                { key: 'cleaningReminders', label: 'Cleaning reminders', desc: 'Reminders before scheduled cleanings' },
                                { key: 'reviewRequests', label: 'Review requests', desc: 'Reminders to leave reviews after cleanings' },
                                { key: 'promotions', label: 'Promotions & offers', desc: 'Special deals and promotions' },
                            ].map((item) => (
                                <div key={item.key} className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{item.label}</p>
                                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                                    </div>
                                    <button
                                        onClick={() =>
                                            setNotifications({
                                                ...notifications,
                                                [item.key]: !notifications[item.key as keyof typeof notifications],
                                            })
                                        }
                                        className={`w-12 h-6 rounded-full transition-colors ${notifications[item.key as keyof typeof notifications]
                                            ? 'bg-brand-500'
                                            : 'bg-slate-200 dark:bg-slate-700'
                                            }`}
                                    >
                                        <div
                                            className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${notifications[item.key as keyof typeof notifications]
                                                ? 'translate-x-6'
                                                : 'translate-x-0.5'
                                                }`}
                                        />
                                    </button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Communication Channels</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">SMS notifications</p>
                                    <p className="text-sm text-muted-foreground">Receive text messages for updates</p>
                                </div>
                                <button
                                    onClick={() => setNotifications({ ...notifications, smsEnabled: !notifications.smsEnabled })}
                                    className={`w-12 h-6 rounded-full transition-colors ${notifications.smsEnabled ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'
                                        }`}
                                >
                                    <div
                                        className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${notifications.smsEnabled ? 'translate-x-6' : 'translate-x-0.5'
                                            }`}
                                    />
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Email notifications</p>
                                    <p className="text-sm text-muted-foreground">Receive email updates</p>
                                </div>
                                <button
                                    onClick={() => setNotifications({ ...notifications, emailEnabled: !notifications.emailEnabled })}
                                    className={`w-12 h-6 rounded-full transition-colors ${notifications.emailEnabled ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'
                                        }`}
                                >
                                    <div
                                        className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${notifications.emailEnabled ? 'translate-x-6' : 'translate-x-0.5'
                                            }`}
                                    />
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Change Password</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Current Password</label>
                                <Input type="password" placeholder="••••••••" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">New Password</label>
                                <Input type="password" placeholder="••••••••" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Confirm New Password</label>
                                <Input type="password" placeholder="••••••••" />
                            </div>
                            <Button className="bg-brand-500 hover:bg-brand-600">
                                Update Password
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-red-200 dark:border-red-500/20">
                        <CardHeader>
                            <CardTitle className="text-lg text-red-600">Your Data & Account</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Data Export */}
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                <div>
                                    <p className="font-medium">Export My Data</p>
                                    <p className="text-sm text-muted-foreground">
                                        Download all your data as a JSON file (GDPR)
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    disabled={exportingData}
                                    onClick={async () => {
                                        setExportingData(true)
                                        try {
                                            const data = await apiFetch('/api/v1/privacy/export')
                                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                                            const url = URL.createObjectURL(blob)
                                            const a = document.createElement('a')
                                            a.href = url
                                            a.download = `bookacleaner-data-${new Date().toISOString().slice(0, 10)}.json`
                                            a.click()
                                            URL.revokeObjectURL(url)
                                            toast.success('Data exported successfully')
                                        } catch {
                                            toast.error('Failed to export data')
                                        } finally {
                                            setExportingData(false)
                                        }
                                    }}
                                >
                                    {exportingData ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                                    Export
                                </Button>
                            </div>

                            {/* Delete Account */}
                            <div className="flex items-center justify-between p-3 rounded-lg border border-red-200 dark:border-red-500/20">
                                <div>
                                    <p className="font-medium text-red-600">Delete Account</p>
                                    <p className="text-sm text-muted-foreground">
                                        Permanently delete your account and all data
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Account
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Delete Confirmation Modal */}
                    {showDeleteConfirm && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <Card className="w-full max-w-md">
                                <CardHeader>
                                    <CardTitle className="text-red-600">⚠️ Delete Account</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        This action is permanent and cannot be undone. All your data, bookings, messages, and reviews will be permanently deleted.
                                    </p>
                                    <div>
                                        <label className="text-sm font-medium mb-1 block">Type DELETE to confirm</label>
                                        <input
                                            className="w-full px-3 py-2 border rounded-lg bg-background"
                                            value={deleteConfirmText}
                                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                                            placeholder="DELETE"
                                        />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <Button variant="ghost" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}>
                                            Cancel
                                        </Button>
                                        <Button
                                            className="bg-red-600 hover:bg-red-700 text-white"
                                            disabled={deleteConfirmText !== 'DELETE' || deletingAccount}
                                            onClick={async () => {
                                                setDeletingAccount(true)
                                                try {
                                                    await apiFetch('/api/v1/privacy/delete', {
                                                        method: 'POST',
                                                        body: JSON.stringify({ confirm: true }),
                                                    })
                                                    toast.success('Account deleted')
                                                    const { signOut } = await import('next-auth/react')
                                                    signOut({ callbackUrl: '/' })
                                                } catch {
                                                    toast.error('Failed to delete account')
                                                    setDeletingAccount(false)
                                                }
                                            }}
                                        >
                                            {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                            Permanently Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
