import math
import time
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database.vector_store import vector_store
from app.models.document import Document, DocumentChunk
from app.schemas.search import (
    SearchResponse,
    DocumentSearchResult,
    MatchedPassage,
    SearchMode,
    FacetCount,
    SearchFiltersResponse,
)
from app.services.bm25 import bm25_retriever
from app.services.reranker import cross_encoder_reranker


class SearchService:
    @staticmethod
    def search(
        db: Session,
        user_id: int,
        query: str,
        mode: SearchMode = SearchMode.hybrid,
        page: int = 1,
        page_size: int = 10,
        enable_reranking: bool = False,
        year_start: Optional[int] = None,
        year_end: Optional[int] = None,
        author: Optional[str] = None,
        domain: Optional[str] = None,
        document_type: Optional[str] = None,
        collection_id: Optional[int] = None,
        sort_by: str = "relevance",
    ) -> SearchResponse:
        start_time = time.perf_counter()

        cleaned_query = query.strip()
        sort_mode = (sort_by or "relevance").lower()
        mode_val = mode.value if isinstance(mode, SearchMode) else str(mode).lower()

        if not cleaned_query:
            return SearchResponse(
                query="",
                mode=mode_val,
                total_documents=0,
                page=page,
                page_size=page_size,
                total_pages=1,
                latency_ms=0.0,
                is_reranked=enable_reranking,
                sort_by=sort_mode,
                results=[],
            )

        # Step 1: SQL Pre-Filtering on User's Indexed Document Chunks
        query_filter = (
            db.query(DocumentChunk)
            .join(Document)
            .filter(Document.user_id == user_id, Document.status == "indexed")
        )

        if year_start is not None:
            query_filter = query_filter.filter(Document.publication_year >= year_start)
        if year_end is not None:
            query_filter = query_filter.filter(Document.publication_year <= year_end)
        if author and author.strip():
            query_filter = query_filter.filter(Document.authors.ilike(f"%{author.strip()}%"))
        if domain and domain.strip() and domain.lower() != "all":
            query_filter = query_filter.filter(Document.domain == domain.strip())
        if document_type and document_type.strip() and document_type.lower() != "all":
            query_filter = query_filter.filter(Document.document_type == document_type.strip())
        if collection_id is not None:
            from app.models.collection import CollectionDocument
            query_filter = query_filter.join(CollectionDocument, CollectionDocument.document_id == Document.id).filter(
                CollectionDocument.collection_id == collection_id
            )

        user_chunks = query_filter.all()

        if not user_chunks:
            latency = (time.perf_counter() - start_time) * 1000
            return SearchResponse(
                query=cleaned_query,
                mode=mode_val,
                total_documents=0,
                page=page,
                page_size=page_size,
                total_pages=1,
                latency_ms=round(latency, 2),
                is_reranked=enable_reranking,
                sort_by=sort_mode,
                results=[],
            )

        chunk_map = {c.id: c for c in user_chunks}

        # Step 2: Stage 1 Candidate Pool Retrieval (Semantic / Keyword / Hybrid)
        scored_chunks: List[Dict[str, Any]] = []

        if mode_val == "semantic":
            # Dense Vector Search only
            raw_semantic = vector_store.query_similar(cleaned_query, user_id=user_id, top_k=50)
            for r in raw_semantic:
                cid = r["chunk_id"]
                if cid in chunk_map:
                    c = chunk_map[cid]
                    scored_chunks.append({
                        "chunk_id": c.id,
                        "document_id": c.document_id,
                        "chunk_index": c.chunk_index,
                        "page_number": c.page_number,
                        "text": c.text,
                        "token_count": c.token_count,
                        "score": round(r["similarity"], 4),
                        "is_reranked": False,
                    })

        elif mode_val == "keyword":
            # Sparse BM25 Search only
            scored_chunks = bm25_retriever.search(cleaned_query, user_chunks, top_k=50)
            for sc in scored_chunks:
                sc["is_reranked"] = False

        else:
            # Hybrid Search with Reciprocal Rank Fusion (Default)
            raw_semantic = vector_store.query_similar(cleaned_query, user_id=user_id, top_k=50)
            raw_bm25 = bm25_retriever.search(cleaned_query, user_chunks, top_k=50)

            sem_ranks = {r["chunk_id"]: idx + 1 for idx, r in enumerate(raw_semantic) if r.get("chunk_id")}
            bm25_ranks = {r["chunk_id"]: idx + 1 for idx, r in enumerate(raw_bm25) if r.get("chunk_id")}

            all_candidate_ids = set(sem_ranks.keys()) | set(bm25_ranks.keys())
            k = settings.RRF_K

            for cid in all_candidate_ids:
                if cid not in chunk_map:
                    continue
                c = chunk_map[cid]

                rrf_score = 0.0
                if cid in sem_ranks:
                    rrf_score += 1.0 / (k + sem_ranks[cid])
                if cid in bm25_ranks:
                    rrf_score += 1.0 / (k + bm25_ranks[cid])

                scored_chunks.append({
                    "chunk_id": c.id,
                    "document_id": c.document_id,
                    "chunk_index": c.chunk_index,
                    "page_number": c.page_number,
                    "text": c.text,
                    "token_count": c.token_count,
                    "score": round(rrf_score, 5),
                    "is_reranked": False,
                })

            scored_chunks.sort(key=lambda x: x["score"], reverse=True)

        # Step 3: Stage 2 Neural Cross-Encoder Reranking Pass (Optional)
        if enable_reranking and scored_chunks:
            scored_chunks = cross_encoder_reranker.rerank(cleaned_query, scored_chunks, top_k=50)

        # Step 4: Document-Level Aggregation
        doc_chunks_group: Dict[int, List[Dict[str, Any]]] = {}
        for sc in scored_chunks:
            doc_id = sc["document_id"]
            if doc_id not in doc_chunks_group:
                doc_chunks_group[doc_id] = []
            doc_chunks_group[doc_id].append(sc)

        # Batch load matching documents in a single SQL query
        doc_ids = list(doc_chunks_group.keys())
        matching_docs = (
            db.query(Document)
            .filter(Document.id.in_(doc_ids), Document.user_id == user_id)
            .all()
        )
        doc_map = {d.id: d for d in matching_docs}

        # Build document search results
        doc_results: List[DocumentSearchResult] = []
        for doc_id, candidate_list in doc_chunks_group.items():
            doc = doc_map.get(doc_id)
            if not doc:
                continue

            # Sort candidate chunks for this document by individual score descending
            candidate_list.sort(key=lambda x: x["score"], reverse=True)
            top_c = candidate_list[0]
            other_c = candidate_list[1:]

            primary_passage = MatchedPassage(
                chunk_id=top_c["chunk_id"],
                chunk_index=top_c["chunk_index"],
                page_number=top_c["page_number"],
                text=top_c["text"],
                score=top_c["score"],
                token_count=top_c["token_count"],
                is_reranked=top_c.get("is_reranked", enable_reranking),
            )

            additional_passages = [
                MatchedPassage(
                    chunk_id=oc["chunk_id"],
                    chunk_index=oc["chunk_index"],
                    page_number=oc["page_number"],
                    text=oc["text"],
                    score=oc["score"],
                    token_count=oc["token_count"],
                    is_reranked=oc.get("is_reranked", False),
                )
                for oc in other_c
            ]

            bonus = sum(p.score for p in additional_passages) * 0.1
            aggregated_score = round(primary_passage.score + bonus, 5)

            doc_results.append(
                DocumentSearchResult(
                    document_id=doc.id,
                    title=doc.title or doc.filename,
                    filename=doc.filename,
                    authors=doc.authors,
                    publication_year=doc.publication_year,
                    doi=doc.doi,
                    domain=doc.domain or "Computer Science",
                    document_type=doc.document_type or "Preprint",
                    total_pages=doc.total_pages,
                    total_chunks=doc.total_chunks,
                    score=aggregated_score,
                    is_reranked=enable_reranking,
                    primary_passage=primary_passage,
                    additional_passages=additional_passages,
                )
            )

        # Step 5: Multi-Criteria Sorting
        if sort_mode == "newest":
            doc_results.sort(
                key=lambda d: (
                    d.publication_year if d.publication_year is not None else -1,
                    d.score,
                    d.document_id,
                ),
                reverse=True,
            )
        elif sort_mode == "oldest":
            doc_results.sort(
                key=lambda d: (
                    d.publication_year if d.publication_year is not None else 9999,
                    -d.score,
                    d.document_id,
                )
            )
        else:  # "relevance" (default)
            doc_results.sort(key=lambda d: d.score, reverse=True)

        # Step 6: Server-Side Pagination
        total_documents = len(doc_results)
        total_pages = max(1, math.ceil(total_documents / page_size))
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_results = doc_results[start_idx:end_idx]

        latency = (time.perf_counter() - start_time) * 1000

        # Auto-record search inquiry in history
        try:
            from app.models.search_history import SearchHistory
            hist = SearchHistory(
                user_id=user_id,
                query=cleaned_query,
                mode=mode_val,
                result_count=total_documents,
            )
            db.add(hist)
            db.commit()
        except Exception:
            pass

        return SearchResponse(
            query=cleaned_query,
            mode=mode_val,
            total_documents=total_documents,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            latency_ms=round(latency, 2),
            is_reranked=enable_reranking,
            sort_by=sort_mode,
            results=paginated_results,
        )

    @staticmethod
    def get_user_facets(db: Session, user_id: int) -> SearchFiltersResponse:
        """
        Aggregate authentic metadata facets across user's indexed documents
        for filter UI population with zero mock data.
        """
        doc_rows = (
            db.query(
                Document.publication_year,
                Document.domain,
                Document.document_type,
                Document.authors,
            )
            .filter(Document.user_id == user_id, Document.status == "indexed")
            .all()
        )

        if not doc_rows:
            return SearchFiltersResponse(
                min_year=None,
                max_year=None,
                domains=[],
                document_types=[],
                authors=[],
            )

        # Publication years
        years = [r[0] for r in doc_rows if r[0] is not None]
        min_year = min(years) if years else None
        max_year = max(years) if years else None

        # Domain counts
        domain_counts: Dict[str, int] = {}
        for r in doc_rows:
            dom = r[1] or "Computer Science"
            domain_counts[dom] = domain_counts.get(dom, 0) + 1

        domains = [
            FacetCount(name=k, count=v)
            for k, v in sorted(domain_counts.items(), key=lambda x: x[1], reverse=True)
        ]

        # Document type counts
        type_counts: Dict[str, int] = {}
        for r in doc_rows:
            dt = r[2] or "Preprint"
            type_counts[dt] = type_counts.get(dt, 0) + 1

        document_types = [
            FacetCount(name=k, count=v)
            for k, v in sorted(type_counts.items(), key=lambda x: x[1], reverse=True)
        ]

        # Top distinct authors
        author_set = set()
        for r in doc_rows:
            if r[3]:
                for a in r[3].split(","):
                    cleaned = a.strip()
                    if cleaned and len(cleaned) > 2 and not cleaned.lower().startswith("et al"):
                        author_set.add(cleaned)

        authors = sorted(list(author_set))

        return SearchFiltersResponse(
            min_year=min_year,
            max_year=max_year,
            domains=domains,
            document_types=document_types,
            authors=authors[:50],
        )


search_service = SearchService()
