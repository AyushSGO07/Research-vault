from typing import List, Set
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.models.document import Document
from app.models.saved_paper import SavedPaper
from app.schemas.document import DocumentResponse

router = APIRouter(prefix="/saved", tags=["saved_papers"])


@router.get("/", response_model=List[DocumentResponse])
def list_saved_papers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all documents bookmarked/saved by the authenticated user.
    """
    saved = (
        db.query(Document)
        .join(SavedPaper, SavedPaper.document_id == Document.id)
        .filter(SavedPaper.user_id == current_user.id)
        .order_by(SavedPaper.created_at.desc())
        .all()
    )
    return saved


@router.get("/ids", response_model=List[int])
def get_saved_paper_ids(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns list of document IDs saved by the user for fast UI bookmark state checks.
    """
    ids = (
        db.query(SavedPaper.document_id)
        .filter(SavedPaper.user_id == current_user.id)
        .all()
    )
    return [i[0] for i in ids]


@router.post("/{doc_id}", status_code=status.HTTP_200_OK)
def save_paper(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = (
        db.query(Document)
        .filter(Document.id == doc_id, Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    existing = (
        db.query(SavedPaper)
        .filter(SavedPaper.user_id == current_user.id, SavedPaper.document_id == doc_id)
        .first()
    )
    if not existing:
        entry = SavedPaper(user_id=current_user.id, document_id=doc_id)
        db.add(entry)
        db.commit()

    return {"message": "Paper saved to library successfully.", "saved": True}


@router.delete("/{doc_id}")
def unsave_paper(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = (
        db.query(SavedPaper)
        .filter(SavedPaper.user_id == current_user.id, SavedPaper.document_id == doc_id)
        .first()
    )
    if entry:
        db.delete(entry)
        db.commit()

    return {"message": "Paper removed from saved library.", "saved": False}
