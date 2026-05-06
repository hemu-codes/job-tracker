import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Vercel cron sends Authorization header with CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Call our own jobs endpoint with force refresh
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/jobs?force=true`, {
      headers: { "x-internal": "cron" },
    });

    if (!response.ok) {
      throw new Error(`Jobs API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      rolesRefreshed: data.roles?.length ?? 0,
      refreshedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
