from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class SearchHistoryCreate(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    mode: str = Field(default="hybrid", max_length=50)
    result_count: int = Field(default=0, ge=0)
    filters_json: Optional[str] = None


class SearchHistoryResponse(BaseModel):
    id: int
    query: str
    mode: str
    result_count: int
    filters_json: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
