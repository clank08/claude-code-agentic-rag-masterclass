from app.config import settings
from app.database.supabase_client import supabase
from app.services.embedding_service import generate_embedding


async def search_documents(
    query: str,
    user_id: str,
    top_k: int | None = None,
    score_threshold: float | None = None,
) -> list[dict]:
    """Search user's document chunks by vector similarity.

    Args:
        query: The search query text.
        user_id: UUID of the user (for RLS-like filtering).
        top_k: Max results to return. Defaults to settings.retrieval_top_k.
        score_threshold: Min similarity score (0-1). Defaults to settings.retrieval_score_threshold.

    Returns:
        List of dicts with keys: content, score, metadata, document_id, chunk_index
    """
    top_k = top_k or settings.retrieval_top_k
    score_threshold = score_threshold or settings.retrieval_score_threshold

    # Generate embedding for the query
    query_embedding = await generate_embedding(query)

    # Use Supabase RPC for vector similarity search
    # This requires a Postgres function — we'll create it in the migration
    result = supabase.rpc(
        "match_chunks",
        {
            "query_embedding": query_embedding,
            "match_count": top_k,
            "filter_user_id": user_id,
            "min_similarity": score_threshold,
        },
    ).execute()

    return [
        {
            "content": row["content"],
            "score": row["similarity"],
            "metadata": row["metadata"],
            "document_id": row["document_id"],
            "chunk_index": row["chunk_index"],
        }
        for row in (result.data or [])
    ]
