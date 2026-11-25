from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.models.search_history import SearchHistory
from app.schemas.search_history import SearchHistoryResponse, SearchHistoryCreate

router = APIRouter(prefix="/history", tags=["search_history"])


@router.get("/", response_model=List[SearchHistoryResponse])
def list_search_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List past search queries ordered chronologically descending.
    """
    history = (
        db.query(SearchHistory)
        .filter(SearchHistory.user_id == current_user.id)
        .order_by(SearchHistory.created_at.desc())
        .limit(100)
        .all()
    )
    return history


@router.post("/", response_model=SearchHistoryResponse, status_code=status.HTTP_201_CREATED)
def record_search_history(
    payload: SearchHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = SearchHistory(
        user_id=current_user.id,
        query=payload.query.strip(),
        mode=payload.mode,
        result_count=payload.result_count,
        filters_json=payload.filters_json,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/")
def clear_search_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Clear all search inquiries for the authenticated user.
    """
    db.query(SearchHistory).filter(SearchHistory.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Search history cleared successfully."}


@router.delete("/{id}")
def delete_search_history_entry(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = (
        db.query(SearchHistory)
        .filter(SearchHistory.id == id, SearchHistory.user_id == current_user.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History entry not found.")

    db.delete(entry)
    db.commit()
    return {"message": "Search history entry deleted."}
