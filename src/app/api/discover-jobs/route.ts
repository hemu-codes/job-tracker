import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RESUME_CONTEXT } from "@/lib/resume";
import { DiscoverCompany, DiscoverCache } from "@/types";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const CACHE_KEY = "discover:companies";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  if (!force) {
    try {
      const cached = await redis.get<DiscoverCache>(CACHE_KEY);
      if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS) {
        return NextResponse.json({ ...cached, cached: true });
      }
    } catch {}
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: { responseMimeType: "application/json" },
      systemInstruction: "You are a job search assistant specializing in H-1B sponsoring companies. Return ONLY valid JSON, no markdown, no backticks.",
    });

    const prompt = `You are helping a software engineer on H-1B visa find non-obvious job opportunities at companies they might not think to search for on LinkedIn or Indeed.

Candidate profile:
${RESUME_CONTEXT}

Generate a comprehensive list of real companies across ALL of these industries that:
1. Are known H-1B sponsors (established companies with consistent LCA filings)
2. Hire software engineers or SWE-adjacent roles (SRE, Platform, DevOps, Full Stack, Backend)
3. Are NON-TRADITIONAL tech employers — the candidate already knows about Amazon/Microsoft/Google
4. Have realistic career pages (real URLs only)
5. Would be a strong match for this candidate's background

Cover ALL these industries and return as many companies as possible (aim for 5-8 per industry):
- HealthTech, Biotech, FinTech, Aerospace, Logistics, Energy, Insurance, RetailTech, EdTech, Gaming, GovTech, LegalTech

For each company, suggest 2-4 specific role titles that match the candidate's background.

Return JSON:
{
  "companies": [
    {
      "id": "unique-slug",
      "name": "Company Name",
      "industry": "HealthTech",
      "whyFit": "2 sentences: why this company is a strong match for the candidate's specific skills",
      "whyH1b": "1 sentence: why this company is known to sponsor H-1B",
      "careersUrl": "https://real-careers-url.com",
      "score": 85,
      "roles": [
        {
          "id": "unique-role-slug",
          "title": "Specific Role Title",
          "company": "Company Name",
          "industry": "HealthTech",
          "score": 85,
          "tags": ["Java", "AWS", "React"],
          "reason": "1 sentence: why this specific role fits",
          "careersUrl": "https://real-careers-url.com"
        }
      ]
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    const companies: DiscoverCompany[] = (parsed.companies || []).map((c: DiscoverCompany) => ({
      ...c,
      fetchedAt: new Date().toISOString(),
      roles: (c.roles || []).map(r => ({ ...r, fetchedAt: new Date().toISOString() })),
    }));

    companies.sort((a, b) => b.score - a.score);
    const payload: DiscoverCache = { companies, fetchedAt: new Date().toISOString() };

    // Save to Redis with 25hr TTL
    await redis.set(CACHE_KEY, payload, { ex: 90000 });

    return NextResponse.json({ ...payload, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Discover API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
