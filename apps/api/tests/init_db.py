"""
Initialize the test database with all tables.
Run this once before running tests if the DB file is missing.

Usage: cd apps/api && python -m tests.init_db
"""
import asyncio
from app.models import Base
from app.database import engine


async def main():
    print(f"Creating tables at: {engine.url}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Done — all tables created.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
