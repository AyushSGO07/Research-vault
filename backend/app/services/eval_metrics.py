import math
from typing import List, Set, Dict


def compute_precision_at_k(retrieved_doc_ids: List[int], relevant_doc_ids: Set[int], k: int) -> float:
    """Computes Precision@K: fraction of retrieved documents in top-K that are relevant."""
    if k <= 0:
        return 0.0
    top_k = retrieved_doc_ids[:k]
    hits = sum(1 for doc_id in top_k if doc_id in relevant_doc_ids)
    return round(hits / k, 4)


def compute_recall_at_k(retrieved_doc_ids: List[int], relevant_doc_ids: Set[int], k: int) -> float:
    """Computes Recall@K: fraction of all relevant documents retrieved in top-K."""
    if not relevant_doc_ids or k <= 0:
        return 0.0
    top_k = retrieved_doc_ids[:k]
    hits = sum(1 for doc_id in top_k if doc_id in relevant_doc_ids)
    return round(hits / len(relevant_doc_ids), 4)


def compute_mrr(retrieved_doc_ids: List[int], relevant_doc_ids: Set[int], k: int = 10) -> float:
    """Computes Reciprocal Rank (RR): 1 / rank of first relevant retrieved document within top-K."""
    if not relevant_doc_ids or k <= 0:
        return 0.0
    for rank, doc_id in enumerate(retrieved_doc_ids[:k], start=1):
        if doc_id in relevant_doc_ids:
            return round(1.0 / rank, 4)
    return 0.0


def compute_ndcg_at_k(retrieved_doc_ids: List[int], relevance_grades: Dict[int, int], k: int = 10) -> float:
    """
    Computes Normalized Discounted Cumulative Gain (NDCG@K) with graded relevance:
    DCG@K = sum_{i=1}^K (2^{rel_i} - 1) / log2(i + 1)
    NDCG@K = DCG@K / IDCG@K
    """
    if k <= 0:
        return 0.0

    # Calculate DCG@K
    dcg = 0.0
    for rank, doc_id in enumerate(retrieved_doc_ids[:k], start=1):
        grade = relevance_grades.get(doc_id, 0)
        if grade > 0:
            dcg += (math.pow(2, grade) - 1.0) / math.log2(rank + 1)

    # Calculate IDCG@K (ideal ordering of available graded documents)
    positive_grades = [g for g in relevance_grades.values() if g > 0]
    if not positive_grades:
        return 0.0

    ideal_grades = sorted(positive_grades, reverse=True)[:k]
    idcg = 0.0
    for rank, grade in enumerate(ideal_grades, start=1):
        idcg += (math.pow(2, grade) - 1.0) / math.log2(rank + 1)

    if idcg == 0.0:
        return 1.0 if dcg == 0.0 else 0.0

    return round(dcg / idcg, 4)


def compute_average_precision(retrieved_doc_ids: List[int], relevant_doc_ids: Set[int], k: int = 10) -> float:
    """Computes Average Precision at rank K (AP@K)."""
    if not relevant_doc_ids or k <= 0:
        return 0.0

    hits = 0
    sum_precisions = 0.0
    top_k = retrieved_doc_ids[:k]

    for rank, doc_id in enumerate(top_k, start=1):
        if doc_id in relevant_doc_ids:
            hits += 1
            sum_precisions += hits / rank

    denominator = min(k, len(relevant_doc_ids))
    if denominator == 0:
        return 0.0

    return round(sum_precisions / denominator, 4)
