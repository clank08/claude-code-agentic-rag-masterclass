import { useState, useRef, useCallback } from "react";
import { Upload } from "lucide-react";

interface FileUploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

export function FileUploadZone({ onUpload, disabled }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);
      try {
        await onUpload(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      } ${disabled || isUploading ? "pointer-events-none opacity-50" : ""}`}
    >
      <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {isUploading
          ? "Uploading..."
          : "Drag & drop a file here, or click to browse"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground/70">
        Supported: .txt, .md, .html (max 50MB)
      </p>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.html,.htm"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
