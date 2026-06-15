from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    role: str
    content: str
    content_type: str
    created_at: datetime


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: Optional[str]
    model: str
    created_at: datetime
    updated_at: datetime


class ConversationWithMessages(ConversationResponse):
    messages: list[MessageResponse] = []


class ConversationCreate(BaseModel):
    model: str
    title: Optional[str] = None


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    model: str
    message: str
    audio_data: Optional[str] = None    # base64 encoded audio
    audio_format: Optional[str] = None  # webm, mp3, wav
    base_directory: Optional[str] = None  # enables file agent mode


class FileOperationRequest(BaseModel):
    base_directory: str
    path: str
    content: Optional[str] = None
    destination: Optional[str] = None
