from app.models.document import DocumentChunk
from app.services.bm25 import bm25_retriever


def test_bm25_tokenize():
    text = "Attention Is All You Need! A Transformer-based model for NLP (2017)."
    tokens = bm25_retriever.tokenize(text)

    assert "attention" in tokens
    assert "transformer-based" in tokens or "transformer" in tokens
    assert "model" in tokens
    assert "nlp" in tokens
    assert "2017" in tokens
    assert "a" not in tokens  # single character filtered out


def test_bm25_search_scoring_and_ranking():
    c1 = DocumentChunk(
        id=1,
        document_id=1,
        chunk_index=0,
        page_number=1,
        text="The Transformer is a model architecture relying entirely on self-attention to compute representations.",
        token_count=15,
    )
    c2 = DocumentChunk(
        id=2,
        document_id=2,
        chunk_index=0,
        page_number=1,
        text="Quantum mechanics explores discrete energy quanta and wave-particle duality in subatomic physics.",
        token_count=14,
    )
    c3 = DocumentChunk(
        id=3,
        document_id=3,
        chunk_index=0,
        page_number=1,
        text="Stochastic gradient descent with Adam optimizer minimizes loss in neural network training.",
        token_count=14,
    )

    chunks = [c1, c2, c3]

    # Search query targeting chunk 1
    results = bm25_retriever.search("transformer self-attention", chunks, top_k=5)
    assert len(results) >= 1
    top_result = results[0]
    assert top_result["chunk_id"] == 1
    assert top_result["score"] > 0.0

    # Search query targeting chunk 2
    quantum_results = bm25_retriever.search("quantum mechanics subatomic", chunks, top_k=5)
    assert len(quantum_results) >= 1
    assert quantum_results[0]["chunk_id"] == 2

    # Irrelevant query
    irrelevant = bm25_retriever.search("ancient mesopotamian archaeology", chunks, top_k=5)
    assert irrelevant == []
