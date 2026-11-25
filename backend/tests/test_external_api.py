import pytest
from unittest.mock import AsyncMock, patch
from app.services.external.arxiv import ArXivService
from app.services.external.openalex import OpenAlexService, reconstruct_abstract
from app.services.external.aggregator import ExternalLiteratureAggregator
from app.schemas.external import ExternalPaperResult, ExternalSearchResponse
from app.models.document import Document
from app.models.user import User

SAMPLE_ARXIV_ATOM = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/1706.03762v7</id>
    <published>2017-06-12T17:57:34Z</published>
    <title>Attention Is All You Need</title>
    <summary>The dominant sequence transduction models are based on complex recurrent neural networks.</summary>
    <author>
      <name>Ashish Vaswani</name>
    </author>
    <author>
      <name>Noam Shazeer</name>
    </author>
    <arxiv:doi>10.48550/arXiv.1706.03762</arxiv:doi>
    <arxiv:primary_category term="cs.CL"/>
    <link title="pdf" href="http://arxiv.org/pdf/1706.03762v7" type="application/pdf"/>
  </entry>
</feed>
"""

SAMPLE_OPENALEX_WORK = {
    "id": "https://openalex.org/W2741809807",
    "doi": "https://doi.org/10.1109/cvpr.2016.90",
    "display_name": "Deep Residual Learning for Image Recognition",
    "publication_year": 2016,
    "cited_by_count": 185420,
    "type": "article",
    "authorships": [
        {"author": {"display_name": "Kaiming He"}},
        {"author": {"display_name": "Xiangyu Zhang"}},
    ],
    "abstract_inverted_index": {
        "Deeper": [0],
        "neural": [1],
        "networks": [2],
        "are": [3],
        "more": [4],
        "difficult": [5],
        "to": [6],
        "train.": [7],
    },
    "open_access": {
        "is_oa": True,
        "oa_url": "https://arxiv.org/pdf/1512.03385.pdf",
    },
    "primary_topic": {
        "domain": {"display_name": "Computer Science"},
    },
    "primary_location": {
        "source": {"display_name": "CVPR"},
    },
}


def test_arxiv_atom_parser():
    """Verify arXiv Atom XML parser extracts clean metadata and PDF URL."""
    results = ArXivService.parse_atom_feed(SAMPLE_ARXIV_ATOM)
    assert len(results) == 1

    paper = results[0]
    assert paper.source == "arxiv"
    assert paper.external_id == "1706.03762v7"
    assert paper.title == "Attention Is All You Need"
    assert "Ashish Vaswani" in paper.authors
    assert "Noam Shazeer" in paper.authors
    assert paper.publication_year == 2017
    assert paper.domain == "Computer Science"
    assert paper.doi == "10.48550/arXiv.1706.03762"
    assert paper.pdf_url == "http://arxiv.org/pdf/1706.03762v7"
    assert "recurrent neural networks" in paper.abstract


def test_openalex_abstract_reconstruction_and_parser():
    """Verify OpenAlex inverted-index abstract reconstruction and work parsing."""
    inv_index = SAMPLE_OPENALEX_WORK["abstract_inverted_index"]
    abstract_text = reconstruct_abstract(inv_index)
    assert abstract_text == "Deeper neural networks are more difficult to train."

    results = OpenAlexService.parse_works([SAMPLE_OPENALEX_WORK])
    assert len(results) == 1

    paper = results[0]
    assert paper.source == "openalex"
    assert paper.external_id == "W2741809807"
    assert paper.title == "Deep Residual Learning for Image Recognition"
    assert paper.publication_year == 2016
    assert paper.cited_by_count == 185420
    assert paper.doi == "10.1109/cvpr.2016.90"
    assert "Kaiming He" in paper.authors
    assert paper.pdf_url == "https://arxiv.org/pdf/1512.03385.pdf"


def test_aggregator_deduplication():
    """Verify aggregator merges overlapping results from multiple repositories."""
    paper_arxiv = ExternalPaperResult(
        source="arxiv",
        external_id="1706.03762",
        title="Attention Is All You Need",
        authors="Vaswani et al.",
        publication_year=2017,
        abstract="Preprint abstract",
        pdf_url="https://arxiv.org/pdf/1706.03762.pdf",
        doi="10.48550/arXiv.1706.03762",
        cited_by_count=0,
    )
    paper_openalex = ExternalPaperResult(
        source="openalex",
        external_id="W123456",
        title="Attention is All You Need!",
        authors="Vaswani, Shazeer",
        publication_year=2017,
        abstract="Journal abstract",
        pdf_url=None,
        doi="10.48550/arXiv.1706.03762",
        cited_by_count=95000,
    )

    deduped = ExternalLiteratureAggregator.deduplicate_results([paper_arxiv, paper_openalex])
    assert len(deduped) == 1
    merged = deduped[0]
    assert merged.title == "Attention Is All You Need"
    assert merged.cited_by_count == 95000
    assert merged.pdf_url == "https://arxiv.org/pdf/1706.03762.pdf"


def test_api_external_search_endpoint(client, auth_headers):
    """Verify GET /api/external/search returns structured results from repositories."""
    mock_results = [
        ExternalPaperResult(
            source="arxiv",
            external_id="1706.03762",
            title="Attention Is All You Need",
            authors="Ashish Vaswani, Noam Shazeer",
            publication_year=2017,
            abstract="Transformer architecture.",
            pdf_url="https://arxiv.org/pdf/1706.03762.pdf",
            cited_by_count=1000,
        )
    ]

    with patch.object(
        ExternalLiteratureAggregator,
        "search",
        new=AsyncMock(
            return_value=ExternalSearchResponse(
                results=mock_results,
                total=1,
                page=1,
                page_size=10,
                source="all",
            )
        ),
    ):
        response = client.get("/api/external/search?query=transformer&source=all", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["results"]) == 1
        assert data["results"][0]["title"] == "Attention Is All You Need"


def test_api_external_import_endpoint(client, auth_headers, db_session):
    """Verify POST /api/external/import initiates PDF ingestion and deduplicates duplicates."""
    payload = {
        "source": "arxiv",
        "external_id": "2104.08888",
        "title": "Quantum Information Retrieval via Neural Tensor Networks",
        "authors": "Alice Researcher, Bob Scientist",
        "publication_year": 2024,
        "abstract": "We explore quantum tensor networks for dense semantic passage ranking.",
        "doi": "10.1000/182",
        "journal": "Quantum AI",
        "domain": "Physics",
        "document_type": "Preprint",
    }

    # 1. Initial import
    response = client.post("/api/external/import", json=payload, headers=auth_headers)
    assert response.status_code == 202
    data = response.json()
    assert data["is_duplicate"] is False
    assert data["document_id"] > 0
    assert "scheduled" in data["message"].lower()

    # Verify document exists in database
    doc = db_session.query(Document).filter(Document.id == data["document_id"]).first()
    assert doc is not None
    assert doc.title == payload["title"]
    assert doc.domain == "Physics"

    # 2. Repeated import attempt (should detect duplicate SHA-256 hash)
    repeat_response = client.post("/api/external/import", json=payload, headers=auth_headers)
    assert repeat_response.status_code == 202
    repeat_data = repeat_response.json()
    assert repeat_data["is_duplicate"] is True
    assert repeat_data["document_id"] == data["document_id"]
