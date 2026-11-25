from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AcademicMetadataSchema(BaseModel):
    title: Optional[str] = None
    authors: Optional[str] = None
    publication_year: Optional[int] = None
    abstract: Optional[str] = None
    doi: Optional[str] = None
    journal: Optional[str] = None
    domain: Optional[str] = None
    document_type: Optional[str] = None


class DocumentChunkResponse(BaseModel):
    id: int
    document_id: int
    chunk_index: int
    page_number: int
    text: str
    token_count: int
    content_hash: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentResponse(BaseModel):
    id: int
    filename: str
    file_size: int
    mime_type: str
    sha256_hash: str
    status: str
    error_message: Optional[str] = None
    title: Optional[str] = None
    authors: Optional[str] = None
    publication_year: Optional[int] = None
    abstract: Optional[str] = None
    doi: Optional[str] = None
    journal: Optional[str] = None
    domain: Optional[str] = None
    document_type: Optional[str] = None
    total_pages: int
    total_chunks: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentStatusResponse(BaseModel):
    id: int
    filename: str
    status: str
    error_message: Optional[str] = None
    title: Optional[str] = None
    authors: Optional[str] = None
    publication_year: Optional[int] = None
    doi: Optional[str] = None
    domain: Optional[str] = None
    document_type: Optional[str] = None
    total_pages: int
    total_chunks: int

    model_config = ConfigDict(from_attributes=True)


class DocumentUploadResponse(BaseModel):
    id: int
    filename: str
    status: str
    sha256_hash: str
    is_duplicate: bool = False
    message: str

    model_config = ConfigDict(from_attributes=True)
