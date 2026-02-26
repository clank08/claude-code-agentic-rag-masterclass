import json
from openai import AsyncOpenAI
from langsmith.wrappers import wrap_openai
from app.config import settings

client = wrap_openai(
    AsyncOpenAI(
        base_url=settings.llm_base_url,
        api_key=settings.llm_api_key,
    )
)

# Tool definitions for retrieval
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_documents",
            "description": "Search the user's uploaded documents for relevant information. Use this when the user asks questions that might be answered by their documents.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to find relevant document chunks",
                    }
                },
                "required": ["query"],
            },
        },
    }
]


async def stream_chat_response(messages: list[dict], user_id: str | None = None):
    """Stream a chat completion response.

    Args:
        messages: Full conversation history as Chat Completions messages array.
                  Must include system prompt as first message.
        user_id: For LangSmith trace metadata.

    Yields tuples of (event_type, data):
        - ("text_delta", token_text) — streamed text token
        - ("tool_call", {"id": str, "name": str, "arguments": str}) — tool invocation
        - ("done", None) — stream complete
        - ("error", error_message) — error occurred
    """
    try:
        stream = await client.chat.completions.create(
            model=settings.llm_model,
            messages=messages,
            tools=TOOLS,
            stream=True,
        )

        # Accumulators for tool calls (streamed in chunks)
        tool_calls: dict[int, dict] = {}

        async for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if not delta:
                continue

            finish_reason = chunk.choices[0].finish_reason

            # Text content
            if delta.content:
                yield ("text_delta", delta.content)

            # Tool call chunks
            if delta.tool_calls:
                for tc in delta.tool_calls:
                    idx = tc.index
                    if idx not in tool_calls:
                        tool_calls[idx] = {
                            "id": tc.id or "",
                            "name": tc.function.name or "" if tc.function else "",
                            "arguments": "",
                        }
                    if tc.id:
                        tool_calls[idx]["id"] = tc.id
                    if tc.function:
                        if tc.function.name:
                            tool_calls[idx]["name"] = tc.function.name
                        if tc.function.arguments:
                            tool_calls[idx]["arguments"] += tc.function.arguments

            # Stream finished
            if finish_reason == "tool_calls":
                for idx in sorted(tool_calls.keys()):
                    yield ("tool_call", tool_calls[idx])
                return  # Caller must handle tool execution and re-invoke
            elif finish_reason == "stop":
                yield ("done", None)
                return

        # If we exit the loop without a finish_reason
        yield ("done", None)

    except Exception as e:
        yield ("error", str(e))
