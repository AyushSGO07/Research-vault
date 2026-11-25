import hashlib
import os
import uuid
from pathlib import Path
from typing import List
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    BackgroundTasks,
    Request,
    Response,
    status,
    Query,
)
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse
from app.api.deps import get_current_user, get_current_user_flexible
from app.core.config import settings
from app.core.rate_limiter import limiter
from app.database.session import get_db
from app.models.document import Document, DocumentChunk
from app.models.user import User
from app.schemas.document import (
    DocumentUploadResponse,
    DocumentStatusResponse,
    DocumentResponse,
    DocumentChunkResponse,
)
from app.services.ingestion import process_document_background

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
@limiter.limit("20/minute")
async def upload_document(
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Validate file extension
    filename = file.filename or ""
    ext = Path(filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Allowed extensions: PDF, DOCX, TXT.",
        )

    # 2. Prepare upload destination
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    temp_filename = f"tmp_{uuid.uuid4().hex}{ext}"
    temp_path = upload_dir / temp_filename

    hasher = hashlib.sha256()
    total_bytes = 0
    first_chunk = True

    try:
        with open(temp_path, "wb") as f:
            while chunk := await file.read(64 * 1024):
                total_bytes += len(chunk)
                if total_bytes > settings.MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        detail="File exceeds maximum allowed size of 50MB.",
                    )

                # Magic bytes verification on first chunk
                if first_chunk:
                    if ext == ".pdf" and not chunk.startswith(b"%PDF-"):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="File content does not match declared extension.",
                        )
                    elif ext == ".docx" and not chunk.startswith(b"PK\x03\x04"):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="File content does not match declared extension.",
                        )
                    first_chunk = False

                hasher.update(chunk)
                f.write(chunk)
    except Exception:
        if temp_path.exists():
            temp_path.unlink()
        raise

    file_hash = hasher.hexdigest()

    # 3. Check for duplicate upload by this user (INGEST-05)
    existing_doc = (
        db.query(Document)
        .filter(Document.user_id == current_user.id, Document.sha256_hash == file_hash)
        .first()
    )
    if existing_doc:
        if temp_path.exists():
            temp_path.unlink()
        response.status_code = status.HTTP_200_OK
        return DocumentUploadResponse(
            id=existing_doc.id,
            filename=existing_doc.filename,
            status=existing_doc.status,
            sha256_hash=existing_doc.sha256_hash,
            is_duplicate=True,
            message="Document already exists in your library. Reusing existing indexed record.",
        )

    # 4. Persist uniquely identified file
    safe_name = Path(filename).name
    final_filename = f"{uuid.uuid4().hex}_{safe_name}"
    final_path = upload_dir / final_filename
    temp_path.rename(final_path)

    # 5. Insert Document entry
    doc = Document(
        user_id=current_user.id,
        filename=safe_name,
        file_path=str(final_path),
        file_size=total_bytes,
        mime_type=file.content_type or "application/octet-stream",
        sha256_hash=file_hash,
        status="uploaded",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # 6. Enqueue asynchronous background ingestion
    background_tasks.add_task(process_document_background, doc.id)

    response.status_code = status.HTTP_202_ACCEPTED
    return DocumentUploadResponse(
        id=doc.id,
        filename=doc.filename,
        status=doc.status,
        sha256_hash=doc.sha256_hash,
        is_duplicate=False,
        message="Document uploaded successfully. Processing initiated.",
    )


@router.get("/{id}/status", response_model=DocumentStatusResponse)
def get_document_status(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = (
        db.query(Document)
        .filter(Document.id == id, Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )
    return doc


@router.get("/{id}", response_model=DocumentResponse)
def get_document_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = (
        db.query(Document)
        .filter(Document.id == id, Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )
    return doc


@router.get("/{id}/file")
@limiter.limit("120/minute")
def get_document_file(
    request: Request,
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible),
):
    """
    Stream authentic document file inline with HTTP byte range support.
    Accepts Authorization header or ?token= query parameter for iframe embedding.
    """
    doc = (
        db.query(Document)
        .filter(Document.id == id, Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    # Path traversal security guard: ensure file_path resolves within UPLOAD_DIR
    upload_root = Path(settings.UPLOAD_DIR).resolve()
    target_path = Path(doc.file_path).resolve()
    try:
        target_path.relative_to(upload_root)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: path traversal detected.",
        )

    if not os.path.exists(doc.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found on disk.",
        )

    ext = Path(doc.file_path).suffix.lower()
    if ext == ".pdf":
        media_type = "application/pdf"
    elif ext == ".docx":
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif ext == ".txt":
        media_type = "text/plain; charset=utf-8"
    else:
        media_type = doc.mime_type or "application/octet-stream"

    return FileResponse(
        doc.file_path,
        media_type=media_type,
        headers={
            "Content-Disposition": f"inline; filename=\"{doc.filename}\"",
            "Accept-Ranges": "bytes",
        },
    )


@router.get("/{id}/chunks", response_model=List[DocumentChunkResponse])
def get_document_chunks(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve all semantic chunks and page mappings for a document.
    """
    doc = (
        db.query(Document)
        .filter(Document.id == id, Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == id)
        .order_by(DocumentChunk.chunk_index.asc())
        .all()
    )
    return chunks


@router.get("/", response_model=List[DocumentResponse])
def list_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    documents = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return documents


@router.delete("/{id}")
def delete_document(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = (
        db.query(Document)
        .filter(Document.id == id, Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    # Clean up physical file on disk
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    # Clean up vector store entries
    try:
        from app.database.vector_store import vector_store
        vector_store.delete_document_chunks(doc.id)
    except Exception:
        pass

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully."}
