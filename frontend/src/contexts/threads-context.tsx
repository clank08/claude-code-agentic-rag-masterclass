import { createContext, useContext, type ReactNode } from "react";
import { useThreads } from "@/hooks/use-threads";
import type { Thread } from "@/types";

interface ThreadsContextType {
  threads: Thread[];
  loading: boolean;
  createThread: () => Promise<Thread>;
  deleteThread: (threadId: string) => Promise<void>;
  refetchThreads: () => Promise<void>;
}

const ThreadsContext = createContext<ThreadsContextType | undefined>(undefined);

export function ThreadsProvider({ children }: { children: ReactNode }) {
  const value = useThreads();
  return (
    <ThreadsContext.Provider value={value}>
      {children}
    </ThreadsContext.Provider>
  );
}

export function useThreadsContext() {
  const context = useContext(ThreadsContext);
  if (!context) throw new Error("useThreadsContext must be used within ThreadsProvider");
  return context;
}
