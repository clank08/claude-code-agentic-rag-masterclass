import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import type { Thread } from "@/types";

export function useThreads() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchThreads = useCallback(async () => {
    try {
      const data = await apiGet<Thread[]>("/api/threads");
      setThreads(data);
    } catch (error) {
      console.error("Failed to fetch threads:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const createThread = async () => {
    const thread = await apiPost<Thread>("/api/threads");
    setThreads((prev) => [thread, ...prev]);
    return thread;
  };

  const deleteThread = async (threadId: string) => {
    await apiDelete(`/api/threads/${threadId}`);
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
  };

  return { threads, loading, createThread, deleteThread, refetchThreads: fetchThreads };
}
