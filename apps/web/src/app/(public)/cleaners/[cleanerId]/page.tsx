'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Star,
    Shield,
    MapPin,
    Clock,
    CheckCircle,
    Calendar,
    MessageSquare,
    ChevronRight,
    Award,
    TrendingUp,
    ThumbsUp,
    Camera,
    ArrowLeft,
    Sparkles,
} from 'lucide-react'

const tierColors = {
    1: 'bg-gray-500',
    2: 'bg-blue-500',
    3: 'bg-green-500',
    4: 'bg-amber-500',
    5: 'bg-purple-500',
}

const tierNames = {
    1: 'Starter',
    2: 'Verified',
    3: 'Professional',
    4: 'Certified',
    5: 'Elite',
}

export default function CleanerProfilePage() {
    const params = useParams()
    const cleanerId = params.cleanerId as string

    // Mock cleaner data
    const cleaner = {
        id: cleanerId,
        businessName: "Maria's Cleaning Service",
        bio: 'Professional cleaning services with over 10 years of experience. Specializing in residential cleaning, Airbnb turnovers, and deep cleaning. We use eco-friendly products and take pride in delivering spotless results every time.',
        profilePhoto: null,
        verificationTier: 4,
        overallRating: 4.9,
        totalReviews: 156,
        responseTime: 15,
        jobsCompleted: 423,
        repeatClientRate: 68,
        onTimeRate: 99,
        memberSince: '2022',
        serviceAreas: ['Austin, TX', 'Round Rock, TX', 'Cedar Park, TX'],
        services: [
            { name: 'Standard Clean', price: 100, description: 'Regular cleaning with dusting, vacuuming, mopping' },
            { name: 'Deep Clean', price: 180, description: 'Thorough cleaning including inside appliances' },
            { name: 'Airbnb Turnover', price: 120, description: 'Quick turnaround for guest changeovers' },
            { name: 'Move In/Out', price: 250, description: 'Complete cleaning for empty properties' },
        ],
        certifications: ['IICRC Certified', 'EPA Lead-Safe Certified'],
        badges: ['Top Rated', 'Fast Response', 'Eco-Friendly', 'Background Checked'],
        reviews: [
            {
                id: '1',
                author: 'John D.',
                rating: 5,
                date: '2 weeks ago',
                text: 'Maria did an amazing job! The house was spotless and she was very professional. Highly recommend!',
            },
            {
                id: '2',
                author: 'Sarah M.',
                rating: 5,
                date: '1 month ago',
                text: 'Excellent service. Always on time and very thorough. Been using Maria for my Airbnb turnovers for 6 months now.',
            },
        ],
        photos: ['/placeholder1.jpg', '/placeholder2.jpg', '/placeholder3.jpg'],
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 py-6">
                <div className="container mx-auto px-4">
                    <Link href="/cleaners" className="inline-flex items-center text-white/80 hover:text-white mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to search
                    </Link>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Profile Card */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row gap-6">
                                    {/* Photo */}
                                    <div className="w-32 h-32 rounded-2xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-4xl font-bold text-brand-600">
                                            {cleaner.businessName[0]}
                                        </span>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h1 className="text-2xl font-bold">{cleaner.businessName}</h1>
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-sm font-medium text-white ${tierColors[cleaner.verificationTier as keyof typeof tierColors]
                                                            }`}
                                                    >
                                                        {tierNames[cleaner.verificationTier as keyof typeof tierNames]}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <span className="flex items-center text-amber-500">
                                                        <Star className="w-5 h-5 fill-current mr-1" />
                                                        <span className="font-semibold">{cleaner.overallRating}</span>
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {cleaner.totalReviews} reviews
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {cleaner.jobsCompleted} jobs
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="mt-4 text-muted-foreground">{cleaner.bio}</p>

                                        {/* Badges */}
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {cleaner.badges.map((badge) => (
                                                <span
                                                    key={badge}
                                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 text-sm"
                                                >
                                                    <CheckCircle className="w-3 h-3" />
                                                    {badge}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Clock className="w-6 h-6 mx-auto text-brand-500 mb-2" />
                                    <p className="text-2xl font-bold">{cleaner.responseTime}m</p>
                                    <p className="text-xs text-muted-foreground">Response Time</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <TrendingUp className="w-6 h-6 mx-auto text-green-500 mb-2" />
                                    <p className="text-2xl font-bold">{cleaner.onTimeRate}%</p>
                                    <p className="text-xs text-muted-foreground">On-Time Rate</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <ThumbsUp className="w-6 h-6 mx-auto text-amber-500 mb-2" />
                                    <p className="text-2xl font-bold">{cleaner.repeatClientRate}%</p>
                                    <p className="text-xs text-muted-foreground">Repeat Clients</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Calendar className="w-6 h-6 mx-auto text-purple-500 mb-2" />
                                    <p className="text-2xl font-bold">{cleaner.memberSince}</p>
                                    <p className="text-xs text-muted-foreground">Member Since</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Services */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Services Offered</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {cleaner.services.map((service) => (
                                        <div
                                            key={service.name}
                                            className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                                        >
                                            <div>
                                                <p className="font-medium">{service.name}</p>
                                                <p className="text-sm text-muted-foreground">{service.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-semibold">${service.price}</p>
                                                <p className="text-xs text-muted-foreground">starting</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Reviews */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Reviews</CardTitle>
                                <Button variant="ghost" size="sm">
                                    See all <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {cleaner.reviews.map((review) => (
                                        <div key={review.id} className="border-b pb-6 last:border-0 last:pb-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                                        {review.author[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{review.author}</p>
                                                        <p className="text-xs text-muted-foreground">{review.date}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center text-amber-500">
                                                    {[...Array(review.rating)].map((_, i) => (
                                                        <Star key={i} className="w-4 h-4 fill-current" />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-muted-foreground">{review.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Booking Card */}
                        <Card className="sticky top-4">
                            <CardContent className="p-6">
                                <div className="text-center mb-6">
                                    <p className="text-3xl font-bold">${cleaner.services[0].price}</p>
                                    <p className="text-muted-foreground">starting price</p>
                                </div>

                                <Link href={`/book/${cleaner.id}`}>
                                    <Button className="w-full bg-brand-500 hover:bg-brand-600 h-12 text-lg mb-4">
                                        <Calendar className="w-5 h-5 mr-2" />
                                        Book Now
                                    </Button>
                                </Link>

                                <Button variant="outline" className="w-full h-12">
                                    <MessageSquare className="w-5 h-5 mr-2" />
                                    Message
                                </Button>

                                <p className="text-center text-xs text-muted-foreground mt-4">
                                    <Clock className="w-3 h-3 inline mr-1" />
                                    Usually responds within {cleaner.responseTime} minutes
                                </p>
                            </CardContent>
                        </Card>

                        {/* Verification */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-brand-500" />
                                    Verification
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Identity Verified</span>
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Background Check</span>
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Licensed & Insured</span>
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                </div>
                                {cleaner.certifications.map((cert) => (
                                    <div key={cert} className="flex items-center justify-between">
                                        <span className="text-sm">{cert}</span>
                                        <Award className="w-5 h-5 text-amber-500" />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Service Areas */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-brand-500" />
                                    Service Areas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {cleaner.serviceAreas.map((area) => (
                                        <div key={area} className="flex items-center gap-2 text-sm">
                                            <CheckCircle className="w-4 h-4 text-brand-500" />
                                            {area}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
