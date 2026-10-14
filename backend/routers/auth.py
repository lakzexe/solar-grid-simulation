import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response

from engine.simulation import run_simulation
from lib.auth import clear_session, current_user, hash_password, set_session, verify_password
from lib.db import db
from lib.defaults import demo_variants
from models.auth import LoginRequest, MessageResponse, ProfileUpdate, RegisterRequest, UserPublic
from models.sim import SimConfig, SimRun

router = APIRouter(prefix="/auth", tags=["auth"])


async def create_demo_runs(user_id: str) -> None:
    for cfg in demo_variants():
        valid = SimConfig(**cfg).model_dump()
        run = SimRun(user_id=user_id, name=valid["name"], is_demo=True, config=valid,
                     result=run_simulation(valid))
        await db.runs.insert_one(run.model_dump())


@router.post("/register", response_model=UserPublic)
async def register(body: RegisterRequest, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "An account with this email already exists")
    user = {"id": str(uuid.uuid4()), "email": email, "name": body.name, "organization": "", "currency": "LKR",
            "password_hash": hash_password(body.password), "created_at": datetime.now(timezone.utc)}
    await db.users.insert_one(user)
    await create_demo_runs(user["id"])
    set_session(response, user["id"])
    return UserPublic(**user)


@router.post("/login", response_model=UserPublic)
async def login(body: LoginRequest, response: Response):
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    set_session(response, user["id"])
    return UserPublic(**user)


@router.post("/logout", response_model=MessageResponse)
async def logout(response: Response):
    clear_session(response)
    return MessageResponse(message="Signed out")


@router.get("/me", response_model=UserPublic)
async def me(user: dict = Depends(current_user)):
    return UserPublic(**user)


@router.put("/me", response_model=UserPublic)
async def update_me(body: ProfileUpdate, user: dict = Depends(current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": body.model_dump()})
    return UserPublic(**{**user, **body.model_dump()})
