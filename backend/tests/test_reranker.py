import pytest
from app.services.reranker import CrossEncoderReranker, cross_encoder_reranker


def test_cross_encoder_reranker_singleton():
    reranker1 = CrossEncoderReranker()
    reranker2 = CrossEncoderReranker()
    assert reranker1 is reranker2
    assert reranker1 is cross_encoder_reranker


def test_sigmoid_normalization():
    # Large positive logit should approach 1.0
    assert cross_encoder_reranker._sigmoid(10.0) > 0.999
    # Large negative logit should approach 0.0
    assert cross_encoder_reranker._sigmoid(-10.0) < 0.001
    # 0.0 logit should be exactly 0.5
    assert cross_encoder_reranker._sigmoid(0.0) == 0.5


def test_rerank_empty_or_whitespace():
    # Empty candidates
    res_empty = cross_encoder_reranker.rerank("quantum computing", [])
    assert res_empty == []

    # Blank query
    candidates = [{"chunk_id": 1, "text": "Some text", "score": 0.5}]
    res_blank = cross_encoder_reranker.rerank("   ", candidates)
    assert len(res_blank) == 1
    assert res_blank[0]["chunk_id"] == 1


def test_rerank_scoring_and_ordering():
    query = "attention mechanism transformer neural network"
    candidates = [
        {
            "chunk_id": 1,
            "document_id": 101,
            "chunk_index": 0,
            "page_number": 1,
            "text": "The recipe calls for two cups of flour, sugar, and organic chocolate chips.",
            "score": 0.02,
        },
        {
            "chunk_id": 2,
            "document_id": 102,
            "chunk_index": 0,
            "page_number": 1,
            "text": "We introduce the Transformer model based entirely on self-attention mechanisms, dispensing with recurrence.",
            "score": 0.01,
        },
    ]

    reranked = cross_encoder_reranker.rerank(query, candidates, top_k=10)
    assert len(reranked) == 2

    # The highly relevant transformer passage should be ranked first by the neural cross-encoder
    assert reranked[0]["chunk_id"] == 2
    assert reranked[0]["is_reranked"] is True
    assert 0.0 <= reranked[0]["score"] <= 1.0

    # The baking passage should be ranked lower
    assert reranked[1]["chunk_id"] == 1
    assert reranked[1]["is_reranked"] is True
    assert reranked[0]["score"] > reranked[1]["score"]
