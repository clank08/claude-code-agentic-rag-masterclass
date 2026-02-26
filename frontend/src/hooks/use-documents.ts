import { useState, useEffect, useCallback } from "react";
import { apiGet, apiDelete, apiUpload } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Document } from "@/types";

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      const docs = await apiGet<Document[]>("/api/documents");
      setDocuments(docs);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Supabase Realtime subscription for status updates
  useEffect(() => {
    const channel = supabase
      .channel("documents-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "documents" },
        (payload) => {
          setDocuments((prev) =>
            prev.map((doc) =>
              doc.id === payload.new.id ? { ...doc, ...payload.new } as Document : doc
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const uploadDocument = useCallback(async (file: File) => {
    const doc = await apiUpload<Document>("/api/documents", file);
    setDocuments((prev) => [doc, ...prev]);
    return doc;
  }, []);

  const deleteDocument = useCallback(async (documentId: string) => {
    await apiDelete(`/api/documents/${documentId}`);
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
  }, []);

  return { documents, loading, uploadDocument, deleteDocument, refetchDocuments: fetchDocuments };
}
