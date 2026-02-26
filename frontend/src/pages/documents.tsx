import { useDocuments } from "@/hooks/use-documents";
import { FileUploadZone } from "@/components/documents/file-upload-zone";
import { DocumentList } from "@/components/documents/document-list";

export function DocumentsPage() {
  const { documents, loading, uploadDocument, deleteDocument } = useDocuments();

  const handleUpload = async (file: File) => {
    await uploadDocument(file);
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-sm text-muted-foreground">
          Upload documents to search during chat conversations.
        </p>
      </div>
      <FileUploadZone onUpload={handleUpload} />
      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading documents...
        </div>
      ) : (
        <DocumentList documents={documents} onDelete={deleteDocument} />
      )}
    </div>
  );
}
