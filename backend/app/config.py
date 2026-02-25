from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str
    openai_model: str = "gpt-4.1"
    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""
    langsmith_api_key: str
    langsmith_project: str = "rag-masterclass"
    frontend_url: str = "http://localhost:5173"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
