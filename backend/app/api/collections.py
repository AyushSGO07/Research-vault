from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.models.document import Document
from app.models.collection import Collection, CollectionDocument
from app.schemas.collection import (
    CollectionCreate,
    CollectionUpdate,
    CollectionResponse,
    CollectionDetailResponse,
)

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("/", response_model=List[CollectionResponse])
def list_collections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    collections = (
        db.query(Collection)
        .filter(Collection.user_id == current_user.id)
        .order_by(Collection.created_at.desc())
        .all()
    )
    if not collections:
        return []

    coll_ids = [c.id for c in collections]
    counts_raw = (
        db.query(CollectionDocument.collection_id, func.count(CollectionDocument.id))
        .filter(CollectionDocument.collection_id.in_(coll_ids))
        .group_by(CollectionDocument.collection_id)
        .all()
    )
    counts_map = dict(counts_raw)

    result = []
    for c in collections:
        result.append(
            CollectionResponse(
                id=c.id,
                name=c.name,
                description=c.description,
                color=c.color,
                document_count=counts_map.get(c.id, 0),
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
        )
    return result


@router.get("/document/{doc_id}", response_model=List[int])
def get_collections_for_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns list of collection IDs that contain the given document for this user."""
    coll_ids = (
        db.query(CollectionDocument.collection_id)
        .join(Collection, Collection.id == CollectionDocument.collection_id)
        .filter(Collection.user_id == current_user.id, CollectionDocument.document_id == doc_id)
        .all()
    )
    return [c[0] for c in coll_ids]


@router.post("/", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
def create_collection(
    payload: CollectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coll = Collection(
        user_id=current_user.id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        color=payload.color or "#315EAB",
    )
    db.add(coll)
    db.commit()
    db.refresh(coll)

    return CollectionResponse(
        id=coll.id,
        name=coll.name,
        description=coll.description,
        color=coll.color,
        document_count=0,
        created_at=coll.created_at,
        updated_at=coll.updated_at,
    )


@router.get("/{id}", response_model=CollectionDetailResponse)
def get_collection(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coll = (
        db.query(Collection)
        .filter(Collection.id == id, Collection.user_id == current_user.id)
        .first()
    )
    if not coll:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")

    docs = (
        db.query(Document)
        .join(CollectionDocument, CollectionDocument.document_id == Document.id)
        .filter(CollectionDocument.collection_id == coll.id)
        .order_by(CollectionDocument.created_at.desc())
        .all()
    )

    return CollectionDetailResponse(
        id=coll.id,
        name=coll.name,
        description=coll.description,
        color=coll.color,
        documents=docs,
        created_at=coll.created_at,
        updated_at=coll.updated_at,
    )


@router.put("/{id}", response_model=CollectionResponse)
def update_collection(
    id: int,
    payload: CollectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coll = (
        db.query(Collection)
        .filter(Collection.id == id, Collection.user_id == current_user.id)
        .first()
    )
    if not coll:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")

    if payload.name is not None:
        coll.name = payload.name.strip()
    if payload.description is not None:
        coll.description = payload.description.strip() if payload.description else None
    if payload.color is not None:
        coll.color = payload.color

    db.commit()
    db.refresh(coll)

    doc_count = db.query(CollectionDocument).filter(CollectionDocument.collection_id == coll.id).count()
    return CollectionResponse(
        id=coll.id,
        name=coll.name,
        description=coll.description,
        color=coll.color,
        document_count=doc_count,
        created_at=coll.created_at,
        updated_at=coll.updated_at,
    )


@router.delete("/{id}")
def delete_collection(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coll = (
        db.query(Collection)
        .filter(Collection.id == id, Collection.user_id == current_user.id)
        .first()
    )
    if not coll:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")

    db.delete(coll)
    db.commit()
    return {"message": "Collection deleted successfully."}


@router.post("/{id}/documents/{doc_id}", status_code=status.HTTP_200_OK)
def add_document_to_collection(
    id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coll = (
        db.query(Collection)
        .filter(Collection.id == id, Collection.user_id == current_user.id)
        .first()
    )
    if not coll:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")

    doc = (
        db.query(Document)
        .filter(Document.id == doc_id, Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    # Check if already added
    existing = (
        db.query(CollectionDocument)
        .filter(CollectionDocument.collection_id == id, CollectionDocument.document_id == doc_id)
        .first()
    )
    if not existing:
        entry = CollectionDocument(collection_id=id, document_id=doc_id)
        db.add(entry)
        db.commit()

    return {"message": "Document added to collection successfully."}


@router.delete("/{id}/documents/{doc_id}")
def remove_document_from_collection(
    id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coll = (
        db.query(Collection)
        .filter(Collection.id == id, Collection.user_id == current_user.id)
        .first()
    )
    if not coll:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")

    entry = (
        db.query(CollectionDocument)
        .filter(CollectionDocument.collection_id == id, CollectionDocument.document_id == doc_id)
        .first()
    )
    if entry:
        db.delete(entry)
        db.commit()

    return {"message": "Document removed from collection successfully."}
