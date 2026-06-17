"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Cloud, Copy, Link2, X } from "lucide-react";
import {
  adoptLibraryFromInput,
  buildLibraryUrl,
  getOrCreateSyncId,
} from "@/lib/sync-id";
import { pullAndMergeRemote } from "@/lib/backlog-sync";

export function LibrarySync({ compact = false }: { compact?: boolean }) {
  const [syncId, setSyncId] = useState("");
  const [synced, setSynced] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState(false);
  const [open, setOpen] = useState(false);

  const refreshStatus = useCallback(async () => {
    const result = await pullAndMergeRemote();
    setSynced(result.persisted);
  }, []);

  useEffect(() => {
    setSyncId(getOrCreateSyncId());
    void refreshStatus();

    const onSyncIdChanged = () => {
      setSyncId(getOrCreateSyncId());
      void refreshStatus();
    };

    window.addEventListener("mysteam-sync-id-changed", onSyncIdChanged);
    return () => window.removeEventListener("mysteam-sync-id-changed", onSyncIdChanged);
  }, [refreshStatus]);

  const copyLink = async () => {
    const url = buildLibraryUrl(syncId);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link to sync your other devices:", url);
    }
  };

  const linkDevice = async () => {
    const ok = adoptLibraryFromInput(linkInput);
    if (!ok) {
      setLinkError(true);
      return;
    }

    setLinkError(false);
    setLinkInput("");
    setSyncId(getOrCreateSyncId());
    await refreshStatus();
    setOpen(false);
  };

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-steam-muted transition-colors hover:bg-white/[0.05] hover:text-steam-text"
          aria-label="Sync devices"
        >
          <Cloud className="h-4 w-4" />
          <span
            className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${synced ? "bg-[#5ba32b]" : "bg-steam-muted/40"}`}
          />
        </button>

        {open && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
            <div className="w-full max-w-sm rounded-2xl border border-steam-border bg-steam-dark p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-steam-text">Sync devices</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1 text-steam-muted hover:bg-white/[0.05] hover:text-steam-text"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SyncPanel
                copied={copied}
                copyLink={copyLink}
                linkDevice={linkDevice}
                linkError={linkError}
                linkInput={linkInput}
                setLinkError={setLinkError}
                setLinkInput={setLinkInput}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 text-left text-xs font-medium text-steam-muted transition-colors hover:text-steam-text"
      >
        <Cloud className="h-3.5 w-3.5 shrink-0" />
        <span>Sync devices</span>
        <span
          className={`ml-auto h-1.5 w-1.5 rounded-full ${synced ? "bg-[#5ba32b]" : "bg-steam-muted/40"}`}
          title={synced ? "Cloud sync active" : "Local only"}
        />
      </button>

      {open && (
        <div className="rounded-xl border border-steam-border bg-steam-panel/40 p-3">
          <SyncPanel
            copied={copied}
            copyLink={copyLink}
            linkDevice={linkDevice}
            linkError={linkError}
            linkInput={linkInput}
            setLinkError={setLinkError}
            setLinkInput={setLinkInput}
          />
        </div>
      )}
    </div>
  );
}

function SyncPanel({
  copied,
  copyLink,
  linkDevice,
  linkError,
  linkInput,
  setLinkError,
  setLinkInput,
}: {
  copied: boolean;
  copyLink: () => void;
  linkDevice: () => void;
  linkError: boolean;
  linkInput: string;
  setLinkError: (value: boolean) => void;
  setLinkInput: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-steam-muted">
        Your library syncs automatically across devices every few seconds. If
        you use a separate browser profile or home-screen app, paste your sync
        link here to link it.
      </p>

      <button
        type="button"
        onClick={copyLink}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-steam-border bg-steam-dark px-3 py-2 text-xs font-medium text-steam-text transition-colors hover:border-steam-accent/40 hover:text-steam-accent"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Link copied" : "Copy sync link"}
      </button>

      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-steam-muted">
          <Link2 className="h-3 w-3" />
          Link this device
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={linkInput}
            onChange={(e) => {
              setLinkInput(e.target.value);
              setLinkError(false);
            }}
            placeholder="Paste sync link"
            className="min-w-0 flex-1 rounded-lg border border-steam-border bg-steam-dark px-2.5 py-2 text-xs text-steam-text outline-none placeholder:text-steam-muted/50 focus:border-steam-accent/50"
          />
          <button
            type="button"
            onClick={linkDevice}
            className="shrink-0 rounded-lg bg-steam-accent/15 px-3 py-2 text-xs font-semibold text-steam-accent transition-colors hover:bg-steam-accent/25"
          >
            Link
          </button>
        </div>
        {linkError && (
          <p className="text-[11px] text-red-400">Paste a valid sync link or library ID.</p>
        )}
      </div>
    </div>
  );
}
