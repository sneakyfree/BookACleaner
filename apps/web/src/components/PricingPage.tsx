'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import styles from './PricingPage.module.css';

interface PricingTier {
    id: string;
    name: string;
    price: number;
    period: string;
    description: string;
    features: string[];
    highlighted?: boolean;
    cta: string;
}

const PRICING_TIERS: PricingTier[] = [
    {
        id: 'basic',
        name: 'Pay As You Go',
        price: 89,
        period: 'per cleaning',
        description: 'Perfect for occasional needs',
        features: [
            'Standard home cleaning',
            'Background-checked cleaners',
            'Satisfaction guarantee',
            'Easy online booking',
            'Email support',
        ],
        cta: 'Book Now',
    },
    {
        id: 'pro',
        name: 'Weekly Plan',
        price: 69,
        period: 'per cleaning',
        description: 'Best value for regular cleaning',
        features: [
            'Everything in Basic',
            '20% savings per cleaning',
            'Priority scheduling',
            'Same cleaner guarantee',
            'Skip or reschedule anytime',
            'Priority support',
        ],
        highlighted: true,
        cta: 'Start Weekly Plan',
    },
    {
        id: 'host',
        name: 'Host Pro',
        price: 149,
        period: 'per month',
        description: 'For Airbnb/VRBO hosts',
        features: [
            'Unlimited turnover cleanings',
            'Calendar sync (Airbnb, VRBO)',
            'Auto-scheduling between guests',
            'Deep cleaning included',
            'Laundry & linen service',
            'Dedicated account manager',
        ],
        cta: 'Contact Sales',
    },
];

interface PricingPageProps {
    onBack?: () => void;
}

export default function PricingPage({ onBack }: PricingPageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingTier, setLoadingTier] = useState<string | null>(null);
    const { status } = useSession();
    const router = useRouter();

    // Business assumption (confirm w/ Grant): tier id -> backend plan slug.
    const PLAN_MAP: Record<string, string> = {
        basic: 'pay_as_you_go',
        pro: 'weekly_clean',
        host: 'host_pro',
    };

    const handleSubscribe = async (tierId: string) => {
        const plan = PLAN_MAP[tierId];
        if (!plan) return;

        // Not signed in: don't fire the auth-required checkout call; send
        // them to register and bring them back to pricing afterwards.
        if (status !== 'authenticated') {
            router.push('/register?callbackUrl=/pricing');
            return;
        }

        setIsLoading(true);
        setLoadingTier(tierId);

        try {
            const data = await api.payments.createCheckoutSession(plan);
            const url = data?.url || data?.sessionId;
            if (url) {
                window.location.href = url;
            } else {
                alert('Unable to start checkout. Please try again.');
            }
        } catch {
            alert('Unable to connect to payment service.');
        } finally {
            setIsLoading(false);
            setLoadingTier(null);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                {onBack && (
                    <button className={styles.back} onClick={onBack}>← Back</button>
                )}
                <header className={styles.header}>
                    <h1>Simple, Transparent Pricing</h1>
                    <p>No hidden fees. Satisfaction guaranteed.</p>
                </header>

                <div className={styles.grid}>
                    {PRICING_TIERS.map(tier => (
                        <div key={tier.id} className={`${styles.card} ${tier.highlighted ? styles.highlighted : ''}`}>
                            {tier.highlighted && <div className={styles.popular}>Best Value</div>}
                            <div className={styles.tierHeader}>
                                <h2>{tier.name}</h2>
                                <p>{tier.description}</p>
                            </div>
                            <div className={styles.price}>
                                <span className={styles.currency}>$</span>
                                <span className={styles.amount}>{tier.price}</span>
                                <span className={styles.period}>{tier.period}</span>
                            </div>
                            <ul className={styles.features}>
                                {tier.features.map((f, i) => <li key={i}>✓ {f}</li>)}
                            </ul>
                            <button
                                className={`${styles.btn} ${tier.highlighted ? styles.primary : styles.secondary}`}
                                onClick={() => handleSubscribe(tier.id)}
                                disabled={isLoading && loadingTier === tier.id}
                            >
                                {isLoading && loadingTier === tier.id ? '...' : tier.cta}
                            </button>
                        </div>
                    ))}
                </div>

                <p className={styles.note}>All prices in USD. Weekly/monthly plans can be cancelled anytime.</p>
            </div>
        </div>
    );
}
