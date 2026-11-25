import hashlib
import re
from typing import List, Dict, Any
import tiktoken


class SemanticChunker:
    def __init__(
        self,
        target_tokens: int = 800,
        overlap_tokens: int = 120,
        encoding_name: str = "cl100k_base"
    ):
        self.target_tokens = target_tokens
        self.overlap_tokens = overlap_tokens
        self.encoder = tiktoken.get_encoding(encoding_name)

    def count_tokens(self, text: str) -> int:
        return len(self.encoder.encode(text))

    def chunk_document(self, pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Split page-by-page document text into semantic chunks targeting target_tokens
        with overlap_tokens overlap while preserving paragraph boundaries.
        """
        # 1. Break pages into paragraph and sentence units
        units: List[Dict[str, Any]] = []
        for page in pages:
            page_num = page["page_number"]
            raw_text = page.get("text", "")
            raw_paragraphs = [p.strip() for p in re.split(r'\n\s*\n', raw_text) if p.strip()]

            for para in raw_paragraphs:
                p_tokens = self.count_tokens(para)
                if p_tokens > self.target_tokens:
                    # Sub-split oversized paragraph by sentence boundaries
                    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', para) if s.strip()]
                    for s in sentences:
                        s_tokens = self.count_tokens(s)
                        if s_tokens > self.target_tokens:
                            # Slicing giant individual sentences by exact tokens
                            token_ids = self.encoder.encode(s)
                            for i in range(0, len(token_ids), self.target_tokens):
                                slice_ids = token_ids[i:i + self.target_tokens]
                                slice_text = self.encoder.decode(slice_ids)
                                units.append({
                                    "page_number": page_num,
                                    "text": slice_text,
                                    "tokens": len(slice_ids)
                                })
                        else:
                            units.append({
                                "page_number": page_num,
                                "text": s,
                                "tokens": s_tokens
                            })
                else:
                    units.append({
                        "page_number": page_num,
                        "text": para,
                        "tokens": p_tokens
                    })

        if not units:
            return []

        # 2. Accumulate paragraph/sentence units into chunks up to target_tokens
        chunks: List[Dict[str, Any]] = []
        current_units: List[Dict[str, Any]] = []
        current_tokens = 0

        for unit in units:
            if current_tokens + unit["tokens"] > self.target_tokens and current_units:
                chunk_text = "\n\n".join(u["text"] for u in current_units)
                chunks.append({
                    "chunk_index": len(chunks),
                    "page_number": current_units[0]["page_number"],
                    "text": chunk_text,
                    "token_count": self.count_tokens(chunk_text),
                    "content_hash": hashlib.sha256(chunk_text.encode("utf-8")).hexdigest(),
                })

                # Compute overlap window: keep trailing units up to overlap_tokens
                overlap_units: List[Dict[str, Any]] = []
                overlap_tokens_count = 0
                for u in reversed(current_units):
                    if overlap_tokens_count + u["tokens"] <= self.overlap_tokens or not overlap_units:
                        overlap_units.insert(0, u)
                        overlap_tokens_count += u["tokens"]
                    else:
                        break
                current_units = list(overlap_units)
                current_tokens = sum(u["tokens"] for u in current_units)

            current_units.append(unit)
            current_tokens += unit["tokens"]

        # Final chunk
        if current_units:
            chunk_text = "\n\n".join(u["text"] for u in current_units)
            chunks.append({
                "chunk_index": len(chunks),
                "page_number": current_units[0]["page_number"],
                "text": chunk_text,
                "token_count": self.count_tokens(chunk_text),
                "content_hash": hashlib.sha256(chunk_text.encode("utf-8")).hexdigest(),
            })

        return chunks
