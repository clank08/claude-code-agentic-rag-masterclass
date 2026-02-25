from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.models.schemas import AuthenticatedUser, ThreadResponse
from app.database.supabase_client import supabase

router = APIRouter(prefix="/api/threads", tags=["threads"])


@router.get("", response_model=list[ThreadResponse])
async def list_threads(user: AuthenticatedUser = Depends(get_current_user)):
    result = (
        supabase.table("threads")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", desc=True)
        .execute()
    )
    return result.data


@router.post("", response_model=ThreadResponse)
async def create_thread(user: AuthenticatedUser = Depends(get_current_user)):
    result = (
        supabase.table("threads")
        .insert({"user_id": user.id, "title": "New Chat"})
        .execute()
    )
    return result.data[0]


@router.delete("/{thread_id}")
async def delete_thread(
    thread_id: str, user: AuthenticatedUser = Depends(get_current_user)
):
    result = (
        supabase.table("threads")
        .delete()
        .eq("id", thread_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Thread not found")
    return {"status": "deleted"}
