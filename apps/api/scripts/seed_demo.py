"""
Comprehensive Demo Data Seeder
Creates rich demo scenarios for BookACleaner
"""

import asyncio
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any
import uuid
import hashlib

# Demo user data
DEMO_CLIENTS = [
    {"name": "Sarah Mitchell", "email": "sarah@example.com", "location": "San Francisco, CA"},
    {"name": "James Thompson", "email": "james@example.com", "location": "Los Angeles, CA"},
    {"name": "Emily Rodriguez", "email": "emily@example.com", "location": "San Diego, CA"},
    {"name": "Michael Chen", "email": "michael@example.com", "location": "Seattle, WA"},
    {"name": "Jessica Williams", "email": "jessica@example.com", "location": "Portland, OR"},
    {"name": "David Park", "email": "david@example.com", "location": "Denver, CO"},
    {"name": "Amanda Foster", "email": "amanda@example.com", "location": "Austin, TX"},
    {"name": "Ryan Martinez", "email": "ryan@example.com", "location": "Phoenix, AZ"},
]

DEMO_CLEANERS = [
    {"name": "Maria Garcia", "email": "maria@cleaner.example", "tier": 5, "rating": 4.9, "jobs": 342},
    {"name": "Carlos Rodriguez", "email": "carlos@cleaner.example", "tier": 4, "rating": 4.8, "jobs": 256},
    {"name": "Lisa Johnson", "email": "lisa@cleaner.example", "tier": 4, "rating": 4.7, "jobs": 198},
    {"name": "Ahmed Hassan", "email": "ahmed@cleaner.example", "tier": 3, "rating": 4.6, "jobs": 145},
    {"name": "Sophie Chen", "email": "sophie@cleaner.example", "tier": 5, "rating": 4.9, "jobs": 387},
    {"name": "Marcus Williams", "email": "marcus@cleaner.example", "tier": 3, "rating": 4.5, "jobs": 112},
    {"name": "Elena Petrov", "email": "elena@cleaner.example", "tier": 4, "rating": 4.8, "jobs": 234},
    {"name": "Thomas Brown", "email": "thomas@cleaner.example", "tier": 2, "rating": 4.3, "jobs": 67},
]

PROPERTY_TYPES = ["apartment", "house", "condo", "office", "airbnb"]
SERVICE_TYPES = ["standard", "deep", "move_in", "move_out", "turnover", "custom"]
JOB_STATUSES = ["pending", "confirmed", "in_progress", "completed", "cancelled"]

SPECIAL_REQUESTS = [
    "Please use eco-friendly products",
    "Pet-friendly cleaning needed - we have two dogs",
    "Focus on kitchen and bathrooms",
    "Please don't move any items on the desk",
    "Extra attention to windows please",
    "Child-safe cleaning products only",
    "We'll leave a key under the mat",
    None,  # No special requests
]

REVIEW_COMMENTS = [
    "Absolutely fantastic job! Maria is incredibly thorough and professional.",
    "Great attention to detail. Will definitely book again!",
    "Very punctual and efficient. Left the place sparkling clean.",
    "Exceeded expectations. Highly recommend!",
    "Good service overall. A few areas could use more attention.",
    "Professional and courteous. The house smells amazing now!",
    "Reliable and trustworthy. Been using this service for months.",
    "Best cleaning service I've ever used. 5 stars!",
]


def generate_id() -> str:
    """Generate a unique ID"""
    return str(uuid.uuid4())


def generate_password_hash(password: str) -> str:
    """Generate a simple password hash for demo"""
    return hashlib.sha256(password.encode()).hexdigest()


def random_date(start_days_ago: int = 90, end_days_ago: int = 0) -> datetime:
    """Generate a random date within range"""
    start = datetime.now() - timedelta(days=start_days_ago)
    end = datetime.now() - timedelta(days=end_days_ago)
    delta = end - start
    random_days = random.randint(0, delta.days)
    return start + timedelta(days=random_days)


def generate_demo_properties(clients: List[Dict]) -> List[Dict]:
    """Generate demo properties for clients"""
    properties = []
    
    addresses = [
        "123 Main St", "456 Oak Ave", "789 Elm Blvd", "321 Pine Rd",
        "654 Maple Dr", "987 Cedar Ln", "147 Birch Way", "258 Spruce Ct",
    ]
    
    for i, client in enumerate(clients):
        num_properties = random.randint(1, 3)
        for j in range(num_properties):
            properties.append({
                "id": generate_id(),
                "client_id": client["id"],
                "address": f"{addresses[(i + j) % len(addresses)]}, {client['location']}",
                "property_type": random.choice(PROPERTY_TYPES),
                "bedrooms": random.randint(1, 5),
                "bathrooms": random.randint(1, 4),
                "sqft": random.randint(500, 4000),
                "has_pets": random.choice([True, False]),
                "access_instructions": random.choice([
                    "Doorman will let you in",
                    "Code is 1234",
                    "Key under the mat",
                    "Ring doorbell",
                    None,
                ]),
                "created_at": random_date(180, 30).isoformat(),
            })
    
    return properties


def generate_demo_jobs(
    clients: List[Dict],
    cleaners: List[Dict],
    properties: List[Dict],
) -> List[Dict]:
    """Generate demo jobs with various statuses"""
    jobs = []
    
    for _ in range(50):  # Generate 50 demo jobs
        client = random.choice(clients)
        cleaner = random.choice(cleaners)
        client_properties = [p for p in properties if p["client_id"] == client["id"]]
        if not client_properties:
            continue
        
        property_data = random.choice(client_properties)
        scheduled_date = random_date(60, -14)  # Some in future
        
        status = random.choices(
            JOB_STATUSES,
            weights=[10, 20, 10, 50, 10],  # Most jobs completed
        )[0]
        
        # Completed jobs get completed_at
        completed_at = None
        if status == "completed":
            completed_at = (scheduled_date + timedelta(hours=random.randint(2, 5))).isoformat()
        
        jobs.append({
            "id": generate_id(),
            "client_id": client["id"],
            "cleaner_id": cleaner["id"],
            "property_id": property_data["id"],
            "service_type": random.choice(SERVICE_TYPES),
            "status": status,
            "scheduled_date": scheduled_date.date().isoformat(),
            "scheduled_time": f"{random.randint(8, 16):02d}:00",
            "estimated_hours": random.choice([2, 2.5, 3, 3.5, 4, 5]),
            "price": round(random.uniform(80, 350), 2),
            "special_requests": random.choice(SPECIAL_REQUESTS),
            "urgency": random.choice(["normal", "urgent", "flexible"]),
            "created_at": (scheduled_date - timedelta(days=random.randint(1, 14))).isoformat(),
            "completed_at": completed_at,
        })
    
    return jobs


def generate_demo_reviews(jobs: List[Dict], clients: List[Dict]) -> List[Dict]:
    """Generate reviews for completed jobs"""
    reviews = []
    
    completed_jobs = [j for j in jobs if j["status"] == "completed"]
    
    for job in completed_jobs:
        if random.random() < 0.7:  # 70% leave reviews
            reviews.append({
                "id": generate_id(),
                "job_id": job["id"],
                "client_id": job["client_id"],
                "cleaner_id": job["cleaner_id"],
                "rating": random.choices([3, 4, 5], weights=[5, 25, 70])[0],
                "comment": random.choice(REVIEW_COMMENTS),
                "created_at": job["completed_at"],
            })
    
    return reviews


def generate_demo_messages(
    clients: List[Dict],
    cleaners: List[Dict],
) -> List[Dict]:
    """Generate demo message conversations"""
    messages = []
    
    greetings = [
        "Hi! I'm interested in booking a cleaning for next week.",
        "Hello, is this time slot still available?",
        "I have a question about your services.",
    ]
    
    responses = [
        "Of course! I'd be happy to help. What day works best for you?",
        "Yes, that slot is available. Would you like me to book it?",
        "Sure, feel free to ask. What would you like to know?",
    ]
    
    for _ in range(20):  # 20 conversations
        client = random.choice(clients)
        cleaner = random.choice(cleaners)
        conversation_id = generate_id()
        base_time = random_date(30, 0)
        
        # Initial message from client
        messages.append({
            "id": generate_id(),
            "conversation_id": conversation_id,
            "sender_id": client["id"],
            "receiver_id": cleaner["id"],
            "content": random.choice(greetings),
            "is_read": True,
            "created_at": base_time.isoformat(),
        })
        
        # Response from cleaner
        messages.append({
            "id": generate_id(),
            "conversation_id": conversation_id,
            "sender_id": cleaner["id"],
            "receiver_id": client["id"],
            "content": random.choice(responses),
            "is_read": random.choice([True, False]),
            "created_at": (base_time + timedelta(minutes=random.randint(5, 120))).isoformat(),
        })
    
    return messages


def seed_demo_data() -> Dict[str, Any]:
    """
    Generate complete demo dataset
    Returns dictionary with all demo entities
    """
    # Create clients
    clients = []
    for i, client_data in enumerate(DEMO_CLIENTS):
        clients.append({
            "id": generate_id(),
            "email": client_data["email"],
            "name": client_data["name"],
            "password_hash": generate_password_hash("demo123"),
            "role": "client",
            "phone": f"+1555{random.randint(1000000, 9999999)}",
            "location": client_data["location"],
            "created_at": random_date(180, 90).isoformat(),
            "is_verified": True,
        })
    
    # Create cleaners
    cleaners = []
    for cleaner_data in DEMO_CLEANERS:
        cleaners.append({
            "id": generate_id(),
            "email": cleaner_data["email"],
            "name": cleaner_data["name"],
            "password_hash": generate_password_hash("demo123"),
            "role": "cleaner",
            "phone": f"+1555{random.randint(1000000, 9999999)}",
            "verification_tier": cleaner_data["tier"],
            "rating": cleaner_data["rating"],
            "jobs_completed": cleaner_data["jobs"],
            "hourly_rate": round(random.uniform(25, 65), 2),
            "bio": f"Professional cleaner with {cleaner_data['jobs']} completed jobs.",
            "service_radius_miles": random.choice([10, 15, 25, 50]),
            "created_at": random_date(365, 180).isoformat(),
            "is_verified": True,
            "background_check_status": "passed",
        })
    
    # Generate related data
    properties = generate_demo_properties(clients)
    jobs = generate_demo_jobs(clients, cleaners, properties)
    reviews = generate_demo_reviews(jobs, clients)
    messages = generate_demo_messages(clients, cleaners)
    
    return {
        "clients": clients,
        "cleaners": cleaners,
        "properties": properties,
        "jobs": jobs,
        "reviews": reviews,
        "messages": messages,
        "summary": {
            "total_clients": len(clients),
            "total_cleaners": len(cleaners),
            "total_properties": len(properties),
            "total_jobs": len(jobs),
            "total_reviews": len(reviews),
            "total_messages": len(messages),
        },
    }


async def run_seeder():
    """Run the demo data seeder"""
    print("🌱 Starting demo data seeder...")
    
    data = seed_demo_data()
    
    print(f"✅ Generated {data['summary']['total_clients']} clients")
    print(f"✅ Generated {data['summary']['total_cleaners']} cleaners")
    print(f"✅ Generated {data['summary']['total_properties']} properties")
    print(f"✅ Generated {data['summary']['total_jobs']} jobs")
    print(f"✅ Generated {data['summary']['total_reviews']} reviews")
    print(f"✅ Generated {data['summary']['total_messages']} messages")
    print("\n🎉 Demo data seeding complete!")
    
    return data


if __name__ == "__main__":
    asyncio.run(run_seeder())
