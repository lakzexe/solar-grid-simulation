from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=80)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    organization: str = ""
    currency: str = "LKR"
    created_at: datetime


class ProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    organization: str = Field(default="", max_length=120)
    currency: str = Field(min_length=1, max_length=6)


class IntegrationStatus(BaseModel):
    key: str
    label: str
    status: str  # "not_connected" | "demo" | "connected"
    detail: str


class MessageResponse(BaseModel):
    message: str
