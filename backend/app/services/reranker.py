import math
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class CrossEncoderReranker:
    _instance: Optional["CrossEncoderReranker"] = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _load_model(self):
        if self._model is None:
            from sentence_transformers import CrossEncoder
            from app.core.config import settings

            model_name = getattr(settings, "RERANKER_MODEL_NAME", "cross-encoder/ms-marco-MiniLM-L-6-v2")
            logger.info(f"Initializing CrossEncoder reranker model: {model_name}")
            self._model = CrossEncoder(model_name)
        return self._model

    @staticmethod
    def _sigmoid(x: float) -> float:
        """
        Convert unconstrained logit into a normalized [0, 1] probability.
        """
        try:
            return 1.0 / (1.0 + math.exp(-float(x)))
        except OverflowError:
            return 1.0 if x > 0 else 0.0

    def rerank(
        self,
        query: str,
        candidate_chunks: List[Dict[str, Any]],
        top_k: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Rerank a candidate chunk pool against the query using neural cross-attention.

        Args:
            query: The user search query string.
            candidate_chunks: List of candidate chunk dictionaries with at least 'text'.
            top_k: Maximum candidate chunks to pass to the cross-encoder.

        Returns:
            List of candidate chunks rescored with normalized cross-encoder scores,
            sorted descending by score.
        """
        if not candidate_chunks:
            return []

        cleaned_query = query.strip()
        if not cleaned_query:
            return candidate_chunks

        model = self._load_model()
        candidates_to_rerank = candidate_chunks[:top_k]
        remaining_candidates = candidate_chunks[top_k:]

        # Build query-passage pairs
        pairs = [(cleaned_query, c.get("text", "")) for c in candidates_to_rerank]

        try:
            raw_scores = model.predict(pairs)
        except Exception as e:
            logger.warning(f"CrossEncoder prediction failed: {e}. Falling back to original scores.")
            return candidate_chunks

        reranked_pool: List[Dict[str, Any]] = []
        for idx, chunk in enumerate(candidates_to_rerank):
            raw_score = raw_scores[idx]
            normalized = round(self._sigmoid(raw_score), 4)

            updated = dict(chunk)
            updated["score"] = normalized
            updated["is_reranked"] = True
            reranked_pool.append(updated)

        # Sort reranked items descending by neural cross-attention score
        reranked_pool.sort(key=lambda x: x["score"], reverse=True)

        # Append any remaining candidates that were beyond top_k
        for chunk in remaining_candidates:
            c_copy = dict(chunk)
            c_copy["is_reranked"] = False
            reranked_pool.append(c_copy)

        return reranked_pool


cross_encoder_reranker = CrossEncoderReranker()
