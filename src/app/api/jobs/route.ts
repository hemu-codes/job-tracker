import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildJobsPrompt } from "@/lib/resume";
import { Role, JobsCache } from "@/types";

// In-memory cache (resets on cold start — for persistence use KV/Redis)
let cache: JobsCache | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function isCacheValid(): boolean {
  if (!cache) return false;
  return Date.now() - new Date(cache.fetchedAt).getTime() < CACHE_TTL_MS;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  if (!force && isCacheValid() && cache) {
    return NextResponse.json({ ...cache, cached: true });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system:
        "You are a job search assistant. Return ONLY valid JSON with no markdown, no backticks, no preamble. The response must be directly parseable by JSON.parse().",
      messages: [{ role: "user", content: buildJobsPrompt() }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    const roles: Role[] = (parsed.roles || []).map(
      (r: Omit<Role, "id" | "fetchedAt">, i: number) => ({
        ...r,
        id: `role-${Date.now()}-${i}`,
        fetchedAt: new Date().toISOString(),
      })
    );

    cache = { roles, fetchedAt: new Date().toISOString() };
    return NextResponse.json({ ...cache, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
