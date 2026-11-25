import logging
from typing import List, Optional
import numpy as np
from sentence_transformers import SentenceTransformer
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Singleton service wrapper around SentenceTransformer ('all-MiniLM-L6-v2').
    Produces normalized 384-dimensional dense vector embeddings for queries
    and document passages for cosine similarity retrieval.
    """
    _model: Optional[SentenceTransformer] = None

    def __init__(self):
        self._query_cache: dict[str, List[float]] = {}

    @classmethod
    def get_model(cls) -> SentenceTransformer:
        if cls._model is None:
            logger.info(f"Loading embedding model '{settings.EMBEDDING_MODEL_NAME}'...")
            cls._model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
            logger.info("Embedding model loaded successfully.")
        return cls._model

    def embed_text(self, text: str) -> List[float]:
        """
        Embed a single text string (e.g. search query) and return
        a normalized 384-dimensional vector as a list of floats.
        Cached in-memory for lightning fast repeated queries.
        """
        cleaned_text = text.strip() if text else ""
        if cleaned_text in self._query_cache:
            return self._query_cache[cleaned_text]

        model = self.get_model()
        embedding = model.encode(cleaned_text, normalize_embeddings=True)
        vec = embedding.tolist()
        if len(self._query_cache) < 1024:
            self._query_cache[cleaned_text] = vec
        return vec

    def embed_documents(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """
        Batch embed a list of document chunk texts and return normalized vectors.
        """
        if not texts:
            return []
        model = self.get_model()
        cleaned_texts = [t.strip() if t else "" for t in texts]
        embeddings = model.encode(
            cleaned_texts,
            batch_size=batch_size,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return [emb.tolist() for emb in embeddings]


embedding_service = EmbeddingService()
