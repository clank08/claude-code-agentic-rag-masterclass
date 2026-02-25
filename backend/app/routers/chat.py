import json
from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse
from app.middleware.auth import get_current_user
from app.models.schemas import AuthenticatedUser, ChatRequest
from app.database.supabase_client import supabase
from app.services.openai_service import stream_chat_response

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat")
async def chat(
    request: ChatRequest, user: AuthenticatedUser = Depends(get_current_user)
):
    thread_id = request.thread_id
    previous_response_id = None

    if thread_id:
        # Look up existing thread
        result = (
            supabase.table("threads")
            .select("*")
            .eq("id", thread_id)
            .eq("user_id", user.id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Thread not found")
        previous_response_id = result.data[0].get("openai_response_id")
    else:
        # Auto-create thread with message preview as title
        title = request.message[:50] + ("..." if len(request.message) > 50 else "")
        result = (
            supabase.table("threads")
            .insert({"user_id": user.id, "title": title})
            .execute()
        )
        thread_id = result.data[0]["id"]

    # Save user message
    supabase.table("messages").insert({
        "thread_id": thread_id,
        "user_id": user.id,
        "role": "user",
        "content": request.message,
    }).execute()

    async def event_generator():
        # Send thread_id first so frontend knows which thread we're in
        yield {"event": "thread_id", "data": json.dumps({"thread_id": thread_id})}

        response_id = None
        full_content = ""
        async for event_type, data in stream_chat_response(
            message=request.message,
            previous_response_id=previous_response_id,
            user_id=user.id,
        ):
            if event_type == "text_delta":
                full_content += data
                yield {"event": "text_delta", "data": json.dumps({"token": data})}
            elif event_type == "done":
                response_id = data
                # Save assistant message
                supabase.table("messages").insert({
                    "thread_id": thread_id,
                    "user_id": user.id,
                    "role": "assistant",
                    "content": full_content,
                }).execute()
                # Update thread with latest response ID
                (
                    supabase.table("threads")
                    .update({"openai_response_id": response_id})
                    .eq("id", thread_id)
                    .eq("user_id", user.id)
                    .execute()
                )
                yield {
                    "event": "done",
                    "data": json.dumps(
                        {"response_id": response_id, "thread_id": thread_id}
                    ),
                }
            elif event_type == "error":
                yield {"event": "error", "data": json.dumps({"error": data})}

    return EventSourceResponse(
        event_generator(),
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
        },
    )
