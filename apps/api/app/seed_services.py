"""
Service Category Seed Script for BookACleaner.ai
Seeds the 7-tier service taxonomy per DNA Strand Master Plan.
Run: python -m app.seed_services
"""
import asyncio
import logging
from app.database import connect_db, disconnect_db, get_db_session
from app.models import ServiceCategory, Service, generate_uuid

logger = logging.getLogger(__name__)

CATEGORIES = [
    {
        "name": "Standard Cleaning",
        "tier": 1,
        "description": "General house cleaning — dusting, vacuuming, mopping, kitchens and bathrooms.",
        "icon": "🏠",
        "requires_cert": False,
        "display_order": 1,
        "services": [
            {"name": "Standard Clean", "pricing_model": "flat", "base_price": 100, "estimated_minutes": 120},
            {"name": "Express Clean", "pricing_model": "flat", "base_price": 80, "estimated_minutes": 60},
            {"name": "Recurring Weekly", "pricing_model": "flat", "base_price": 90, "estimated_minutes": 120},
            {"name": "Recurring Bi-Weekly", "pricing_model": "flat", "base_price": 95, "estimated_minutes": 120},
        ],
    },
    {
        "name": "Deep Cleaning",
        "tier": 2,
        "description": "Intensive cleaning — inside appliances, baseboards, blinds, cabinets.",
        "icon": "✨",
        "requires_cert": False,
        "display_order": 2,
        "services": [
            {"name": "Full Deep Clean", "pricing_model": "per_sqft", "base_price": 180, "price_per_sqft": 0.12, "estimated_minutes": 240},
            {"name": "Kitchen Deep Clean", "pricing_model": "flat", "base_price": 120, "estimated_minutes": 150},
            {"name": "Bathroom Deep Clean", "pricing_model": "flat", "base_price": 80, "estimated_minutes": 90},
        ],
    },
    {
        "name": "Move In/Out",
        "tier": 3,
        "description": "Heavy-duty cleaning for property transitions — empty or occupied.",
        "icon": "📦",
        "requires_cert": False,
        "display_order": 3,
        "services": [
            {"name": "Move-Out Clean", "pricing_model": "per_sqft", "base_price": 250, "price_per_sqft": 0.15, "estimated_minutes": 300},
            {"name": "Move-In Clean", "pricing_model": "per_sqft", "base_price": 200, "price_per_sqft": 0.12, "estimated_minutes": 240},
            {"name": "Post-Renovation Clean", "pricing_model": "flat", "base_price": 350, "estimated_minutes": 360},
        ],
    },
    {
        "name": "Airbnb / Turnover",
        "tier": 4,
        "description": "Vacation rental turnover — quick, thorough, linen change, restocking.",
        "icon": "🏡",
        "requires_cert": False,
        "display_order": 4,
        "services": [
            {"name": "Airbnb Turnover", "pricing_model": "flat", "base_price": 120, "estimated_minutes": 90},
            {"name": "Linen Change Only", "pricing_model": "flat", "base_price": 40, "estimated_minutes": 30},
            {"name": "Full Turnover + Restock", "pricing_model": "flat", "base_price": 160, "estimated_minutes": 120},
        ],
    },
    {
        "name": "Specialty Cleaning",
        "tier": 5,
        "description": "Carpet, windows, pressure washing, garage — requires specialized equipment.",
        "icon": "🧹",
        "requires_cert": False,
        "display_order": 5,
        "services": [
            {"name": "Carpet Cleaning", "pricing_model": "per_sqft", "base_price": 80, "price_per_sqft": 0.25, "estimated_minutes": 120},
            {"name": "Window Cleaning", "pricing_model": "flat", "base_price": 60, "estimated_minutes": 90},
            {"name": "Pressure Washing", "pricing_model": "per_hour", "base_price": 75, "price_per_hour": 75, "estimated_minutes": 120},
            {"name": "Garage Clean-Out", "pricing_model": "flat", "base_price": 150, "estimated_minutes": 180},
        ],
    },
    {
        "name": "Commercial / Office",
        "tier": 6,
        "description": "Office buildings, retail spaces, medical offices — may require insurance.",
        "icon": "🏢",
        "requires_cert": True,
        "required_certs": ["insurance"],
        "display_order": 6,
        "services": [
            {"name": "Office Clean", "pricing_model": "per_sqft", "base_price": 150, "price_per_sqft": 0.08, "estimated_minutes": 180},
            {"name": "Retail Space Clean", "pricing_model": "per_sqft", "base_price": 120, "price_per_sqft": 0.07, "estimated_minutes": 150},
            {"name": "Medical Office Clean", "pricing_model": "per_sqft", "base_price": 200, "price_per_sqft": 0.12, "estimated_minutes": 180},
        ],
    },
    {
        "name": "Hazardous / Certified",
        "tier": 7,
        "description": "Biohazard, mold remediation, hoarding — requires EPA/OSHA/IICRC certifications.",
        "icon": "⚠️",
        "requires_cert": True,
        "required_certs": ["iicrc", "epa", "osha"],
        "display_order": 7,
        "services": [
            {"name": "Mold Remediation", "pricing_model": "per_hour", "base_price": 300, "price_per_hour": 150, "estimated_minutes": 480},
            {"name": "Biohazard Cleanup", "pricing_model": "per_hour", "base_price": 400, "price_per_hour": 200, "estimated_minutes": 480},
            {"name": "Hoarding Cleanup", "pricing_model": "flat", "base_price": 500, "estimated_minutes": 600},
        ],
    },
]


async def seed():
    await connect_db()
    db = await get_db_session()

    try:
        # Check if already seeded
        existing = await db.service_category.find_many()
        if existing:
            logger.info(f"Service categories already seeded ({len(existing)} found). Skipping.")
            return

        for cat_data in CATEGORIES:
            services_data = cat_data.pop("services")
            cat = await db.service_category.create(data={
                "id": generate_uuid(),
                **{k: v for k, v in cat_data.items() if k != "required_certs"},
                "required_certs": cat_data.get("required_certs", []),
            })
            logger.info(f"Created category: {cat_data['name']} (Tier {cat_data['tier']})")

            for svc_data in services_data:
                await db.service.create(data={
                    "id": generate_uuid(),
                    "category_id": cat["id"],
                    **svc_data,
                })
                logger.info(f"  → Service: {svc_data['name']}")

        logger.info("✅ Service categories seeded successfully!")
    finally:
        await disconnect_db()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed())
""", "Complexity": 5, "Description": "Service category seed script with the DNA strand 7-tier taxonomy — 7 categories with 24 services total", "EmptyFile": false, "IsArtifact": false, "Overwrite": false}
