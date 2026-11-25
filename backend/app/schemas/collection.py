from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.document import DocumentResponse


class CollectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    color: Optional[str] = Field(default="#315EAB", max_length=50)


class CollectionUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    color: Optional[str] = Field(default=None, max_length=50)


class CollectionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#315EAB"
    document_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CollectionDetailResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#315EAB"
    documents: List[DocumentResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
