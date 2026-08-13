import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { searchGlobal } from "@/lib/data/search";

/** SPEC §10: global search (⌘K) — GET /search?q=... used by the command palette. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = new URL(request.url).searchParams.get("q") ?? "";
  const results = await searchGlobal(user, q);
  return NextResponse.json({ results });
}
