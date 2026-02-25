import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "@/components/chat/message-bubble";
import { StreamingMessage } from "@/components/chat/streaming-message";
import type { Message } from "@/types";

interface MessageListProps {
  messages: Message[];
  streamingContent: string;
}

export function MessageList({ messages, streamingContent }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {streamingContent && <StreamingMessage content={streamingContent} />}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
