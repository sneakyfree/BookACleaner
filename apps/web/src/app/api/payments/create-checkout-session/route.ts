import { NextRequest, NextResponse } from 'next/server';

const PRICING_TIERS = {
    basic: { name: 'Pay As You Go', price: 89 },
    pro: { name: 'Weekly Plan', price: 69 },
    host: { name: 'Host Pro', price: 149 },
};

export async function POST(request: NextRequest) {
    const { tier_id, success_url, cancel_url } = await request.json();

    // For demo - would integrate with Stripe in production
    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json(
            { error: 'Payment service not configured' },
            { status: 503 }
        );
    }

    const tier = PRICING_TIERS[tier_id as keyof typeof PRICING_TIERS];
    if (!tier) {
        return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Mock checkout URL - in production, create Stripe session
    return NextResponse.json({
        checkout_url: `${success_url}?tier=${tier_id}`,
        session_id: `cs_demo_${Date.now()}`,
    });
}

export async function GET() {
    const tiers = Object.entries(PRICING_TIERS).map(([id, tier]) => ({
        id,
        ...tier,
    }));
    return NextResponse.json({ tiers });
}
