'use client';

import { useState } from 'react';
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

    const handleSubscribe = async (tierId: string) => {
        if (tierId === 'host') {
            window.location.href = 'mailto:sales@bookacleaner.com?subject=Host%20Pro%20Inquiry';
            return;
        }
        if (tierId === 'basic') {
            window.location.href = '/book';
            return;
        }

        setIsLoading(true);
        setLoadingTier(tierId);

        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/v1/payments/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    tier_id: tierId,
                    success_url: window.location.origin + '/?subscription=success',
                    cancel_url: window.location.origin + '/pricing',
                }),
            });

            const data = await response.json();
            if (data.session_url || data.checkout_url || data.url) {
                window.location.href = data.session_url || data.checkout_url || data.url;
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
