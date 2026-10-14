"""Idempotent seed: demo account + its demonstration scenarios. Run: cd /app/backend && python seed.py"""

import asyncio
import os
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

from lib.auth import hash_password
from lib.db import db, ensure_indexes
from routers.auth import create_demo_runs

DEMO_EMAIL = "demo@solargrid.ai"
DEMO_PASSWORD = "SolarDemo2026!"


async def main() -> None:
    await ensure_indexes()
    user = await db.users.find_one({"email": DEMO_EMAIL})
    if not user:
        user = {"id": str(uuid.uuid4()), "email": DEMO_EMAIL, "name": "Demo Engineer",
                "organization": "SolarGrid Demonstration Community", "currency": "USD",
                "password_hash": hash_password(DEMO_PASSWORD), "created_at": datetime.now(timezone.utc)}
        await db.users.insert_one(user)
    else:
        await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(DEMO_PASSWORD)}})
    await db.runs.delete_many({"user_id": user["id"], "is_demo": True})
    await create_demo_runs(user["id"])
    print(f"Seeded {DEMO_EMAIL}")


if __name__ == "__main__":
    asyncio.run(main())
