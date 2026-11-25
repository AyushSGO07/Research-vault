from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class SearchMode(str, Enum):
    hybrid = "hybrid"
    semantic = "semantic"
    keyword = "keyword"


class SearchSortBy(str, Enum):
    relevance = "relevance"
    newest = "newest"
    oldest = "oldest"


class SearchQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500, description="Natural language search query")
    mode: SearchMode = Field(default=SearchMode.hybrid, description="Search retrieval mode")
    page: int = Field(default=1, ge=1, description="Page number for pagination")
    page_size: int = Field(default=10, ge=1, le=50, description="Results per page")
    enable_reranking: bool = Field(default=False, description="Enable cross-encoder neural reranking")
    year_start: Optional[int] = Field(default=None, ge=1900, le=2099, description="Filter documents from this publication year onwards")
    year_end: Optional[int] = Field(default=None, ge=1900, le=2099, description="Filter documents up to this publication year")
    author: Optional[str] = Field(default=None, max_length=200, description="Filter documents containing this author name")
    domain: Optional[str] = Field(default=None, max_length=100, description="Filter documents by academic domain")
    document_type: Optional[str] = Field(default=None, max_length=50, description="Filter documents by document type")
    collection_id: Optional[int] = Field(default=None, description="Scope search to a specific collection")
    sort_by: Optional[str] = Field(default="relevance", pattern="^(relevance|newest|oldest)$", description="Sort order: relevance, newest, oldest")

    model_config = ConfigDict(from_attributes=True)


class MatchedPassage(BaseModel):
    chunk_id: int
    chunk_index: int
    page_number: int
    text: str
    score: float
    token_count: int
    is_reranked: bool = False

    model_config = ConfigDict(from_attributes=True)


class DocumentSearchResult(BaseModel):
    document_id: int
    title: str
    filename: str
    authors: Optional[str] = None
    publication_year: Optional[int] = None
    doi: Optional[str] = None
    domain: Optional[str] = None
    document_type: Optional[str] = None
    total_pages: int
    total_chunks: int
    score: float
    is_reranked: bool = False
    primary_passage: MatchedPassage
    additional_passages: List[MatchedPassage] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class SearchResponse(BaseModel):
    query: str
    mode: str
    total_documents: int
    page: int
    page_size: int
    total_pages: int
    latency_ms: float
    is_reranked: bool = False
    sort_by: str = "relevance"
    results: List[DocumentSearchResult]

    model_config = ConfigDict(from_attributes=True)


class FacetCount(BaseModel):
    name: str
    count: int

    model_config = ConfigDict(from_attributes=True)


class SearchFiltersResponse(BaseModel):
    min_year: Optional[int] = None
    max_year: Optional[int] = None
    domains: List[FacetCount] = Field(default_factory=list)
    document_types: List[FacetCount] = Field(default_factory=list)
    authors: List[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
