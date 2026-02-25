interface StreamingMessageProps {
  content: string;
}

export function StreamingMessage({ content }: StreamingMessageProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg bg-muted px-4 py-2 text-muted-foreground">
        <p className="whitespace-pre-wrap">
          {content}
          <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-current" />
        </p>
      </div>
    </div>
  );
}
