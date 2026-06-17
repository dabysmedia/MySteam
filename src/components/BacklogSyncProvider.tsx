"use client";

import { useEffect } from "react";
import { initSyncId } from "@/lib/sync-id";
import { startRemotePolling } from "@/lib/backlog-sync";

export function BacklogSyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let stopPolling: (() => void) | undefined;

    void initSyncId().then(() => {
      stopPolling = startRemotePolling();
    });

    return () => {
      stopPolling?.();
    };
  }, []);

  return children;
}
