import re
import asyncio
import logging
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.document import Document
from app.schemas.external import ExternalPaperResult, ExternalSearchResponse
from app.services.external.arxiv import ArXivService
from app.services.external.openalex import OpenAlexService

logger = logging.getLogger(__name__)


def normalize_title(title: str) -> str:
    """Normalize paper title for fuzzy deduplication."""
    return re.sub(r"[^a-zA-Z0-9]", "", title.lower())


class ExternalLiteratureAggregator:
    """
    Unified aggregator that queries arXiv and OpenAlex concurrently,
    deduplicates overlapping papers by DOI and normalized title, and annotates
    with user library possession state.
    """

    @classmethod
    async def search(
        cls,
        query: str,
        source: str = "all",
        page: int = 1,
        page_size: int = 10,
        sort_by: str = "relevance",
        db: Optional[Session] = None,
        user_id: Optional[int] = None,
    ) -> ExternalSearchResponse:
        clean_query = query.strip()
        if not clean_query:
            return ExternalSearchResponse(
                results=[],
                total=0,
                page=page,
                page_size=page_size,
                source=source,
            )

        start_offset = (page - 1) * page_size
        tasks = []

        if source in ("all", "arxiv"):
            tasks.append(
                ArXivService.search(
                    query=clean_query,
                    start=start_offset,
                    max_results=page_size,
                    sort_by=sort_by,
                )
            )

        if source in ("all", "openalex"):
            tasks.append(
                OpenAlexService.search(
                    query=clean_query,
                    page=page,
                    per_page=page_size,
                    sort_by=sort_by,
                )
            )

        # Execute searches concurrently
        raw_results = await asyncio.gather(*tasks, return_exceptions=True)

        combined: List[ExternalPaperResult] = []
        for res in raw_results:
            if isinstance(res, list):
                combined.extend(res)
            elif isinstance(res, Exception):
                logger.error(f"External search worker failed: {res}")

        # Deduplicate results across repositories
        deduped = cls.deduplicate_results(combined)

        # Sort combined results
        if sort_by == "citations":
            deduped.sort(key=lambda x: x.cited_by_count, reverse=True)
        elif sort_by == "newest":
            deduped.sort(key=lambda x: x.publication_year or 0, reverse=True)

        # Truncate to page_size
        final_results = deduped[:page_size]

        # Annotate with user's library status if db and user_id are supplied
        if db is not None and user_id is not None:
            cls.annotate_library_status(final_results, db, user_id)

        return ExternalSearchResponse(
            results=final_results,
            total=len(deduped),
            page=page,
            page_size=page_size,
            source=source,
        )

    @classmethod
    def deduplicate_results(cls, papers: List[ExternalPaperResult]) -> List[ExternalPaperResult]:
        """
        Merge overlapping papers from arXiv and OpenAlex based on DOI or normalized title.
        Preserves arXiv's direct PDF link while adopting OpenAlex's citation count and topic metadata.
        """
        seen_doi = {}
        seen_title = {}
        deduped: List[ExternalPaperResult] = []

        for p in papers:
            norm_title = normalize_title(p.title)
            doi_key = p.doi.lower().strip() if p.doi else None

            existing_paper = None
            if doi_key and doi_key in seen_doi:
                existing_paper = seen_doi[doi_key]
            elif norm_title in seen_title:
                existing_paper = seen_title[norm_title]

            if existing_paper:
                # Merge metadata: adopt highest citation count
                if p.cited_by_count > existing_paper.cited_by_count:
                    existing_paper.cited_by_count = p.cited_by_count
                # Keep direct PDF link if current has one and existing does not
                if not existing_paper.pdf_url and p.pdf_url:
                    existing_paper.pdf_url = p.pdf_url
                # Keep DOI if existing lacks one
                if not existing_paper.doi and p.doi:
                    existing_paper.doi = p.doi
            else:
                if doi_key:
                    seen_doi[doi_key] = p
                seen_title[norm_title] = p
                deduped.append(p)

        return deduped

    @classmethod
    def annotate_library_status(
        cls,
        papers: List[ExternalPaperResult],
        db: Session,
        user_id: int,
    ) -> None:
        """Check user's existing documents to mark whether paper is already indexed."""
        user_docs = db.query(Document).filter(Document.user_id == user_id).all()
        if not user_docs:
            return

        doc_by_title = {normalize_title(d.title): d.id for d in user_docs if d.title}
        doc_by_doi = {d.doi.lower().strip(): d.id for d in user_docs if d.doi}

        for p in papers:
            norm_title = normalize_title(p.title)
            doi_key = p.doi.lower().strip() if p.doi else None

            doc_id = None
            if doi_key and doi_key in doc_by_doi:
                doc_id = doc_by_doi[doi_key]
            elif norm_title in doc_by_title:
                doc_id = doc_by_title[norm_title]

            if doc_id:
                p.already_in_library = True
                p.library_document_id = doc_id
