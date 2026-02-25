interface SSECallbacks {
  onToken: (token: string) => void;
  onDone: (data: { response_id: string; thread_id: string }) => void;
  onThreadId: (threadId: string) => void;
  onError: (error: string) => void;
}

export async function readSSEStream(response: Response, callbacks: SSECallbacks) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        const rawData = line.slice(6);
        try {
          const data = JSON.parse(rawData);
          switch (currentEvent) {
            case "text_delta":
              callbacks.onToken(data.token);
              break;
            case "done":
              callbacks.onDone(data);
              break;
            case "thread_id":
              callbacks.onThreadId(data.thread_id);
              break;
            case "error":
              callbacks.onError(data.error);
              break;
          }
        } catch {
          // skip unparseable lines
        }
        currentEvent = "";
      }
    }
  }
}
