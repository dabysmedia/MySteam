"use client";

import { useEffect } from "react";
import { adoptSyncIdFromUrl } from "@/lib/sync-id";
import { startRemotePolling } from "@/lib/backlog-sync";

export function BacklogSyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    adoptSyncIdFromUrl();
    return startRemotePolling();
  }, []);

  return children;
}
