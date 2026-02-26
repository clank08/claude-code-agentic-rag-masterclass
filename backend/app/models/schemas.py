from pydantic import BaseModel
from datetime import datetime


class AuthenticatedUser(BaseModel):
    id: str
    email: str


class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None


class ThreadResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime


class MessageResponse(BaseModel):
    id: str
    thread_id: str
    role: str
    content: str
    created_at: datetime


class DocumentResponse(BaseModel):
    id: str
    filename: str
    mime_type: str
    file_size: int
    status: str
    error_message: str | None = None
    chunk_count: int
    created_at: datetime
    updated_at: datetime
