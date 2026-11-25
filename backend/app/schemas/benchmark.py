from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class BenchmarkJudgmentCreate(BaseModel):
    document_id: int
    relevance_grade: int = Field(default=1, ge=1, le=2)
    rationale: Optional[str] = None


class BenchmarkJudgmentResponse(BaseModel):
    id: int
    query_id: int
    document_id: int
    document_title: Optional[str] = None
    relevance_grade: int
    rationale: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BenchmarkQueryCreate(BaseModel):
    query_text: str
    category: str = "conceptual"
    difficulty: str = "medium"
    judgments: List[BenchmarkJudgmentCreate] = []


class BenchmarkQueryResponse(BaseModel):
    id: int
    suite_id: int
    query_text: str
    category: str
    difficulty: str
    judgments: List[BenchmarkJudgmentResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BenchmarkSuiteCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class BenchmarkSuiteResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    is_default: bool
    query_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BenchmarkSuiteDetail(BenchmarkSuiteResponse):
    queries: List[BenchmarkQueryResponse] = []


class ModeMetrics(BaseModel):
    ndcg_10: float
    mrr: float
    precision_1: float
    precision_5: float
    precision_10: float
    recall_5: float
    recall_10: float
    map_10: float
    mean_latency_ms: float


class PerModeQueryResult(BaseModel):
    rank: Optional[int] = None  # 1-based rank or None if not in top 10
    score: float = 0.0
    is_hit_top1: bool = False
    is_hit_top5: bool = False
    is_hit_top10: bool = False


class QueryEvaluationResult(BaseModel):
    query_id: int
    query_text: str
    category: str
    ground_truth_doc_ids: List[int]
    ground_truth_titles: List[str]
    mode_results: Dict[str, PerModeQueryResult]
    qualitative_insight: str


class ComparativeEvaluationReport(BaseModel):
    run_id: int
    suite_id: int
    suite_name: str
    total_queries: int
    total_documents_judged: int
    duration_ms: float
    winner_mode: str
    mode_metrics: Dict[str, ModeMetrics]
    percentage_gains_over_bm25: Dict[str, Dict[str, float]]
    query_breakdowns: List[QueryEvaluationResult]
    created_at: datetime


class RunBenchmarkRequest(BaseModel):
    suite_id: Optional[int] = None
    modes: Optional[List[str]] = None


class BenchmarkRunSummary(BaseModel):
    id: int
    suite_id: int
    suite_name: str
    duration_ms: float
    winner_mode: str
    aggregate_metrics: Dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
