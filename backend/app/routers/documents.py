import asyncio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.middleware.auth import get_current_user
from app.models.schemas import AuthenticatedUser, DocumentResponse
from app.database.supabase_client import supabase
from app.services.ingestion_service import process_document

router = APIRouter(prefix="/api/documents", tags=["documents"])

# Allowed MIME types (plain text for Module 2; PDF/DOCX/HTML added in Module 5)
ALLOWED_MIME_TYPES = {
    "text/plain",
    "text/markdown",
    "text/html",
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(get_current_user),
):
    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {', '.join(ALLOWED_MIME_TYPES)}",
        )

    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")

    # Create document record
    doc_result = (
        supabase.table("documents")
        .insert(
            {
                "user_id": user.id,
                "filename": file.filename,
                "storage_path": "",  # Will update after storage upload
                "mime_type": file.content_type,
                "file_size": len(content),
            }
        )
        .execute()
    )
    doc = doc_result.data[0]
    document_id = doc["id"]

    # Upload to Supabase Storage
    storage_path = f"{user.id}/{document_id}/{file.filename}"
    supabase.storage.from_("documents").upload(
        path=storage_path,
        file=content,
        file_options={"content-type": file.content_type},
    )

    # Update storage path
    supabase.table("documents").update({"storage_path": storage_path}).eq(
        "id", document_id
    ).execute()

    # Kick off background processing
    asyncio.create_task(process_document(document_id, user.id))

    # Return the document (re-fetch to get updated storage_path)
    result = (
        supabase.table("documents").select("*").eq("id", document_id).execute()
    )
    return result.data[0]


@router.get("", response_model=list[DocumentResponse])
async def list_documents(user: AuthenticatedUser = Depends(get_current_user)):
    result = (
        supabase.table("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.delete("/{document_id}")
async def delete_document(
    document_id: str, user: AuthenticatedUser = Depends(get_current_user)
):
    # Fetch document to get storage path
    doc_result = (
        supabase.table("documents")
        .select("*")
        .eq("id", document_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not doc_result.data:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = doc_result.data[0]

    # Delete from Supabase Storage
    try:
        supabase.storage.from_("documents").remove([doc["storage_path"]])
    except Exception:
        pass  # Storage deletion is best-effort

    # Delete document row (cascade deletes chunks)
    supabase.table("documents").delete().eq("id", document_id).eq(
        "user_id", user.id
    ).execute()

    return {"status": "deleted"}
