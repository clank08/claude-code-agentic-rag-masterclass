from app.config import settings
from app.database.supabase_client import supabase
from app.services.embedding_service import generate_embeddings


def chunk_text(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    """Split text into overlapping chunks.

    Args:
        text: The full text to chunk.
        chunk_size: Max characters per chunk.
        chunk_overlap: Number of characters to overlap between chunks.

    Returns:
        List of text chunks.
    """
    if not text.strip():
        return []

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - chunk_overlap

    return chunks


async def process_document(document_id: str, user_id: str):
    """Process a document: download, chunk, embed, store.

    This is the main ingestion pipeline. Call via asyncio.create_task().
    Updates the document status in the database as it progresses.

    Args:
        document_id: UUID of the document row.
        user_id: UUID of the owning user.
    """
    try:
        # Update status to processing
        supabase.table("documents").update({"status": "processing"}).eq(
            "id", document_id
        ).execute()

        # Fetch document metadata
        doc_result = (
            supabase.table("documents")
            .select("*")
            .eq("id", document_id)
            .execute()
        )
        if not doc_result.data:
            raise ValueError(f"Document {document_id} not found")
        doc = doc_result.data[0]

        # Download file from Supabase Storage
        file_bytes = supabase.storage.from_("documents").download(doc["storage_path"])
        text = file_bytes.decode("utf-8")

        # Chunk the text
        chunks = chunk_text(
            text,
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )

        if not chunks:
            supabase.table("documents").update(
                {"status": "completed", "chunk_count": 0}
            ).eq("id", document_id).execute()
            return

        # Generate embeddings in batches
        batch_size = 100
        all_embeddings = []
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i : i + batch_size]
            embeddings = await generate_embeddings(batch)
            all_embeddings.extend(embeddings)

        # Insert chunks with embeddings
        chunk_rows = [
            {
                "document_id": document_id,
                "user_id": user_id,
                "content": chunk,
                "chunk_index": idx,
                "embedding": embedding,
                "metadata": {"filename": doc["filename"]},
            }
            for idx, (chunk, embedding) in enumerate(zip(chunks, all_embeddings))
        ]

        # Insert in batches (Supabase has row limits per request)
        insert_batch_size = 500
        for i in range(0, len(chunk_rows), insert_batch_size):
            batch = chunk_rows[i : i + insert_batch_size]
            supabase.table("chunks").insert(batch).execute()

        # Update document status
        supabase.table("documents").update(
            {"status": "completed", "chunk_count": len(chunks)}
        ).eq("id", document_id).execute()

    except Exception as e:
        # Mark document as failed
        supabase.table("documents").update(
            {"status": "failed", "error_message": str(e)[:500]}
        ).eq("id", document_id).execute()
