'use client';

import { useState, useMemo } from 'react';
import styles from './FAQPage.module.css';

interface FAQ {
    question: string;
    answer: string;
}

interface FAQCategory {
    id: string;
    title: string;
    icon: string;
    faqs: FAQ[];
}

const FAQ_CATEGORIES: FAQCategory[] = [
    {
        id: 'booking',
        title: 'Booking & Scheduling',
        icon: '📅',
        faqs: [
            { question: 'How do I book a cleaning?', answer: 'Simply enter your address, select your property type, choose a date and time, and confirm. You\'ll be matched with a verified cleaner instantly.' },
            { question: 'Can I book same-day cleaning?', answer: 'Yes! We offer same-day bookings based on cleaner availability. Book before 10 AM for same-day service.' },
            { question: 'How do I reschedule or cancel?', answer: 'Reschedule or cancel free of charge up to 24 hours before your appointment via your dashboard or the app.' },
            { question: 'Do you service Airbnb turnovers?', answer: 'Yes! We specialize in Airbnb/VRBO turnovers with calendar sync. Automatic bookings between guests.' },
        ],
    },
    {
        id: 'pricing',
        title: 'Pricing & Payment',
        icon: '💰',
        faqs: [
            { question: 'How much does cleaning cost?', answer: 'Pricing starts at $89 for standard home cleaning. Exact price depends on property size, cleaning type, and frequency.' },
            { question: 'What payment methods do you accept?', answer: 'We accept all major credit cards, debit cards, and Apple Pay. Payment is processed after the cleaning is complete.' },
            { question: 'Are there subscription discounts?', answer: 'Yes! Weekly bookings save 20%, bi-weekly saves 15%, and monthly saves 10% compared to one-time cleanings.' },
            { question: 'Is there a satisfaction guarantee?', answer: 'Absolutely. If you\'re not happy, we\'ll re-clean for free within 24 hours or refund the difference.' },
        ],
    },
    {
        id: 'cleaners',
        title: 'Our Cleaners',
        icon: '👷',
        faqs: [
            { question: 'Are cleaners background checked?', answer: 'Every cleaner passes comprehensive background checks, identity verification, and reference checks before joining.' },
            { question: 'Can I request the same cleaner?', answer: 'Yes! You can favorite cleaners and request them for future bookings. Build long-term relationships.' },
            { question: 'What if I have a problem with my cleaner?', answer: 'Contact us immediately. We\'ll resolve issues within 24 hours and can assign a different cleaner if needed.' },
            { question: 'Do cleaners bring supplies?', answer: 'Cleaners bring basic supplies. You can request they use your products, or upgrade to our eco-friendly premium supplies.' },
        ],
    },
    {
        id: 'become-cleaner',
        title: 'Become a Cleaner',
        icon: '✨',
        faqs: [
            { question: 'How do I become a cleaner?', answer: 'Apply online, complete our background check, pass the skills assessment, and you can start earning within 48 hours.' },
            { question: 'What are the requirements?', answer: 'Must be 18+, have cleaning experience, pass background check, and have reliable transportation.' },
            { question: 'How much can I earn?', answer: 'Top cleaners earn $25-45/hour. You set your schedule, choose jobs, and get paid weekly via direct deposit.' },
            { question: 'Do I need my own supplies?', answer: 'You\'ll need basic cleaning supplies and transportation. We provide training and job matching.' },
        ],
    },
    {
        id: 'services',
        title: 'Service Types',
        icon: '🏠',
        faqs: [
            { question: 'What\'s included in standard cleaning?', answer: 'Dusting, vacuuming, mopping, bathroom sanitization, kitchen cleaning, and trash removal. Full checklist provided.' },
            { question: 'What\'s deep cleaning?', answer: 'Everything in standard plus: inside appliances, baseboards, window interiors, inside cabinets, and detailed scrubbing.' },
            { question: 'Do you offer move-in/move-out cleaning?', answer: 'Yes! Comprehensive cleaning for rental transitions. We work with landlords, property managers, and tenants.' },
            { question: 'Can I customize my cleaning?', answer: 'Absolutely. Add extras like laundry, inside fridge, oven cleaning, or skip areas you don\'t need cleaned.' },
        ],
    },
    {
        id: 'platform',
        title: 'Platform & Support',
        icon: '📱',
        faqs: [
            { question: 'Is there a mobile app?', answer: 'Yes! Download BookACleaner on iOS and Android for easy booking, real-time tracking, and instant messaging.' },
            { question: 'How do I contact support?', answer: 'Use the AI chat, email support@bookacleaner.com, or call our 24/7 support line. We respond within 1 hour.' },
            { question: 'What areas do you service?', answer: 'We\'re available in 50+ major metro areas and expanding rapidly. Enter your zip code to check availability.' },
            { question: 'Is my data secure?', answer: 'Yes. We use bank-level encryption, never share your data, and comply with GDPR and CCPA regulations.' },
        ],
    },
];

interface FAQPageProps {
    onBack?: () => void;
}

export default function FAQPage({ onBack }: FAQPageProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [openItems, setOpenItems] = useState<Set<string>>(new Set());

    const toggleItem = (id: string) => {
        setOpenItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return FAQ_CATEGORIES;
        const query = searchQuery.toLowerCase();
        return FAQ_CATEGORIES.map(cat => ({
            ...cat,
            faqs: cat.faqs.filter(f => f.question.toLowerCase().includes(query) || f.answer.toLowerCase().includes(query)),
        })).filter(cat => cat.faqs.length > 0);
    }, [searchQuery]);

    const count = filteredCategories.reduce((a, c) => a + c.faqs.length, 0);

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                {onBack && (
                    <button className={styles.back} onClick={onBack}>← Back</button>
                )}
                <header className={styles.header}>
                    <h1>Frequently Asked Questions</h1>
                    <p>Everything you need to know about BookACleaner</p>
                </header>

                <div className={styles.search}>
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search questions..." />
                    {searchQuery && <span className={styles.count}>{count} results</span>}
                </div>

                <div className={styles.content}>
                    {count === 0 ? (
                        <div className={styles.empty}><h3>No questions found</h3><p>Try a different search term.</p></div>
                    ) : (
                        filteredCategories.map(cat => (
                            <div key={cat.id} className={styles.category}>
                                <div className={styles.categoryHeader}>
                                    <span className={styles.icon}>{cat.icon}</span>
                                    <h2>{cat.title}</h2>
                                    <span className={styles.badge}>{cat.faqs.length}</span>
                                </div>
                                <div className={styles.items}>
                                    {cat.faqs.map((faq, i) => {
                                        const id = `${cat.id}-${i}`;
                                        const isOpen = openItems.has(id);
                                        return (
                                            <div key={i} className={`${styles.item} ${isOpen ? styles.open : ''}`}>
                                                <button className={styles.question} onClick={() => toggleItem(id)}>
                                                    <span>{faq.question}</span>
                                                    <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
                                                </button>
                                                {isOpen && <div className={styles.answer}><p>{faq.answer}</p></div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
