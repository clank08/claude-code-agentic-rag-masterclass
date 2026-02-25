from openai import AsyncOpenAI
from langsmith.wrappers import wrap_openai
from app.config import settings

client = wrap_openai(AsyncOpenAI(api_key=settings.openai_api_key))


async def stream_chat_response(
    message: str,
    previous_response_id: str | None = None,
    user_id: str | None = None,
):
    """Stream chat response using OpenAI Responses API.

    Yields tuples of (event_type, data):
    - ("text_delta", token_text)
    - ("done", response_id)
    - ("error", error_message)

    LangSmith tracing is handled automatically by wrap_openai.
    """
    try:
        stream = await client.responses.create(
            model=settings.openai_model,
            input=message,
            stream=True,
            previous_response_id=previous_response_id,
            tools=[{
                "type": "file_search",
                "vector_store_ids": [settings.openai_vector_store_id],
            }],
        )

        async for event in stream:
            if event.type == "response.output_text.delta":
                yield ("text_delta", event.delta)
            elif event.type == "response.completed":
                yield ("done", event.response.id)
    except Exception as e:
        yield ("error", str(e))
