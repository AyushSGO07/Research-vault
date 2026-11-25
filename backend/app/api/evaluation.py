import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, get_db
from app.core.rate_limiter import limiter
from app.models.user import User
from app.models.benchmark import BenchmarkSuite, BenchmarkQuery, BenchmarkJudgment, BenchmarkRun
from app.schemas.benchmark import (
    BenchmarkSuiteCreate,
    BenchmarkSuiteResponse,
    BenchmarkSuiteDetail,
    BenchmarkQueryCreate,
    BenchmarkQueryResponse,
    BenchmarkJudgmentResponse,
    RunBenchmarkRequest,
    ComparativeEvaluationReport,
    BenchmarkRunSummary,
    ModeMetrics,
    QueryEvaluationResult,
)
from app.services.eval_service import EvaluationService

router = APIRouter(prefix="/evaluation", tags=["evaluation"])


@router.get("/suites", response_model=List[BenchmarkSuiteResponse])
def list_benchmark_suites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists available benchmark suites (default system suites and user's custom suites)."""
    # Ensure default suite exists for the user
    EvaluationService.ensure_default_suite(db, current_user.id)

    suites = (
        db.query(BenchmarkSuite)
        .filter(
            (BenchmarkSuite.user_id == current_user.id) | (BenchmarkSuite.user_id == None)
        )
        .order_by(BenchmarkSuite.is_default.desc(), BenchmarkSuite.id.desc())
        .all()
    )

    results = []
    for s in suites:
        q_count = len(s.queries)
        results.append(
            BenchmarkSuiteResponse(
                id=s.id,
                user_id=s.user_id,
                name=s.name,
                description=s.description,
                is_default=s.is_default,
                query_count=q_count,
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
        )
    return results


@router.get("/suites/{id}", response_model=BenchmarkSuiteDetail)
def get_benchmark_suite(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves full benchmark suite details including queries and ground-truth document judgments."""
    suite = (
        db.query(BenchmarkSuite)
        .filter(
            BenchmarkSuite.id == id,
            (BenchmarkSuite.user_id == current_user.id) | (BenchmarkSuite.user_id == None),
        )
        .first()
    )
    if not suite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Benchmark suite not found")

    query_responses = []
    for q in suite.queries:
        judgments = []
        for j in q.judgments:
            judgments.append(
                BenchmarkJudgmentResponse(
                    id=j.id,
                    query_id=j.query_id,
                    document_id=j.document_id,
                    document_title=j.document.title if j.document else None,
                    relevance_grade=j.relevance_grade,
                    rationale=j.rationale,
                    created_at=j.created_at,
                )
            )
        query_responses.append(
            BenchmarkQueryResponse(
                id=q.id,
                suite_id=q.suite_id,
                query_text=q.query_text,
                category=q.category,
                difficulty=q.difficulty,
                judgments=judgments,
                created_at=q.created_at,
            )
        )

    return BenchmarkSuiteDetail(
        id=suite.id,
        user_id=suite.user_id,
        name=suite.name,
        description=suite.description,
        is_default=suite.is_default,
        query_count=len(suite.queries),
        queries=query_responses,
        created_at=suite.created_at,
        updated_at=suite.updated_at,
    )


@router.post("/suites", response_model=BenchmarkSuiteResponse, status_code=status.HTTP_201_CREATED)
def create_benchmark_suite(
    payload: BenchmarkSuiteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creates a new custom benchmark suite for the authenticated user."""
    suite = BenchmarkSuite(
        user_id=current_user.id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        is_default=False,
    )
    db.add(suite)
    db.commit()
    db.refresh(suite)

    return BenchmarkSuiteResponse(
        id=suite.id,
        user_id=suite.user_id,
        name=suite.name,
        description=suite.description,
        is_default=suite.is_default,
        query_count=0,
        created_at=suite.created_at,
        updated_at=suite.updated_at,
    )


@router.post("/suites/{id}/queries", response_model=BenchmarkQueryResponse, status_code=status.HTTP_201_CREATED)
def add_query_to_suite(
    id: int,
    payload: BenchmarkQueryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Adds a new query with ground-truth document judgments to a custom benchmark suite."""
    suite = (
        db.query(BenchmarkSuite)
        .filter(BenchmarkSuite.id == id, BenchmarkSuite.user_id == current_user.id)
        .first()
    )
    if not suite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom benchmark suite not found or unauthorized to modify",
        )

    query = BenchmarkQuery(
        suite_id=suite.id,
        query_text=payload.query_text.strip(),
        category=payload.category,
        difficulty=payload.difficulty,
    )
    db.add(query)
    db.flush()

    judgment_responses = []
    for j_in in payload.judgments:
        judgment = BenchmarkJudgment(
            query_id=query.id,
            document_id=j_in.document_id,
            relevance_grade=j_in.relevance_grade,
            rationale=j_in.rationale,
        )
        db.add(judgment)
        db.flush()
        judgment_responses.append(
            BenchmarkJudgmentResponse(
                id=judgment.id,
                query_id=query.id,
                document_id=judgment.document_id,
                document_title=judgment.document.title if judgment.document else None,
                relevance_grade=judgment.relevance_grade,
                rationale=judgment.rationale,
                created_at=judgment.created_at,
            )
        )

    db.commit()
    db.refresh(query)

    return BenchmarkQueryResponse(
        id=query.id,
        suite_id=query.suite_id,
        query_text=query.query_text,
        category=query.category,
        difficulty=query.difficulty,
        judgments=judgment_responses,
        created_at=query.created_at,
    )


@router.delete("/suites/{id}", status_code=status.HTTP_200_OK)
def delete_benchmark_suite(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deletes a custom benchmark suite owned by the user. Default suites cannot be deleted."""
    suite = (
        db.query(BenchmarkSuite)
        .filter(BenchmarkSuite.id == id, BenchmarkSuite.user_id == current_user.id)
        .first()
    )
    if not suite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Benchmark suite not found or unauthorized to delete",
        )

    if suite.is_default:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Default academic benchmark suite cannot be deleted",
        )

    db.delete(suite)
    db.commit()
    return {"message": f"Benchmark suite #{id} successfully deleted"}


@router.post("/run", response_model=ComparativeEvaluationReport)
@limiter.limit("10/minute")
def run_benchmark_evaluation(
    request: Request,
    payload: RunBenchmarkRequest = RunBenchmarkRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Executes a comprehensive benchmark run across retrieval paradigms (BM25, Dense Semantic,
    Hybrid RRF, and Cross-Encoder Reranked) using authentic queries and documents.
    """
    try:
        report = EvaluationService.execute_benchmark(
            db=db,
            user_id=current_user.id,
            suite_id=payload.suite_id,
            modes=payload.modes,
        )
        return report
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Benchmark execution failed: {str(e)}",
        )


@router.get("/runs", response_model=List[BenchmarkRunSummary])
def list_benchmark_runs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists past benchmark evaluation runs for the user."""
    runs = (
        db.query(BenchmarkRun)
        .filter(BenchmarkRun.user_id == current_user.id)
        .order_by(BenchmarkRun.created_at.desc())
        .limit(30)
        .all()
    )

    results = []
    for r in runs:
        try:
            agg = json.loads(r.aggregate_metrics)
        except Exception:
            agg = {}
        results.append(
            BenchmarkRunSummary(
                id=r.id,
                suite_id=r.suite_id,
                suite_name=r.suite.name if r.suite else f"Suite #{r.suite_id}",
                duration_ms=r.duration_ms,
                winner_mode=r.winner_mode,
                aggregate_metrics=agg,
                created_at=r.created_at,
            )
        )
    return results


@router.get("/runs/{id}", response_model=ComparativeEvaluationReport)
def get_benchmark_run_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves full comparative evaluation report of a past run."""
    run = (
        db.query(BenchmarkRun)
        .filter(BenchmarkRun.id == id, BenchmarkRun.user_id == current_user.id)
        .first()
    )
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Benchmark run record not found")

    try:
        raw_metrics = json.loads(run.aggregate_metrics)
        raw_queries = json.loads(run.query_results)

        mode_metrics = {m: ModeMetrics(**data) for m, data in raw_metrics.items()}
        query_breakdowns = [QueryEvaluationResult(**data) for data in raw_queries]

        # Calculate percentage gains over BM25
        bm25_metrics = mode_metrics.get("keyword")
        percentage_gains = {}
        if bm25_metrics:
            for mode_name, cur in mode_metrics.items():
                if mode_name == "keyword":
                    continue
                percentage_gains[mode_name] = {
                    "ndcg_10": round(((cur.ndcg_10 - bm25_metrics.ndcg_10) / max(bm25_metrics.ndcg_10, 0.0001)) * 100, 1),
                    "mrr": round(((cur.mrr - bm25_metrics.mrr) / max(bm25_metrics.mrr, 0.0001)) * 100, 1),
                    "precision_5": round(((cur.precision_5 - bm25_metrics.precision_5) / max(bm25_metrics.precision_5, 0.0001)) * 100, 1),
                    "recall_5": round(((cur.recall_5 - bm25_metrics.recall_5) / max(bm25_metrics.recall_5, 0.0001)) * 100, 1),
                }

        return ComparativeEvaluationReport(
            run_id=run.id,
            suite_id=run.suite_id,
            suite_name=run.suite.name if run.suite else f"Suite #{run.suite_id}",
            total_queries=len(query_breakdowns),
            total_documents_judged=sum(len(q.ground_truth_doc_ids) for q in query_breakdowns),
            duration_ms=run.duration_ms,
            winner_mode=run.winner_mode,
            mode_metrics=mode_metrics,
            percentage_gains_over_bm25=percentage_gains,
            query_breakdowns=query_breakdowns,
            created_at=run.created_at,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse run report: {str(e)}",
        )


@router.get("/export/{run_id}")
def export_benchmark_report(
    run_id: int,
    format: str = Query("markdown", pattern="^(markdown|json)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exports a benchmark run report as a formatted Markdown summary or raw JSON."""
    report = get_benchmark_run_detail(run_id, db, current_user)

    if format == "json":
        return report

    # Generate Markdown summary
    md_lines = [
        f"# ResearchVault Search Evaluation Benchmark Report",
        f"",
        f"- **Run ID:** #{report.run_id}",
        f"- **Suite:** {report.suite_name}",
        f"- **Evaluated Queries:** {report.total_queries}",
        f"- **Execution Time:** {report.duration_ms:.1f} ms",
        f"- **Top Performing Paradigm:** {report.winner_mode.upper()}",
        f"- **Date:** {report.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"",
        f"---",
        f"",
        f"## 1. Macro Comparative Metrics",
        f"",
        f"| Metric | Keyword (BM25) | Dense Semantic | Hybrid (RRF) | Hybrid + Reranked |",
        f"|---|---|---|---|---|",
    ]

    metrics_order = [
        ("NDCG@10", "ndcg_10"),
        ("MRR", "mrr"),
        ("Precision@1", "precision_1"),
        ("Precision@5", "precision_5"),
        ("Precision@10", "precision_10"),
        ("Recall@5", "recall_5"),
        ("Recall@10", "recall_10"),
        ("MAP@10", "map_10"),
        ("Mean Latency (ms)", "mean_latency_ms"),
    ]

    for label, key in metrics_order:
        kw = getattr(report.mode_metrics.get("keyword"), key, 0.0) if report.mode_metrics.get("keyword") else 0.0
        sem = getattr(report.mode_metrics.get("semantic"), key, 0.0) if report.mode_metrics.get("semantic") else 0.0
        hyb = getattr(report.mode_metrics.get("hybrid"), key, 0.0) if report.mode_metrics.get("hybrid") else 0.0
        rr = getattr(report.mode_metrics.get("reranked"), key, 0.0) if report.mode_metrics.get("reranked") else 0.0
        md_lines.append(f"| **{label}** | {kw} | {sem} | {hyb} | {rr} |")

    md_lines.extend([
        f"",
        f"---",
        f"",
        f"## 2. Per-Query Breakdown & Retrieval Diagnostics",
        f"",
    ])

    for idx, q in enumerate(report.query_breakdowns, start=1):
        md_lines.extend([
            f"### Query {idx}: \"{q.query_text}\"",
            f"- **Category:** {q.category.capitalize()}",
            f"- **Target Relevant Documents:** {', '.join(q.ground_truth_titles) if q.ground_truth_titles else 'None'}",
            f"- **Ranks:**",
        ])
        for mode_name, res in q.mode_results.items():
            rank_str = f"Rank {res.rank} (score: {res.score:.4f})" if res.rank else "Not retrieved in top-10"
            md_lines.append(f"  - **{mode_name.capitalize()}:** {rank_str}")
        md_lines.append(f"- **Insight:** {q.qualitative_insight}")
        md_lines.append("")

    return PlainTextResponse("\n".join(md_lines), media_type="text/markdown")
