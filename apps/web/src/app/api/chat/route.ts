import { NextRequest, NextResponse } from 'next/server';

const KNOWLEDGE: Record<string, string> = {
    book: "Simply enter your address, select property type, choose date/time, and confirm. You'll be matched with a verified cleaner instantly.",
    price: "Standard cleaning starts at $89. Weekly plans save 20% ($69/cleaning). Host Pro for Airbnb is $149/month unlimited.",
    cleaner: "All cleaners pass comprehensive background checks, identity verification, and reference checks. You can request the same cleaner each time.",
    guarantee: "100% satisfaction guarantee. If you're not happy, we re-clean free within 24 hours or refund the difference.",
    airbnb: "Host Pro syncs with Airbnb/VRBO calendars for automatic turnover scheduling between guests.",
    cancel: "Reschedule or cancel free up to 24 hours before your appointment via your dashboard or app.",
};

export async function POST(request: NextRequest) {
    const { message } = await request.json();
    const msg = message.toLowerCase();

    let response: string;

    if (msg.includes('book') || msg.includes('schedule') || msg.includes('how')) {
        response = KNOWLEDGE.book;
    } else if (msg.includes('price') || msg.includes('cost') || msg.includes('pay')) {
        response = KNOWLEDGE.price;
    } else if (msg.includes('cleaner') || msg.includes('who') || msg.includes('background')) {
        response = KNOWLEDGE.cleaner;
    } else if (msg.includes('guarantee') || msg.includes('refund') || msg.includes('happy')) {
        response = KNOWLEDGE.guarantee;
    } else if (msg.includes('airbnb') || msg.includes('host') || msg.includes('turnover')) {
        response = KNOWLEDGE.airbnb;
    } else if (msg.includes('cancel') || msg.includes('reschedule')) {
        response = KNOWLEDGE.cancel;
    } else {
        response = "I can help with: booking, pricing, our cleaners, satisfaction guarantee, Airbnb hosting, and cancellations. What would you like to know?";
    }

    return NextResponse.json({
        response,
        session_id: `sess_${Date.now()}`,
    });
}
