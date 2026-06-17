import { NextResponse } from "next/server";
import { isIgdbConfigured, verifyIgdbAuth } from "@/lib/igdb";

export async function GET() {
  if (!isIgdbConfigured()) {
    return NextResponse.json({
      configured: false,
      authenticated: false,
    });
  }

  const authenticated = await verifyIgdbAuth();

  return NextResponse.json({
    configured: true,
    authenticated,
  });
}
