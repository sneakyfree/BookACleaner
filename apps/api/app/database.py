"""
Database module for BookACleaner.ai
Uses SQLite with SQLAlchemy for persistent storage
"""
import logging
import os
from typing import Optional, Any, Dict, List
from datetime import datetime, timedelta
import uuid
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, update, delete, and_, or_
from sqlalchemy.orm import selectinload

from app.models import (
    Base, User, CleanerProfile, ClientProfile, Property, Job, 
    Review, Message, Conversation, ConversationParticipant,
    Verification, Certification, PasswordReset, EmailVerification,
    PhoneVerification, Notification
)

logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./bookacleaner.db")

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",
    future=True
)

# Create async session factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


class Database:
    """
    SQLAlchemy-based database wrapper providing a clean API
    """
    
    def __init__(self):
        self._connected = False
    
    async def connect(self):
        """Create all tables and mark as connected"""
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        self._connected = True
        logger.info("Database connected and tables created")
        
        # Seed demo data if empty
        await self._seed_if_empty()
    
    async def disconnect(self):
        """Dispose of the engine"""
        await engine.dispose()
        self._connected = False
        logger.info("Database disconnected")
    
    @property
    def is_connected(self):
        return self._connected
    
    @asynccontextmanager
    async def session(self):
        """Get a database session"""
        async with async_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
    
    async def _seed_if_empty(self):
        """Seed demo data if the database is empty"""
        async with self.session() as session:
            result = await session.execute(select(User).limit(1))
            if result.scalar_one_or_none() is None:
                await self._seed_demo_data(session)
    
    async def _seed_demo_data(self, session: AsyncSession):
        """Seed the database with demo data"""
        import bcrypt
        
        logger.info("Seeding demo data...")
        
        # Create demo password hash
        demo_password = bcrypt.hashpw("demo1234".encode(), bcrypt.gensalt()).decode()
        
        # Demo client user
        client_user = User(
            id="user-client-1",
            email="client@demo.com",
            password_hash=demo_password,
            role="client",
            full_name="John Client",
            phone="+1234567890",
            is_verified=True,
            email_verified_at=datetime.utcnow()
        )
        session.add(client_user)
        
        # Demo cleaner users
        cleaner_users = [
            User(
                id="user-cleaner-1",
                email="maria@demo.com",
                password_hash=demo_password,
                role="cleaner",
                full_name="Maria Santos",
                phone="+1987654321",
                is_verified=True,
                email_verified_at=datetime.utcnow()
            ),
            User(
                id="user-cleaner-2",
                email="sarah@demo.com",
                password_hash=demo_password,
                role="cleaner",
                full_name="Sarah Johnson",
                phone="+1555123456",
                is_verified=True,
                email_verified_at=datetime.utcnow()
            ),
            User(
                id="user-cleaner-3",
                email="james@demo.com",
                password_hash=demo_password,
                role="cleaner",
                full_name="James Wilson",
                phone="+1555987654",
                is_verified=True,
                email_verified_at=datetime.utcnow()
            ),
        ]
        for u in cleaner_users:
            session.add(u)
        
        # Admin user
        admin_user = User(
            id="user-admin-1",
            email="admin@bookacleaner.ai",
            password_hash=demo_password,
            role="admin",
            full_name="Admin User",
            is_verified=True,
            email_verified_at=datetime.utcnow()
        )
        session.add(admin_user)
        
        await session.flush()
        
        # Client profile
        client_profile = ClientProfile(
            id="client-1",
            user_id="user-client-1",
            display_name="John Client",
            verification_tier=2
        )
        session.add(client_profile)
        
        # Cleaner profiles
        cleaner_profiles = [
            CleanerProfile(
                id="cleaner-1",
                user_id="user-cleaner-1",
                business_name="Maria's Premium Cleaning",
                bio="Professional cleaner with 8 years experience. Specializing in deep cleaning and move-out services. Fully insured and bonded.",
                hourly_rate=55.00,
                verification_tier=5,
                rating=4.95,
                review_count=234,
                completed_jobs=412,
                services=["standard", "deep", "move-out", "airbnb", "office"],
                service_areas=["Los Angeles", "Santa Monica", "Beverly Hills"]
            ),
            CleanerProfile(
                id="cleaner-2",
                user_id="user-cleaner-2",
                business_name="Sparkle Pro Cleaners",
                bio="Family-owned cleaning business. We treat every home like our own. Eco-friendly products available.",
                hourly_rate=45.00,
                verification_tier=4,
                rating=4.8,
                review_count=156,
                completed_jobs=289,
                services=["standard", "deep", "recurring"],
                service_areas=["Los Angeles", "Pasadena", "Glendale"]
            ),
            CleanerProfile(
                id="cleaner-3",
                user_id="user-cleaner-3",
                business_name="Elite Airbnb Turnover",
                bio="Specialized in vacation rental turnovers. 2-hour guaranteed turnover. Linen service available.",
                hourly_rate=65.00,
                verification_tier=5,
                rating=4.92,
                review_count=89,
                completed_jobs=156,
                services=["airbnb", "vacation-rental", "deep"],
                service_areas=["Santa Monica", "Venice", "Marina del Rey"]
            ),
        ]
        for cp in cleaner_profiles:
            session.add(cp)
        
        await session.flush()
        
        # Properties for client
        properties = [
            Property(
                id="property-1",
                client_id="client-1",
                name="Main Residence",
                address="123 Main St",
                city="Los Angeles",
                state="CA",
                zip_code="90001",
                property_type="house",
                sqft=2000,
                bedrooms=3,
                bathrooms=2.0
            ),
            Property(
                id="property-2",
                client_id="client-1",
                name="Beach Rental",
                address="456 Ocean Ave",
                city="Santa Monica",
                state="CA",
                zip_code="90401",
                property_type="condo",
                sqft=1200,
                bedrooms=2,
                bathrooms=1.5,
                airbnb_calendar_url="https://airbnb.com/calendar/ical/demo.ics"
            ),
        ]
        for p in properties:
            session.add(p)
        
        # Sample jobs
        jobs = [
            Job(
                id="job-1",
                client_id="client-1",
                cleaner_id="cleaner-1",
                property_id="property-1",
                title="Deep Clean - Main Residence",
                description="Full deep clean including carpets and windows",
                services=["deep", "carpet", "windows"],
                scheduled_date=datetime.utcnow() + timedelta(days=3),
                scheduled_time="10:00",
                estimated_hours=4.0,
                base_price=200.00,
                total_price=220.00,
                status="confirmed"
            ),
            Job(
                id="job-2",
                client_id="client-1",
                cleaner_id="cleaner-3",
                property_id="property-2",
                title="Airbnb Turnover",
                description="Standard turnover between guests",
                services=["airbnb"],
                scheduled_date=datetime.utcnow() + timedelta(days=1),
                scheduled_time="11:00",
                estimated_hours=2.0,
                base_price=130.00,
                total_price=130.00,
                status="pending"
            ),
        ]
        for j in jobs:
            session.add(j)
        
        await session.commit()
        logger.info("Demo data seeded successfully")
    
    # ==================== TABLE ACCESSORS ====================
    
    @property
    def user(self):
        return TableAccessor(self, User)
    
    @property
    def cleaner(self):
        return TableAccessor(self, CleanerProfile)
    
    @property
    def client(self):
        return TableAccessor(self, ClientProfile)
    
    @property
    def properties(self):
        return TableAccessor(self, Property)
    
    @property
    def job(self):
        return TableAccessor(self, Job)
    
    @property
    def review(self):
        return TableAccessor(self, Review)
    
    @property
    def message(self):
        return TableAccessor(self, Message)
    
    @property
    def conversation(self):
        return TableAccessor(self, Conversation)
    
    @property
    def notification(self):
        return TableAccessor(self, Notification)
    
    @property
    def verification(self):
        return TableAccessor(self, Verification)
    
    @property
    def certification(self):
        return TableAccessor(self, Certification)
    
    @property
    def password_reset(self):
        return TableAccessor(self, PasswordReset)
    
    @property
    def email_verification(self):
        return TableAccessor(self, EmailVerification)
    
    @property
    def phone_verification(self):
        return TableAccessor(self, PhoneVerification)


class TableAccessor:
    """Provides a clean API for table operations, similar to Prisma"""
    
    def __init__(self, database: Database, model):
        self._db = database
        self._model = model
    
    async def find_many(self, where: Dict = None, **kwargs) -> List[Dict]:
        """Find multiple records"""
        async with self._db.session() as session:
            query = select(self._model)
            
            if where:
                conditions = []
                for key, value in where.items():
                    if hasattr(self._model, key):
                        conditions.append(getattr(self._model, key) == value)
                if conditions:
                    query = query.where(and_(*conditions))
            
            result = await session.execute(query)
            records = result.scalars().all()
            return [self._to_dict(r) for r in records]
    
    async def find_unique(self, where: Dict) -> Optional[Dict]:
        """Find a single record by unique constraint"""
        async with self._db.session() as session:
            query = select(self._model)
            
            conditions = []
            for key, value in where.items():
                if hasattr(self._model, key):
                    conditions.append(getattr(self._model, key) == value)
            
            if conditions:
                query = query.where(and_(*conditions))
            
            result = await session.execute(query)
            record = result.scalar_one_or_none()
            return self._to_dict(record) if record else None
    
    async def find_first(self, where: Dict) -> Optional[Dict]:
        """Find the first matching record"""
        return await self.find_unique(where)
    
    async def create(self, data: Dict) -> Dict:
        """Create a new record"""
        async with self._db.session() as session:
            # Generate ID if not provided
            if "id" not in data:
                data["id"] = str(uuid.uuid4())
            
            record = self._model(**data)
            session.add(record)
            await session.flush()
            await session.refresh(record)
            return self._to_dict(record)
    
    async def update(self, where: Dict, data: Dict) -> Optional[Dict]:
        """Update a record"""
        async with self._db.session() as session:
            # Find the record first
            query = select(self._model)
            conditions = []
            for key, value in where.items():
                if hasattr(self._model, key):
                    conditions.append(getattr(self._model, key) == value)
            
            if conditions:
                query = query.where(and_(*conditions))
            
            result = await session.execute(query)
            record = result.scalar_one_or_none()
            
            if record:
                for key, value in data.items():
                    if hasattr(record, key):
                        setattr(record, key, value)
                await session.flush()
                await session.refresh(record)
                return self._to_dict(record)
            return None
    
    async def delete(self, where: Dict) -> bool:
        """Delete a record"""
        async with self._db.session() as session:
            query = delete(self._model)
            conditions = []
            for key, value in where.items():
                if hasattr(self._model, key):
                    conditions.append(getattr(self._model, key) == value)
            
            if conditions:
                query = query.where(and_(*conditions))
            
            result = await session.execute(query)
            return result.rowcount > 0
    
    async def count(self, where: Dict = None) -> int:
        """Count records"""
        from sqlalchemy import func
        async with self._db.session() as session:
            query = select(func.count()).select_from(self._model)
            
            if where:
                conditions = []
                for key, value in where.items():
                    if hasattr(self._model, key):
                        conditions.append(getattr(self._model, key) == value)
                if conditions:
                    query = query.where(and_(*conditions))
            
            result = await session.execute(query)
            return result.scalar_one()
    
    def _to_dict(self, record) -> Dict:
        """Convert a SQLAlchemy model instance to a dictionary"""
        if record is None:
            return None
        
        result = {}
        for column in record.__table__.columns:
            value = getattr(record, column.name)
            # Handle datetime serialization
            if isinstance(value, datetime):
                value = value.isoformat()
            result[column.name] = value
        return result


# Global database instance
db = Database()


async def connect_db():
    """Connect to the database"""
    await db.connect()


async def disconnect_db():
    """Disconnect from the database"""
    await db.disconnect()


async def get_db():
    """Get database client for dependency injection"""
    return db
