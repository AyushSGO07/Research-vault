import math
import pytest
from app.services.eval_metrics import (
    compute_precision_at_k,
    compute_recall_at_k,
    compute_mrr,
    compute_ndcg_at_k,
    compute_average_precision,
)


def test_precision_at_k():
    retrieved = [10, 20, 30, 40, 50]
    relevant = {20, 40, 99}

    assert compute_precision_at_k(retrieved, relevant, k=1) == 0.0
    assert compute_precision_at_k(retrieved, relevant, k=2) == 0.50  # [10, 20] -> 1/2
    assert compute_precision_at_k(retrieved, relevant, k=4) == 0.50  # [10, 20, 30, 40] -> 2/4
    assert compute_precision_at_k(retrieved, relevant, k=5) == 0.40  # 2/5

    # Edge cases
    assert compute_precision_at_k([], relevant, k=5) == 0.0
    assert compute_precision_at_k(retrieved, set(), k=5) == 0.0
    assert compute_precision_at_k(retrieved, relevant, k=0) == 0.0


def test_recall_at_k():
    retrieved = [10, 20, 30, 40, 50]
    relevant = {20, 40, 99, 100}  # total 4 relevant

    assert compute_recall_at_k(retrieved, relevant, k=1) == 0.0
    assert compute_recall_at_k(retrieved, relevant, k=2) == 0.25  # 1/4
    assert compute_recall_at_k(retrieved, relevant, k=5) == 0.50  # 2/4

    # Perfect recall
    assert compute_recall_at_k(retrieved, {10, 20}, k=2) == 1.0

    # Edge cases
    assert compute_recall_at_k(retrieved, set(), k=5) == 0.0
    assert compute_recall_at_k([], relevant, k=5) == 0.0
    assert compute_recall_at_k(retrieved, relevant, k=0) == 0.0


def test_mrr():
    retrieved = [10, 20, 30, 40, 50]

    # Rank 1 hit
    assert compute_mrr(retrieved, {10}) == 1.0

    # Rank 2 hit
    assert compute_mrr(retrieved, {20, 40}) == 0.50

    # Rank 4 hit
    assert compute_mrr(retrieved, {40}) == 0.25

    # No hit in top 5
    assert compute_mrr(retrieved, {999}, k=5) == 0.0

    # Edge cases
    assert compute_mrr([], {10}, k=10) == 0.0
    assert compute_mrr(retrieved, set(), k=10) == 0.0


def test_ndcg_at_k_perfect_ranking():
    # Ideal: doc 1 has grade 2, doc 2 has grade 1
    retrieved = [101, 102, 103, 104]
    grades = {101: 2, 102: 1}

    # When retrieved order matches ideal order, NDCG is exactly 1.0
    ndcg = compute_ndcg_at_k(retrieved, grades, k=4)
    assert ndcg == 1.0


def test_ndcg_at_k_inverted_ranking():
    # Inverted: doc 102 (grade 1) ranked at 1, doc 101 (grade 2) ranked at 2
    retrieved = [102, 101, 103, 104]
    grades = {101: 2, 102: 1}

    ndcg = compute_ndcg_at_k(retrieved, grades, k=4)
    # DCG = (2^1 - 1)/log2(2) + (2^2 - 1)/log2(3) = 1/1 + 3/1.58496 = 1 + 1.8928 = 2.8928
    # IDCG = (2^2 - 1)/log2(2) + (2^1 - 1)/log2(3) = 3/1 + 1/1.58496 = 3 + 0.6309 = 3.6309
    # NDCG = 2.8928 / 3.6309 ~ 0.7967
    assert 0.70 < ndcg < 0.90


def test_ndcg_at_k_zero_hits_and_empty():
    retrieved = [10, 20, 30]
    assert compute_ndcg_at_k(retrieved, {999: 2}, k=3) == 0.0
    assert compute_ndcg_at_k([], {10: 2}, k=5) == 0.0
    assert compute_ndcg_at_k(retrieved, {}, k=5) == 0.0


def test_average_precision():
    retrieved = [10, 20, 30, 40, 50]
    relevant = {10, 30}  # ranks 1 and 3

    # Rank 1: hit 1, P@1 = 1/1 = 1.0
    # Rank 3: hit 2, P@3 = 2/3 = 0.6667
    # sum = 1.0 + 0.6667 = 1.6667
    # denominator = min(5, 2) = 2
    # AP = 1.6667 / 2 = 0.8333
    ap = compute_average_precision(retrieved, relevant, k=5)
    assert 0.83 <= ap <= 0.84

    # All hits rank 1 and 2
    assert compute_average_precision(retrieved, {10, 20}, k=5) == 1.0

    # No hits
    assert compute_average_precision(retrieved, {999}, k=5) == 0.0
    assert compute_average_precision([], {10}, k=5) == 0.0
