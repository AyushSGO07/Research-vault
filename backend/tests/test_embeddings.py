import numpy as np
import pytest
from app.services.embeddings import embedding_service


def test_embed_text_dimension_and_normalization():
    query = "attention mechanism in neural sequence transduction"
    vector = embedding_service.embed_text(query)

    assert isinstance(vector, list)
    assert len(vector) == 384
    assert all(isinstance(x, float) for x in vector)

    # Check L2 normalization
    norm = np.linalg.norm(vector)
    assert abs(norm - 1.0) < 1e-3


def test_embed_documents_batch():
    texts = [
        "Language models are few-shot learners.",
        "Deep residual networks for visual recognition tasks.",
        "Generative adversarial networks estimate generative models via adversarial process."
    ]
    vectors = embedding_service.embed_documents(texts, batch_size=2)

    assert len(vectors) == 3
    for vec in vectors:
        assert len(vec) == 384
        norm = np.linalg.norm(vec)
        assert abs(norm - 1.0) < 1e-3


def test_embed_empty_documents():
    vectors = embedding_service.embed_documents([])
    assert vectors == []
