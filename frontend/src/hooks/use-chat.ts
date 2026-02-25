import { useState, useCallback, useEffect } from "react";
import { apiGet, apiStream } from "@/lib/api";
import { readSSEStream } from "@/lib/sse";
import type { Message } from "@/types";

export function useChat(threadId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  // Load messages when thread changes
  useEffect(() => {
    setMessages([]);
    setStreamingContent("");
    if (threadId) {
      apiGet<Message[]>(`/api/threads/${threadId}/messages`).then(setMessages).catch(console.error);
    }
  }, [threadId]);

  const sendMessage = useCallback(
    async (content: string): Promise<string | undefined> => {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setStreamingContent("");

      let newThreadId: string | undefined;
      let fullContent = "";

      try {
        const response = await apiStream("/api/chat", {
          message: content,
          thread_id: threadId,
        });

        await readSSEStream(response, {
          onToken: (token) => {
            fullContent += token;
            setStreamingContent((prev) => prev + token);
          },
          onDone: () => {
            const assistantMessage: Message = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: fullContent,
              created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setStreamingContent("");
          },
          onThreadId: (id) => {
            newThreadId = id;
          },
          onError: (error) => {
            console.error("Stream error:", error);
          },
        });
      } catch (error) {
        console.error("Chat error:", error);
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
      }

      return newThreadId;
    },
    [threadId]
  );

  return { messages, streamingContent, isStreaming, sendMessage, setMessages };
}
