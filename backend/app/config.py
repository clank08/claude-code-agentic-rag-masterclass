from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM Provider (any OpenAI-compatible endpoint)
    llm_api_key: str
    llm_base_url: str = "https://openrouter.ai/api/v1"
    llm_model: str = "anthropic/claude-sonnet-4"
    llm_system_prompt: str = "You are a helpful assistant. Use the search_documents tool to find relevant information from uploaded documents when the user asks about their documents."

    # Embedding
    embedding_api_key: str = ""
    embedding_base_url: str = "https://api.openai.com/v1"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536

    # Ingestion
    chunk_size: int = 1000
    chunk_overlap: int = 200

    # Retrieval
    retrieval_top_k: int = 5
    retrieval_score_threshold: float = 0.3

    # Supabase
    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""

    # Observability
    langsmith_api_key: str
    langsmith_project: str = "rag-masterclass"

    # App
    frontend_url: str = "http://localhost:5173"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
