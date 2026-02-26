from fastapi import APIRouter, Depends
from app.middleware.auth import get_current_user
from app.models.schemas import (
    AuthenticatedUser,
    UserSettingsRequest,
    UserSettingsResponse,
    SettingsDefaultsResponse,
)
from app.database.supabase_client import supabase
from app.config import settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=UserSettingsResponse)
async def get_settings(user: AuthenticatedUser = Depends(get_current_user)):
    result = (
        supabase.table("user_settings")
        .select("llm_base_url, llm_model")
        .eq("user_id", user.id)
        .execute()
    )
    if not result.data:
        return UserSettingsResponse()
    return result.data[0]


@router.put("", response_model=UserSettingsResponse)
async def update_settings(
    request: UserSettingsRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    # Upsert: insert or update on conflict
    result = (
        supabase.table("user_settings")
        .upsert(
            {
                "user_id": user.id,
                "llm_base_url": request.llm_base_url,
                "llm_model": request.llm_model,
            },
            on_conflict="user_id",
        )
        .execute()
    )
    return result.data[0]


@router.get("/defaults", response_model=SettingsDefaultsResponse)
async def get_defaults(user: AuthenticatedUser = Depends(get_current_user)):
    return SettingsDefaultsResponse(
        llm_base_url=settings.llm_base_url,
        llm_model=settings.llm_model,
    )
