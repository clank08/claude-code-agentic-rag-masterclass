import { Trash2, FileText, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Document } from "@/types";

interface DocumentListProps {
  documents: Document[];
  onDelete: (id: string) => Promise<void>;
}

function StatusBadge({ status }: { status: Document["status"] }) {
  switch (status) {
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
          <Loader2 className="h-3 w-3 animate-spin" />
          Pending
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
          <XCircle className="h-3 w-3" />
          Failed
        </span>
      );
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ documents, onDelete }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No documents uploaded yet. Upload a file above to get started.
      </div>
    );
  }

  return (
    <div className="divide-y rounded-lg border">
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center gap-3 p-3">
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{doc.filename}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatFileSize(doc.file_size)}</span>
              {doc.status === "completed" && (
                <span>{doc.chunk_count} chunks</span>
              )}
              {doc.status === "failed" && doc.error_message && (
                <span className="text-destructive" title={doc.error_message}>
                  {doc.error_message.slice(0, 50)}
                </span>
              )}
            </div>
          </div>
          <StatusBadge status={doc.status} />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onDelete(doc.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
