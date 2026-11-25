from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    sha256_hash = Column(String(64), index=True, nullable=False)
    status = Column(String(20), default="uploaded", index=True, nullable=False)  # 'uploaded', 'processing', 'indexed', 'failed'
    error_message = Column(Text, nullable=True)
    title = Column(String(500), nullable=True)
    authors = Column(Text, nullable=True)
    publication_year = Column(Integer, nullable=True)
    abstract = Column(Text, nullable=True)
    doi = Column(String(100), nullable=True)
    journal = Column(String(255), nullable=True)
    total_pages = Column(Integer, default=0, nullable=False)
    total_chunks = Column(Integer, default=0, nullable=False)
    domain = Column(String(100), nullable=True, default="Computer Science")
    document_type = Column(String(50), nullable=True, default="Preprint")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan", passive_deletes=True)
    collection_entries = relationship("CollectionDocument", back_populates="document", cascade="all, delete-orphan", passive_deletes=True)
    saved_entries = relationship("SavedPaper", back_populates="document", cascade="all, delete-orphan", passive_deletes=True)

    def __repr__(self):
        return f"<Document id={self.id} filename={self.filename} status={self.status}>"


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=False)
    content_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    document = relationship("Document", back_populates="chunks")

    def __repr__(self):
        return f"<DocumentChunk id={self.id} doc_id={self.document_id} index={self.chunk_index} page={self.page_number}>"
