'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    User,
    Camera,
    Save,
    Loader2,
    MapPin,
    Phone,
    Globe,
    CheckCircle,
    Shield,
    Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiFetch } from '@/lib/auth/api-client'

export default function CleanerProfilePage() {
    const [isLoading, setIsLoading] = useState(false)
    const [exportingData, setExportingData] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [deletingAccount, setDeletingAccount] = useState(false)

    const [profile, setProfile] = useState({
        businessName: '',
        bio: '',
        phone: '',
        website: '',
        serviceAreas: [] as string[],
        verificationTier: 1,
    })

    // Fetch profile from API
    const { isLoading: loadingProfile } = useQuery({
        queryKey: ['my-profile'],
        queryFn: async () => {
            try {
                const data = await apiFetch('/api/v1/cleaners/me')
                setProfile({
                    businessName: data.business_name || data.businessName || '',
                    bio: data.bio || '',
                    phone: data.phone || data.user?.phone || '',
                    website: data.website || '',
                    serviceAreas: data.service_areas || data.serviceAreas || [],
                    verificationTier: data.verification_tier || data.verificationTier || 1,
                })
                return data
            } catch {
                return null // Graceful fallback — profile may not exist yet
            }
        },
    })

    async function handleSave() {
        setIsLoading(true)
        try {
            // Business profile lives on the cleaner record; phone lives on the
            // user record — save each to its real endpoint so neither is
            // silently dropped.
            await apiFetch('/api/v1/cleaners/me', {
                method: 'PATCH',
                body: JSON.stringify({
                    business_name: profile.businessName,
                    bio: profile.bio,
                    service_areas: profile.serviceAreas,
                }),
            })
            await apiFetch('/api/v1/users/me', {
                method: 'PATCH',
                body: JSON.stringify({ phone: profile.phone }),
            })
            toast.success('Profile updated successfully!')
        } catch {
            toast.error('Failed to update profile')
        } finally {
            setIsLoading(false)
        }
    }

    const tierInfo = {
        1: { name: 'Starter', color: 'bg-gray-500', description: 'Email & phone verified' },
        2: { name: 'Verified', color: 'bg-blue-500', description: 'ID & payment verified' },
        3: { name: 'Professional', color: 'bg-green-500', description: 'Licensed & insured' },
        4: { name: 'Certified', color: 'bg-amber-500', description: 'Industry certifications' },
        5: { name: 'Elite', color: 'bg-purple-500', description: 'Top performer' },
    }

    const currentTier = tierInfo[profile.verificationTier as keyof typeof tierInfo]

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Your Profile</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your public profile and business information
                </p>
            </div>

            {/* Verification Status */}
            <Card className="border-l-4 border-l-brand-500">
                <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${currentTier.color}`}>
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">{currentTier.name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${currentTier.color} text-white`}>
                                        Tier {profile.verificationTier}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{currentTier.description}</p>
                            </div>
                        </div>
                        <Button variant="outline" asChild>
                            <a href="/cleaner/verification">Upgrade Tier</a>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Profile Photo */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Profile Photo</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                                <User className="w-10 h-10 text-brand-600 dark:text-brand-400" />
                            </div>
                            <button className="absolute bottom-0 right-0 p-2 bg-brand-500 rounded-full text-white hover:bg-brand-600 transition">
                                <Camera className="w-4 h-4" />
                            </button>
                        </div>
                        <div>
                            <p className="font-medium">Upload a professional photo</p>
                            <p className="text-sm text-muted-foreground">
                                JPG or PNG, max 5MB. This will be visible to clients.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Business Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Business Name</label>
                        <Input
                            value={profile.businessName}
                            onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                            placeholder="Your business name"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Bio</label>
                        <Textarea
                            value={profile.bio}
                            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                            placeholder="Tell clients about your experience and services..."
                            rows={4}
                        />
                        <p className="text-xs text-muted-foreground">
                            {profile.bio.length}/500 characters
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                Phone Number
                            </label>
                            <Input
                                value={profile.phone}
                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                type="tel"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                Website (optional)
                            </label>
                            <Input
                                value={profile.website}
                                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                                placeholder="https://"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Service Areas */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Service Areas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {profile.serviceAreas.map((area, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 text-sm"
                            >
                                <CheckCircle className="w-3 h-3" />
                                {area}
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Input placeholder="Add a city or ZIP code" />
                        <Button variant="outline">Add</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Your Data & Account */}
            <Card className="border-red-200 dark:border-red-500/20">
                <CardHeader>
                    <CardTitle className="text-lg text-red-600">Your Data & Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isLoading} className="bg-brand-500 hover:bg-brand-600">
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
