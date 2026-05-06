import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildJobsPrompt } from "@/lib/resume";
import { Role, JobsCache } from "@/types";

let cache: JobsCache | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-001",
      generationConfig: { responseMimeType: "application/json" },
      systemInstruction: "You are a job search assistant. Return ONLY valid JSON with no markdown, no backticks, no preamble. The response must be directly parseable by JSON.parse().",
    });

    const result = await model.generateContent(buildJobsPrompt());
    const text = result.response.text();
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
    const stack = err instanceof Error ? err.stack : "";
    console.error("Jobs API error:", message, stack);
    return NextResponse.json({ error: message, detail: stack }, { status: 500 });
  }
}
