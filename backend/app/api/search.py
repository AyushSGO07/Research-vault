from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.rate_limiter import limiter
from app.database.session import get_db
from app.models.user import User
from app.schemas.search import (
    SearchQueryRequest,
    SearchResponse,
    SearchMode,
    SearchFiltersResponse,
)
from app.services.search import search_service

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/filters", response_model=SearchFiltersResponse, status_code=status.HTTP_200_OK)
def get_search_filters(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve dynamic facet counts and bounds (years, domains, document types, authors)
    from the authenticated user's indexed research documents.
    """
    return search_service.get_user_facets(db=db, user_id=current_user.id)


@router.post("/", response_model=SearchResponse, status_code=status.HTTP_200_OK)
@limiter.limit("60/minute")
def search_documents_post(
    request: Request,
    payload: SearchQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search indexed research papers using natural language or keywords.
    Supports Hybrid (RRF), Semantic (vector cosine), Keyword (BM25),
    neural Cross-Encoder reranking, metadata filtering, and multi-criteria sorting.
    """
    return search_service.search(
        db=db,
        user_id=current_user.id,
        query=payload.query,
        mode=payload.mode,
        page=payload.page,
        page_size=payload.page_size,
        enable_reranking=payload.enable_reranking,
        year_start=payload.year_start,
        year_end=payload.year_end,
        author=payload.author,
        domain=payload.domain,
        document_type=payload.document_type,
        collection_id=payload.collection_id,
        sort_by=payload.sort_by or "relevance",
    )


@router.get("/", response_model=SearchResponse, status_code=status.HTTP_200_OK)
def search_documents_get(
    q: str = Query(..., min_length=1, max_length=500, description="Search query string"),
    mode: SearchMode = Query(SearchMode.hybrid, description="Search mode: hybrid, semantic, keyword"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, description="Results per page"),
    enable_reranking: bool = Query(False, description="Enable cross-encoder neural reranking"),
    year_start: Optional[int] = Query(None, description="Start year filter"),
    year_end: Optional[int] = Query(None, description="End year filter"),
    author: Optional[str] = Query(None, description="Author filter"),
    domain: Optional[str] = Query(None, description="Domain filter"),
    document_type: Optional[str] = Query(None, description="Document type filter"),
    collection_id: Optional[int] = Query(None, description="Collection scope filter"),
    sort_by: str = Query("relevance", description="Sort order: relevance, newest, oldest"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    GET endpoint for search papers, enabling browser URL sharing and link navigation.
    """
    return search_service.search(
        db=db,
        user_id=current_user.id,
        query=q,
        mode=mode,
        page=page,
        page_size=page_size,
        enable_reranking=enable_reranking,
        year_start=year_start,
        year_end=year_end,
        author=author,
        domain=domain,
        document_type=document_type,
        collection_id=collection_id,
        sort_by=sort_by,
    )
