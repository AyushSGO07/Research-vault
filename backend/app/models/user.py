from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.database.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    collections = relationship("Collection", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    saved_papers = relationship("SavedPaper", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    search_history = relationship("SearchHistory", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    benchmark_suites = relationship("BenchmarkSuite", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)

    def __repr__(self):
        return f"<User id={self.id} email={self.email}>"
