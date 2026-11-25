import logging
from typing import List, Optional, Dict, Any
import httpx

from app.schemas.external import ExternalPaperResult

logger = logging.getLogger(__name__)


def reconstruct_abstract(inverted_index: Optional[Dict[str, List[int]]]) -> str:
    """
    Reconstruct full-text abstract from OpenAlex inverted index dictionary:
    { "word": [pos1, pos2], ... } -> "word1 word2 ..."
    """
    if not inverted_index:
        return ""
    try:
        pos_map = {}
        for word, positions in inverted_index.items():
            for p in positions:
                pos_map[p] = word
        return " ".join(pos_map[p] for p in sorted(pos_map.keys()))
    except Exception:
        return ""


class OpenAlexService:
    BASE_URL = "https://api.openalex.org/works"

    @classmethod
    async def search(
        cls,
        query: str,
        page: int = 1,
        per_page: int = 10,
        sort_by: str = "relevance",
    ) -> List[ExternalPaperResult]:
        """
        Query OpenAlex API for scholarly works with citation counts and open access URLs.
        """
        clean_query = query.strip()
        if not clean_query:
            return []

        # Sort mapping
        sort_param = "relevance_score:desc"
        if sort_by == "citations":
            sort_param = "cited_by_count:desc"
        elif sort_by == "newest":
            sort_param = "publication_year:desc"

        params = {
            "search": clean_query,
            "page": page,
            "per_page": per_page,
            "sort": sort_param,
        }

        # Polite pool user-agent with email
        headers = {
            "User-Agent": "ResearchVault-Academic/1.0 (mailto:scholar@researchvault.edu)"
        }

        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                resp = await client.get(cls.BASE_URL, params=params, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                return cls.parse_works(data.get("results", []))
        except Exception as e:
            logger.warning(f"OpenAlex API search error: {e}")
            return []

    @classmethod
    def parse_works(cls, works: List[Dict[str, Any]]) -> List[ExternalPaperResult]:
        """Parse OpenAlex JSON works into normalized ExternalPaperResult list."""
        results: List[ExternalPaperResult] = []

        for work in works:
            try:
                # 1. Canonical OpenAlex ID
                raw_id = work.get("id") or ""
                openalex_id = raw_id.split("/")[-1] if "/" in raw_id else raw_id

                # 2. Title
                title = work.get("display_name") or "Untitled Paper"

                # 3. Authors
                authorships = work.get("authorships", [])
                author_names = []
                for a in authorships:
                    author_obj = a.get("author", {})
                    display_name = author_obj.get("display_name")
                    if display_name:
                        author_names.append(display_name.strip())
                authors_str = ", ".join(author_names) if author_names else "Unknown Authors"

                # 4. Publication Year
                pub_year = work.get("publication_year")

                # 5. Reconstructed Abstract
                abstract = reconstruct_abstract(work.get("abstract_inverted_index"))

                # 6. Citations
                citations = work.get("cited_by_count") or 0

                # 7. DOI
                raw_doi = work.get("doi") or ""
                doi = raw_doi.replace("https://doi.org/", "") if raw_doi else None

                # 8. Open Access PDF Link
                pdf_url = None
                oa = work.get("open_access", {})
                if oa.get("oa_url") and oa.get("oa_url").endswith(".pdf"):
                    pdf_url = oa.get("oa_url")

                if not pdf_url:
                    primary_loc = work.get("primary_location") or {}
                    if primary_loc.get("pdf_url"):
                        pdf_url = primary_loc.get("pdf_url")
                    elif oa.get("oa_url"):
                        pdf_url = oa.get("oa_url")

                # Fallback to best open access location
                if not pdf_url:
                    best_oa = work.get("best_oa_location") or {}
                    pdf_url = best_oa.get("pdf_url") or best_oa.get("landing_page_url")

                # 9. Topic & Domain
                primary_topic = work.get("primary_topic") or {}
                domain_obj = primary_topic.get("domain") or {}
                domain = domain_obj.get("display_name") or "Computer Science"

                # 10. Venue / Journal
                primary_loc = work.get("primary_location") or {}
                source_obj = primary_loc.get("source") or {}
                journal = source_obj.get("display_name") or "Peer-Reviewed Article"

                # 11. Document Type
                raw_type = work.get("type") or "article"
                doc_type = raw_type.title()

                results.append(
                    ExternalPaperResult(
                        source="openalex",
                        external_id=openalex_id,
                        title=title,
                        authors=authors_str,
                        publication_year=pub_year,
                        abstract=abstract,
                        pdf_url=pdf_url,
                        doi=doi,
                        journal=journal,
                        domain=domain,
                        document_type=doc_type,
                        cited_by_count=citations,
                    )
                )
            except Exception as work_err:
                logger.warning(f"Skipping malformed OpenAlex work: {work_err}")
                continue

        return results
