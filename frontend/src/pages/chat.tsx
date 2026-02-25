import { useParams, useNavigate } from "react-router-dom";
import { useChat } from "@/hooks/use-chat";
import { useThreadsContext } from "@/contexts/threads-context";
import { MessageList } from "@/components/chat/message-list";
import { MessageComposer } from "@/components/chat/message-composer";
import { EmptyState } from "@/components/chat/empty-state";

export function ChatPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { messages, streamingContent, isStreaming, sendMessage } = useChat(threadId);
  const { refetchThreads } = useThreadsContext();

  const handleSendMessage = async (content: string) => {
    const newThreadId = await sendMessage(content);
    // If a new thread was created, navigate to it and refresh sidebar
    if (newThreadId && !threadId) {
      await refetchThreads();
      navigate(`/thread/${newThreadId}`, { replace: true });
    }
  };

  if (!threadId && messages.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <EmptyState />
        <MessageComposer onSend={handleSendMessage} disabled={isStreaming} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <MessageList messages={messages} streamingContent={streamingContent} />
      <MessageComposer onSend={handleSendMessage} disabled={isStreaming} />
    </div>
  );
}
