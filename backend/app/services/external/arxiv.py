import re
import logging
import xml.etree.ElementTree as ET
from typing import List, Optional
import httpx

from app.schemas.external import ExternalPaperResult

logger = logging.getLogger(__name__)

ATOM_NS = "{http://www.w3.org/2005/Atom}"
ARXIV_NS = "{http://arxiv.org/schemas/atom}"


class ArXivService:
    BASE_URL = "https://export.arxiv.org/api/query"

    @classmethod
    async def search(
        cls,
        query: str,
        start: int = 0,
        max_results: int = 10,
        sort_by: str = "relevance",
    ) -> List[ExternalPaperResult]:
        """
        Query arXiv API for research preprints and return normalized ExternalPaperResult items.
        """
        clean_query = query.strip()
        if not clean_query:
            return []

        # Map sort options
        sort_param = "relevance"
        sort_order = "descending"
        if sort_by == "newest":
            sort_param = "submittedDate"
        elif sort_by == "last_updated":
            sort_param = "lastUpdatedDate"

        # Format search_query parameter
        if ":" in clean_query:
            formatted_query = clean_query
        else:
            # Multi-word query formatted with all:
            terms = [f"all:{re.sub(r'[^a-zA-Z0-9_-]', '', t)}" for t in clean_query.split() if t.strip()]
            formatted_query = " AND ".join(terms) if terms else f"all:{clean_query}"

        params = {
            "search_query": formatted_query,
            "start": start,
            "max_results": max_results,
            "sortBy": sort_param,
            "sortOrder": sort_order,
        }

        headers = {
            "User-Agent": "ResearchVault-Academic/1.0 (mailto:scholar@researchvault.edu)"
        }

        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                resp = await client.get(cls.BASE_URL, params=params, headers=headers)
                resp.raise_for_status()
                return cls.parse_atom_feed(resp.text)
        except Exception as e:
            logger.warning(f"arXiv API search error: {e}")
            return []

    @classmethod
    def parse_atom_feed(cls, xml_text: str) -> List[ExternalPaperResult]:
        """Parse arXiv Atom XML response into normalized ExternalPaperResult list."""
        results: List[ExternalPaperResult] = []
        try:
            root = ET.fromstring(xml_text)
        except Exception as err:
            logger.error(f"Failed to parse arXiv Atom XML: {err}")
            return results

        entries = root.findall(f"{ATOM_NS}entry")
        for entry in entries:
            try:
                # 1. External ID & canonical arXiv ID
                id_elem = entry.find(f"{ATOM_NS}id")
                raw_id = id_elem.text.strip() if id_elem is not None and id_elem.text else ""
                arxiv_id = raw_id.split("/abs/")[-1] if "/abs/" in raw_id else raw_id

                # 2. Title
                title_elem = entry.find(f"{ATOM_NS}title")
                title = " ".join(title_elem.text.split()) if title_elem is not None and title_elem.text else "Untitled Paper"

                # 3. Authors
                authors_list = []
                for author in entry.findall(f"{ATOM_NS}author"):
                    name_elem = author.find(f"{ATOM_NS}name")
                    if name_elem is not None and name_elem.text:
                        authors_list.append(name_elem.text.strip())
                authors_str = ", ".join(authors_list) if authors_list else "Unknown Authors"

                # 4. Summary / Abstract
                summary_elem = entry.find(f"{ATOM_NS}summary")
                abstract = " ".join(summary_elem.text.split()) if summary_elem is not None and summary_elem.text else ""

                # 5. Publication Year
                pub_elem = entry.find(f"{ATOM_NS}published")
                pub_year = None
                if pub_elem is not None and pub_elem.text and len(pub_elem.text) >= 4:
                    try:
                        pub_year = int(pub_elem.text[:4])
                    except ValueError:
                        pass

                # 6. DOI & Journal
                doi_elem = entry.find(f"{ARXIV_NS}doi")
                doi = doi_elem.text.strip() if doi_elem is not None and doi_elem.text else None
                journal_elem = entry.find(f"{ARXIV_NS}journal_ref")
                journal = journal_elem.text.strip() if journal_elem is not None and journal_elem.text else "arXiv Preprint"

                # 7. Category / Domain
                cat_elem = entry.find(f"{ARXIV_NS}primary_category")
                domain = "Computer Science"
                if cat_elem is not None:
                    cat_term = cat_elem.attrib.get("term", "")
                    if cat_term.startswith("cs."):
                        domain = "Computer Science"
                    elif cat_term.startswith("stat.") or cat_term.startswith("math."):
                        domain = "Mathematics"
                    elif cat_term.startswith("physics."):
                        domain = "Physics"
                    elif cat_term.startswith("q-bio."):
                        domain = "Biology"

                # 8. Direct PDF link
                pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
                for link in entry.findall(f"{ATOM_NS}link"):
                    if link.attrib.get("title") == "pdf" or link.attrib.get("type") == "application/pdf":
                        pdf_url = link.attrib.get("href", pdf_url)
                        break

                results.append(
                    ExternalPaperResult(
                        source="arxiv",
                        external_id=arxiv_id,
                        title=title,
                        authors=authors_str,
                        publication_year=pub_year,
                        abstract=abstract,
                        pdf_url=pdf_url,
                        doi=doi,
                        journal=journal,
                        domain=domain,
                        document_type="Preprint",
                        cited_by_count=0,
                    )
                )
            except Exception as entry_err:
                logger.warning(f"Skipping malformed arXiv entry: {entry_err}")
                continue

        return results
