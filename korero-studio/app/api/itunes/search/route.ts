import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies iTunes Search API. Browser fetch to itunes.apple.com fails (no CORS, bad redirects to musics://).
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const limitParam = request.nextUrl.searchParams.get("limit");
  const parsed = limitParam ? Number.parseInt(limitParam, 10) : 1;
  const limit = Number.isFinite(parsed) ? Math.min(25, Math.max(1, parsed)) : 1;

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] }, { status: 400 });
  }
  if (q.length > 240) {
    return NextResponse.json({ results: [] }, { status: 400 });
  }

  try {
    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("term", q);
    url.searchParams.set("media", "music");
    url.searchParams.set("entity", "song");
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "KoreroStudio/1.0 (+https://korero.studio)",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }

    const data = (await res.json()) as { results?: unknown[] };
    const results = Array.isArray(data.results) ? data.results : [];
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
