import { NextRequest, NextResponse } from "next/server";
import { fetchIgnGuides } from "@/lib/ign-guides";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim();
  if (!name) {
    return NextResponse.json({ error: "Game name required" }, { status: 400 });
  }

  try {
    const result = await fetchIgnGuides(name);
    if (!result) {
      return NextResponse.json({ found: false, links: [] });
    }

    return NextResponse.json({
      found: true,
      slug: result.slug,
      wikiUrl: result.wikiUrl,
      links: result.links,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch IGN guides" }, { status: 500 });
  }
}
