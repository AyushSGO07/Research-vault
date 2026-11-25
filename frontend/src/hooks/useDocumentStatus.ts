"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { documentsApi, DocumentStatusResponse } from "@/lib/api";

export interface UseDocumentStatusReturn {
  data: DocumentStatusResponse | null;
  isPolling: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDocumentStatus(
  documentId: number | null,
  initialData?: DocumentStatusResponse | null
): UseDocumentStatusReturn {
  const [data, setData] = useState<DocumentStatusResponse | null>(initialData || null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveFailuresRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  // Sync initialData if provided and data is not yet set
  useEffect(() => {
    if (initialData && (!data || data.id !== initialData.id)) {
      setData(initialData);
    }
  }, [initialData, data]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!documentId) return;

    try {
      const response = await documentsApi.getStatus(documentId);
      if (!isMountedRef.current) return;

      setData(response);
      setError(null);
      consecutiveFailuresRef.current = 0;

      // Check for terminal state
      if (response.status === "indexed" || response.status === "failed") {
        setIsPolling(false);
        clearTimer();
      } else {
        // Continue polling every 1.5 seconds
        timerRef.current = setTimeout(fetchStatus, 1500);
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;

      consecutiveFailuresRef.current += 1;
      const message = err instanceof Error ? err.message : "Failed to fetch document status";

      if (consecutiveFailuresRef.current >= 3) {
        setIsPolling(false);
        setError("Connection lost. Click retry to refresh status.");
        clearTimer();
      } else {
        // Transient error retry after 2.5 seconds
        timerRef.current = setTimeout(fetchStatus, 2500);
      }
    }
  }, [documentId, clearTimer]);

  const refetch = useCallback(() => {
    if (!documentId) return;
    clearTimer();
    setError(null);
    consecutiveFailuresRef.current = 0;
    setIsPolling(true);
    fetchStatus();
  }, [documentId, clearTimer, fetchStatus]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!documentId) {
      setData(null);
      setIsPolling(false);
      setError(null);
      clearTimer();
      return;
    }

    // If current data is already in a terminal state, don't initiate polling
    if (data && data.id === documentId && (data.status === "indexed" || data.status === "failed")) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    fetchStatus();

    return () => {
      isMountedRef.current = false;
      clearTimer();
    };
  }, [documentId, clearTimer, fetchStatus]);

  return {
    data,
    isPolling,
    error,
    refetch,
  };
}
