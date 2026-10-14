import os
from motor.motor_asyncio import AsyncIOMotorClient

_client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://127.0.0.1:27017"))
db = _client[os.getenv("DB_NAME", "solargrid")]


async def ensure_indexes() -> None:
    await db.users.create_index("email", unique=True)
    await db.runs.create_index([("user_id", 1), ("created_at", -1)])
