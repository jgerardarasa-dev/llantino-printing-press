import { NextResponse, type NextRequest } from "next/server";

import { sendDailyDigestToAllUsers } from "@/lib/notifications/digest";

/**
 * SPEC §10: "notifications (in-app + email digest)". Not a real cron —
 * this environment has no scheduler wired up. A real deployment points
 * an external scheduler (Vercel Cron, a GitHub Action, cron-job.org,
 * etc.) at this route with the shared secret below; nothing here runs
 * on its own. Protected by CRON_SECRET rather than a signed-in session,
 * since a scheduler has no user to sign in as.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET isn't configured — the digest endpoint is disabled." }, { status: 503 });
  }

  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tally = await sendDailyDigestToAllUsers();
  return NextResponse.json({ ok: true, tally });
}
