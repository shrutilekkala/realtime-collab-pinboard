from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    board_id: int
    text: str
    x: float
    y: float
    color: str
    updated_at: datetime


class NoteCreate(BaseModel):
    text: str = "New note"
    x: float = 0
    y: float = 0
    color: str = "#fff9b0"


class NoteUpdate(BaseModel):
    text: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    color: Optional[str] = None


class BoardCreate(BaseModel):
    name: str = "My Board"


class BoardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime
    notes: list[NoteOut] = []
