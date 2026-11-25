from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.document import DocumentResponse


class SavedPaperCreate(BaseModel):
    notes: Optional[str] = None


class SavedPaperResponse(BaseModel):
    id: int
    document_id: int
    notes: Optional[str] = None
    created_at: datetime
    document: DocumentResponse

    model_config = ConfigDict(from_attributes=True)
