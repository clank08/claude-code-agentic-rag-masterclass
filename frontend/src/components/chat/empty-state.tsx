import { MessageSquare } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
      <MessageSquare className="h-12 w-12" />
      <div className="text-center">
        <h2 className="text-lg font-semibold">Start a Conversation</h2>
        <p className="text-sm">Type a message below to begin chatting with the AI assistant.</p>
      </div>
    </div>
  );
}
