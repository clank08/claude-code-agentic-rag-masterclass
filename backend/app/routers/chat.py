import json
from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse
from app.middleware.auth import get_current_user
from app.models.schemas import AuthenticatedUser, ChatRequest
from app.database.supabase_client import supabase
from app.services.llm_service import stream_chat_response
from app.config import settings

router = APIRouter(prefix="/api", tags=["chat"])


def _build_messages(system_prompt: str, history: list[dict]) -> list[dict]:
    """Build Chat Completions messages array from system prompt + history."""
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    return messages


@router.post("/chat")
async def chat(
    request: ChatRequest, user: AuthenticatedUser = Depends(get_current_user)
):
    thread_id = request.thread_id

    if thread_id:
        # Verify thread belongs to user
        result = (
            supabase.table("threads")
            .select("id")
            .eq("id", thread_id)
            .eq("user_id", user.id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Thread not found")
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
    supabase.table("messages").insert(
        {
            "thread_id": thread_id,
            "user_id": user.id,
            "role": "user",
            "content": request.message,
        }
    ).execute()

    # Load full conversation history for this thread
    history_result = (
        supabase.table("messages")
        .select("role, content")
        .eq("thread_id", thread_id)
        .eq("user_id", user.id)
        .order("created_at")
        .execute()
    )
    messages = _build_messages(settings.llm_system_prompt, history_result.data)

    async def event_generator():
        yield {"event": "thread_id", "data": json.dumps({"thread_id": thread_id})}

        full_content = ""
        current_messages = list(messages)  # Copy for tool call loop

        # Tool call loop — LLM may call tools, we execute and re-invoke
        max_tool_rounds = 5
        for _ in range(max_tool_rounds):
            tool_calls_received = []
            round_content = ""

            async for event_type, data in stream_chat_response(
                messages=current_messages,
                user_id=user.id,
            ):
                if event_type == "text_delta":
                    round_content += data
                    full_content += data
                    yield {
                        "event": "text_delta",
                        "data": json.dumps({"token": data}),
                    }
                elif event_type == "tool_call":
                    tool_calls_received.append(data)
                elif event_type == "done":
                    # Save assistant message
                    supabase.table("messages").insert(
                        {
                            "thread_id": thread_id,
                            "user_id": user.id,
                            "role": "assistant",
                            "content": full_content,
                        }
                    ).execute()
                    # Update thread updated_at
                    supabase.table("threads").update(
                        {"title": supabase.table("threads").select("title").eq("id", thread_id).execute().data[0]["title"]}
                    ).eq("id", thread_id).eq("user_id", user.id).execute()
                    yield {
                        "event": "done",
                        "data": json.dumps({"thread_id": thread_id}),
                    }
                    return
                elif event_type == "error":
                    yield {
                        "event": "error",
                        "data": json.dumps({"error": data}),
                    }
                    return

            # If we got tool calls, execute them and loop
            if tool_calls_received:
                # Append assistant message with tool calls to context
                current_messages.append(
                    {
                        "role": "assistant",
                        "content": round_content or None,
                        "tool_calls": [
                            {
                                "id": tc["id"],
                                "type": "function",
                                "function": {
                                    "name": tc["name"],
                                    "arguments": tc["arguments"],
                                },
                            }
                            for tc in tool_calls_received
                        ],
                    }
                )

                # Execute each tool call
                for tc in tool_calls_received:
                    tool_result = await _execute_tool_call(
                        tc["name"], tc["arguments"], user.id
                    )
                    current_messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tc["id"],
                            "content": tool_result,
                        }
                    )
                # Continue loop — send tool results back to LLM
            else:
                # No tool calls and no done event — shouldn't happen, but bail
                break

    return EventSourceResponse(
        event_generator(),
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
        },
    )


async def _execute_tool_call(name: str, arguments: str, user_id: str) -> str:
    """Execute a tool call and return the result as a string."""
    try:
        args = json.loads(arguments)
    except json.JSONDecodeError:
        return json.dumps({"error": "Invalid tool arguments"})

    if name == "search_documents":
        # Import here to avoid circular imports (retrieval_service depends on embedding_service)
        from app.services.retrieval_service import search_documents

        query = args.get("query", "")
        results = await search_documents(query=query, user_id=user_id)
        if not results:
            return json.dumps({"results": [], "message": "No relevant documents found."})
        return json.dumps({"results": results})
    else:
        return json.dumps({"error": f"Unknown tool: {name}"})
