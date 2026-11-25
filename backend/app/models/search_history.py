from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


class SearchHistory(Base):
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    query = Column(String(500), nullable=False)
    mode = Column(String(50), default="hybrid", nullable=False)
    result_count = Column(Integer, default=0, nullable=False)
    filters_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="search_history")

    def __repr__(self):
        return f"<SearchHistory user_id={self.user_id} query={self.query}>"
