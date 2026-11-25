from datetime import datetime, timezone
import pytest
from app.database.vector_store import ChromaVectorStore
from app.models.document import DocumentChunk


@pytest.fixture
def temp_vector_store(tmp_path):
    persist_dir = str(tmp_path / "chroma_test_db")
    store = ChromaVectorStore(persist_dir=persist_dir)
    return store


def test_vector_store_add_and_query_with_user_isolation(temp_vector_store):
    # Create mock chunks for User 1
    c1 = DocumentChunk(
        id=101,
        document_id=1,
        chunk_index=0,
        page_number=1,
        text="The Transformer model is entirely based on self-attention mechanisms without recurrence.",
        token_count=15,
        created_at=datetime.now(timezone.utc),
    )
    c2 = DocumentChunk(
        id=102,
        document_id=1,
        chunk_index=1,
        page_number=2,
        text="Multi-head attention allows the model to jointly attend to information from different representation subspaces.",
        token_count=16,
        created_at=datetime.now(timezone.utc),
    )
    temp_vector_store.add_chunks(
        [c1, c2],
        metadata_extra={"user_id": 1, "title": "Attention Is All You Need", "publication_year": 2017}
    )

    # Create mock chunk for User 2 (private to User 2)
    c3 = DocumentChunk(
        id=201,
        document_id=2,
        chunk_index=0,
        page_number=1,
        text="Convolutional neural networks compute local feature maps across images.",
        token_count=12,
        created_at=datetime.now(timezone.utc),
    )
    temp_vector_store.add_chunks(
        [c3],
        metadata_extra={"user_id": 2, "title": "ConvNet Research", "publication_year": 2015}
    )

    # Query as User 1
    results_user1 = temp_vector_store.query_similar(
        query_text="self-attention transformer",
        user_id=1,
        top_k=5
    )

    assert len(results_user1) == 2
    top_result = results_user1[0]
    assert top_result["document_id"] == 1
    assert "Transformer" in top_result["text"]
    assert top_result["similarity"] > 0.0
    assert top_result["title"] == "Attention Is All You Need"

    # IDOR Verification: Ensure User 1 never receives User 2's chunk
    for r in results_user1:
        assert r["document_id"] != 2
        assert "Convolutional" not in r["text"]

    # Query as User 2
    results_user2 = temp_vector_store.query_similar(
        query_text="convolutional features",
        user_id=2,
        top_k=5
    )
    assert len(results_user2) == 1
    assert results_user2[0]["document_id"] == 2


def test_vector_store_delete_document_chunks(temp_vector_store):
    c1 = DocumentChunk(
        id=301,
        document_id=5,
        chunk_index=0,
        page_number=1,
        text="A paper about reinforcement learning with policy gradients.",
        token_count=10,
        created_at=datetime.now(timezone.utc),
    )
    temp_vector_store.add_chunks([c1], metadata_extra={"user_id": 1, "title": "RL Paper"})

    # Verify present
    res_before = temp_vector_store.query_similar("reinforcement learning", user_id=1)
    assert len(res_before) == 1

    # Delete
    temp_vector_store.delete_document_chunks(document_id=5)

    # Verify purged
    res_after = temp_vector_store.query_similar("reinforcement learning", user_id=1)
    assert len(res_after) == 0
