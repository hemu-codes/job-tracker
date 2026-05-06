import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RESUME_CONTEXT } from "@/lib/resume";
import { Role, JobsCache } from "@/types";
import { isLikelyH1bSponsor } from "@/lib/h1b-sponsors";

let cache: JobsCache | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function isCacheValid(): boolean {
  if (!cache) return false;
  return Date.now() - new Date(cache.fetchedAt).getTime() < CACHE_TTL_MS;
}

const SEARCH_QUERIES = [
  { keywords: "software engineer healthtech", industry: "HealthTech" },
  { keywords: "software engineer fintech banking", industry: "FinTech" },
  { keywords: "software engineer aerospace defense", industry: "Aerospace" },
  { keywords: "software engineer logistics supply chain", industry: "Logistics" },
  { keywords: "software engineer biotech life sciences", industry: "Biotech" },
  { keywords: "software engineer insurance", industry: "Insurance" },
  { keywords: "platform engineer SRE devops", industry: "Traditional Tech" },
  { keywords: "software engineer retail ecommerce", industry: "RetailTech" },
];

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  redirect_url: string;
  description: string;
  industry: string;
}

async function fetchAdzunaJobs(query: { keywords: string; industry: string }) {
  const appId = process.env.ADZUNA_APP_ID;
  const apiKey = process.env.ADZUNA_API_KEY;
  const url = new URL("https://api.adzuna.com/v1/api/jobs/us/search/1");
  url.searchParams.set("app_id", appId!);
  url.searchParams.set("app_key", apiKey!);
  url.searchParams.set("what", query.keywords);
  url.searchParams.set("where", "Seattle");
  url.searchParams.set("distance", "50");
  url.searchParams.set("results_per_page", "10");
  url.searchParams.set("sort_by", "date");
  url.searchParams.set("content-type", "application/json");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Adzuna error: " + res.status);
  const data = await res.json();
  return (data.results || []).map((job: AdzunaJob) => ({ ...job, industry: query.industry }));
}

async function scoreJobsWithGemini(jobs: AdzunaJob[]) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");
  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: { responseMimeType: "application/json" },
    systemInstruction: "You are a job matching assistant. Return ONLY valid JSON, no markdown, no backticks.",
  });
  const jobSummaries = jobs.map((j, i) => ({
    index: i,
    title: j.title,
    company: j.company?.display_name,
    description: j.description?.slice(0, 300),
    industry: j.industry,
  }));
  const prompt = "Given this candidate resume, score each job 60-95 based on match quality.\n\nResume:\n" + RESUME_CONTEXT + "\n\nJobs:\n" + JSON.stringify(jobSummaries) + '\n\nReturn JSON: { "scores": [{ "index": number, "score": number, "tags": ["skill1","skill2"], "reason": "string" }] }';
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
  return parsed.scores || [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";
  if (!force && isCacheValid() && cache) {
    return NextResponse.json({ ...cache, cached: true });
  }
  if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_API_KEY) {
    return NextResponse.json({ error: "Adzuna credentials not configured" }, { status: 500 });
  }
  try {
    const results = await Promise.allSettled(SEARCH_QUERIES.map(fetchAdzunaJobs));
    const allJobs: AdzunaJob[] = [];
    const seen = new Set<string>();
    for (const result of results) {
      if (result.status === "fulfilled") {
        for (const job of result.value) {
          if (!seen.has(job.id)) { seen.add(job.id); allJobs.push(job); }
        }
      }
    }
    if (allJobs.length === 0) {
      return NextResponse.json({ error: "No jobs found from Adzuna" }, { status: 500 });
    }

    // Filter to known H-1B sponsors only
    const h1bJobs = allJobs.filter(job => isLikelyH1bSponsor(job.company?.display_name));
    const jobsToScore = h1bJobs.length > 0 ? h1bJobs : allJobs;

    const scores = await scoreJobsWithGemini(jobsToScore);
    const scoreMap = new Map(scores.map((s: { index: number; score: number; tags: string[]; reason: string }) => [s.index, s]));
    const roles: Role[] = jobsToScore.map((job, i) => {
      const scored = scoreMap.get(i) as { score: number; tags: string[]; reason: string } | undefined;
      return {
        id: "role-" + job.id,
        title: job.title,
        company: job.company?.display_name || "Unknown",
        industry: job.industry as Role["industry"],
        location: job.location?.display_name || "Seattle, WA",
        score: scored?.score ?? 70,
        tags: scored?.tags ?? [],
        reason: scored?.reason ?? "Matched based on your skills and experience.",
        jobUrl: job.redirect_url,
        fetchedAt: new Date().toISOString(),
      };
    });
    roles.sort((a, b) => b.score - a.score);
    cache = { roles, fetchedAt: new Date().toISOString() };
    return NextResponse.json({ ...cache, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Jobs API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
