import os
from app.config import settings

# Set LangSmith env vars before other imports
os.environ["LANGSMITH_TRACING"] = "true"
os.environ["LANGSMITH_API_KEY"] = settings.langsmith_api_key
os.environ["LANGSMITH_PROJECT"] = settings.langsmith_project

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from openai import OpenAIError
from app.routers import chat, threads

app = FastAPI(title="RAG Masterclass API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(threads.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.exception_handler(OpenAIError)
async def openai_exception_handler(request: Request, exc: OpenAIError):
    return JSONResponse(
        status_code=502,
        content={"detail": f"LLM provider error: {str(exc)}"},
    )
