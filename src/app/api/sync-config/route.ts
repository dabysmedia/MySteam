import { NextResponse } from "next/server";
import { getSharedLibrarySyncId } from "@/lib/library-sync-id";

export async function GET() {
  return NextResponse.json({
    syncId: getSharedLibrarySyncId(),
  });
}
