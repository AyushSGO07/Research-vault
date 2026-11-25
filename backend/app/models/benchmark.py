from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.session import Base


class BenchmarkSuite(Base):
    __tablename__ = "benchmark_suites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="benchmark_suites")
    queries = relationship("BenchmarkQuery", back_populates="suite", cascade="all, delete-orphan", order_by="BenchmarkQuery.id")
    runs = relationship("BenchmarkRun", back_populates="suite", cascade="all, delete-orphan", order_by="BenchmarkRun.created_at.desc()")


class BenchmarkQuery(Base):
    __tablename__ = "benchmark_queries"

    id = Column(Integer, primary_key=True, index=True)
    suite_id = Column(Integer, ForeignKey("benchmark_suites.id", ondelete="CASCADE"), nullable=False, index=True)
    query_text = Column(Text, nullable=False)
    category = Column(String(50), default="conceptual", nullable=False)  # keyword, conceptual, compound
    difficulty = Column(String(50), default="medium", nullable=False)    # easy, medium, hard
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    suite = relationship("BenchmarkSuite", back_populates="queries")
    judgments = relationship("BenchmarkJudgment", back_populates="query", cascade="all, delete-orphan")


class BenchmarkJudgment(Base):
    __tablename__ = "benchmark_judgments"

    id = Column(Integer, primary_key=True, index=True)
    query_id = Column(Integer, ForeignKey("benchmark_queries.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    relevance_grade = Column(Integer, default=1, nullable=False)  # 1 = relevant, 2 = highly relevant
    rationale = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    query = relationship("BenchmarkQuery", back_populates="judgments")
    document = relationship("Document")


class BenchmarkRun(Base):
    __tablename__ = "benchmark_runs"

    id = Column(Integer, primary_key=True, index=True)
    suite_id = Column(Integer, ForeignKey("benchmark_suites.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    duration_ms = Column(Float, nullable=False)
    winner_mode = Column(String(50), nullable=False)
    aggregate_metrics = Column(Text, nullable=False)  # JSON-encoded dictionary of ModeMetrics
    query_results = Column(Text, nullable=False)      # JSON-encoded list of QueryEvaluationResult
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    suite = relationship("BenchmarkSuite", back_populates="runs")
    user = relationship("User")
