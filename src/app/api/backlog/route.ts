import { NextRequest, NextResponse } from "next/server";
import type { BacklogGame } from "@/lib/types";
import { isPersistenceEnabled, loadBacklogFromStore, saveBacklogToStore } from "@/lib/backlog-store";
import { isValidSyncId } from "@/lib/library-sync-id";

export async function GET(request: NextRequest) {
  const syncId =
    request.nextUrl.searchParams.get("syncId") ??
    request.headers.get("x-sync-id");

  if (!syncId || !isValidSyncId(syncId)) {
    return NextResponse.json({ error: "Valid syncId required" }, { status: 400 });
  }

  if (!isPersistenceEnabled()) {
    return NextResponse.json({ games: [], persisted: false, savedAt: null });
  }

  const snapshot = await loadBacklogFromStore(syncId);
  return NextResponse.json({
    games: snapshot?.games ?? [],
    savedAt: snapshot?.savedAt ?? null,
    persisted: true,
  });
}

async function handleSave(request: NextRequest, syncIdHeader: string | null) {
  let body: { games?: BacklogGame[]; syncId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const syncId = syncIdHeader ?? body.syncId ?? null;

  if (!syncId || !isValidSyncId(syncId)) {
    return NextResponse.json({ error: "Valid syncId required" }, { status: 400 });
  }

  if (!Array.isArray(body.games)) {
    return NextResponse.json({ error: "games array required" }, { status: 400 });
  }

  if (!isPersistenceEnabled()) {
    return NextResponse.json({ ok: true, persisted: false, savedAt: null });
  }

  const snapshot = await saveBacklogToStore(syncId, body.games);
  if (!snapshot) {
    return NextResponse.json({ error: "Failed to save backlog" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    persisted: true,
    savedAt: snapshot.savedAt,
  });
}

export async function PUT(request: NextRequest) {
  return handleSave(request, request.headers.get("x-sync-id"));
}

export async function POST(request: NextRequest) {
  return handleSave(request, request.headers.get("x-sync-id"));
}
