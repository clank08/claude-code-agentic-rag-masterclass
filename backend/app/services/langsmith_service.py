from langsmith.wrappers import wrap_openai


def get_wrapped_openai_client(client):
    """Wrap an OpenAI client with LangSmith tracing."""
    return wrap_openai(client)
