from openai import AsyncOpenAI
from app.config import settings

# Separate client for embeddings (can point to a different provider than LLM)
_client = AsyncOpenAI(
    base_url=settings.embedding_base_url,
    api_key=settings.embedding_api_key,
)


async def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of texts.

    Args:
        texts: List of text strings to embed. Max recommended batch size ~100.

    Returns:
        List of embedding vectors, one per input text.
    """
    if not texts:
        return []

    response = await _client.embeddings.create(
        model=settings.embedding_model,
        input=texts,
        dimensions=settings.embedding_dimensions,
    )

    # Sort by index to preserve input order
    sorted_data = sorted(response.data, key=lambda x: x.index)
    return [item.embedding for item in sorted_data]


async def generate_embedding(text: str) -> list[float]:
    """Generate a single embedding vector for a text string."""
    embeddings = await generate_embeddings([text])
    return embeddings[0]
