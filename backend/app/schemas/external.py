from typing import Optional, List
from pydantic import BaseModel, Field


class ExternalPaperResult(BaseModel):
    """Normalized research paper item from external academic repositories."""
    source: str = Field(..., description="Source repository: 'arxiv' or 'openalex'")
    external_id: str = Field(..., description="Unique repository identifier")
    title: str = Field(..., description="Paper title")
    authors: str = Field(..., description="Comma-separated author names")
    publication_year: Optional[int] = Field(None, description="Year of publication")
    abstract: Optional[str] = Field(None, description="Paper abstract")
    pdf_url: Optional[str] = Field(None, description="Direct URL to open-access PDF")
    doi: Optional[str] = Field(None, description="Digital Object Identifier")
    journal: Optional[str] = Field(None, description="Journal, conference venue, or primary topic")
    domain: Optional[str] = Field("Computer Science", description="Academic research domain")
    document_type: Optional[str] = Field("Preprint", description="Document type: article, preprint, book-chapter")
    cited_by_count: int = Field(0, description="Authoritative citation count")
    already_in_library: bool = Field(False, description="Whether paper is already saved in user's library")
    library_document_id: Optional[int] = Field(None, description="Existing document ID if already in library")


class ExternalSearchResponse(BaseModel):
    """Paginated search response for external academic literature."""
    results: List[ExternalPaperResult]
    total: int
    page: int
    page_size: int
    source: str


class ImportPaperRequest(BaseModel):
    """Request payload to 1-click import an external paper into user's library."""
    source: str
    external_id: str
    pdf_url: Optional[str] = None
    title: str
    authors: Optional[str] = None
    publication_year: Optional[int] = None
    abstract: Optional[str] = None
    doi: Optional[str] = None
    journal: Optional[str] = None
    domain: Optional[str] = "Computer Science"
    document_type: Optional[str] = "Preprint"


class ImportPaperResponse(BaseModel):
    """Response returned upon initiating 1-click paper import."""
    document_id: int
    filename: str
    status: str
    is_duplicate: bool
    message: str
