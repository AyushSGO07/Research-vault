import math
import re
from typing import List, Dict, Any
from rank_bm25 import BM25Okapi
from app.models.document import DocumentChunk


class BM25Retriever:
    """
    Sparse lexical retrieval engine using BM25Okapi with standard Lucene
    non-negative IDF formulation. Handles academic terminology, exact keywords,
    author surnames, and acronyms across arbitrary corpus sizes.
    """

    def __init__(self):
        self._token_cache: Dict[str, List[str]] = {}

    def get_or_tokenize(self, chunk: DocumentChunk) -> List[str]:
        cache_key = chunk.content_hash or f"{chunk.id}_{len(chunk.text)}"
        if cache_key in self._token_cache:
            return self._token_cache[cache_key]
        tokens = self.tokenize(chunk.text)
        if len(self._token_cache) < 50000:
            self._token_cache[cache_key] = tokens
        return tokens

    @staticmethod
    def tokenize(text: str) -> List[str]:
        """
        Tokenize text into lowercase alphanumeric tokens with minimum length of 2.
        """
        if not text:
            return []
        tokens = re.findall(r'\b[a-zA-Z0-9_\-]{2,}\b', text.lower())
        return tokens

    def search(
        self,
        query: str,
        chunks: List[DocumentChunk],
        top_k: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Score document chunks against the query using BM25 with Lucene-standard IDF.
        Returns top_k matching chunks with score > 0 sorted descending.
        """
        if not chunks:
            return []

        tokenized_query = self.tokenize(query)
        if not tokenized_query:
            return []

        tokenized_corpus = [self.get_or_tokenize(c) for c in chunks]
        bm25 = BM25Okapi(tokenized_corpus)

        # Apply Lucene non-negative IDF: log(1 + (N - n + 0.5) / (n + 0.5))
        n_docs = len(tokenized_corpus)
        nd: Dict[str, int] = {}
        for doc_tokens in tokenized_corpus:
            for token in set(doc_tokens):
                nd[token] = nd.get(token, 0) + 1

        bm25.idf = {
            token: math.log(1.0 + (n_docs - freq + 0.5) / (freq + 0.5))
            for token, freq in nd.items()
        }

        scores = bm25.get_scores(tokenized_query)

        scored_candidates = []
        for idx, score in enumerate(scores):
            if score > 0.0:
                chunk = chunks[idx]
                scored_candidates.append({
                    "chunk_id": chunk.id,
                    "document_id": chunk.document_id,
                    "chunk_index": chunk.chunk_index,
                    "page_number": chunk.page_number,
                    "text": chunk.text,
                    "token_count": chunk.token_count,
                    "score": round(float(score), 4),
                })

        scored_candidates.sort(key=lambda x: x["score"], reverse=True)
        return scored_candidates[:top_k]


bm25_retriever = BM25Retriever()
