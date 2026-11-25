import pytest
from app.services.chunker import SemanticChunker


def test_chunker_token_budget_and_boundaries():
    chunker = SemanticChunker(target_tokens=100, overlap_tokens=20)
    
    # 5 distinct paragraphs
    paragraphs = [
        f"Paragraph {i}: This is academic passage text with sufficient length to verify chunking and token budgeting. "
        f"We discuss neural network representations and retrieval evaluation metrics."
        for i in range(1, 10)
    ]
    pages = [
        {"page_number": 1, "text": "\n\n".join(paragraphs[:5])},
        {"page_number": 2, "text": "\n\n".join(paragraphs[5:])},
    ]

    chunks = chunker.chunk_document(pages)
    assert len(chunks) > 1

    for idx, chunk in enumerate(chunks):
        assert chunk["chunk_index"] == idx
        assert chunk["token_count"] <= 120  # generous headroom for single unit additions
        assert chunk["page_number"] in [1, 2]
        assert len(chunk["content_hash"]) == 64
        assert chunk["text"].strip() != ""


def test_chunker_overlap_continuity():
    chunker = SemanticChunker(target_tokens=50, overlap_tokens=20)
    
    paragraphs = [
        f"Concept {i} details the foundational mathematical principles of transformers and attention mechanisms."
        for i in range(1, 8)
    ]
    pages = [{"page_number": 1, "text": "\n\n".join(paragraphs)}]

    chunks = chunker.chunk_document(pages)
    assert len(chunks) >= 2

    # Verify overlap: some text from the tail of chunk 0 appears in chunk 1
    chunk_0_text = chunks[0]["text"]
    chunk_1_text = chunks[1]["text"]
    chunk_0_paras = [p.strip() for p in chunk_0_text.split("\n\n") if p.strip()]
    
    # The last paragraph of chunk 0 should be present in chunk 1
    last_para_of_0 = chunk_0_paras[-1]
    assert last_para_of_0 in chunk_1_text


def test_oversized_paragraph_sentence_splitting():
    chunker = SemanticChunker(target_tokens=80, overlap_tokens=15)
    
    # Build a single giant paragraph with multiple sentences (no \n\n)
    sentences = [
        f"Sentence {i} examines the empirical convergence properties of stochastic gradient descent with momentum."
        for i in range(1, 15)
    ]
    single_giant_paragraph = " ".join(sentences)
    pages = [{"page_number": 1, "text": single_giant_paragraph}]

    chunks = chunker.chunk_document(pages)
    assert len(chunks) >= 2

    # Check that every chunk is bounded and contains full sentences
    for chunk in chunks:
        assert chunk["token_count"] <= 100
        # Check that chunk does not end in a severed word mid-sentence
        stripped = chunk["text"].strip()
        assert stripped[-1] in [".", "!", "?"]


def test_empty_document_handling():
    chunker = SemanticChunker(target_tokens=800, overlap_tokens=120)
    pages = [{"page_number": 1, "text": ""}]
    chunks = chunker.chunk_document(pages)
    assert chunks == []
