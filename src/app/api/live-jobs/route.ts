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
  { query: "software engineer healthtech", industry: "HealthTech" },
  { query: "software engineer fintech", industry: "FinTech" },
  { query: "software engineer aerospace", industry: "Aerospace" },
  { query: "software engineer logistics supply chain", industry: "Logistics" },
  { query: "software engineer biotech", industry: "Biotech" },
  { query: "software engineer insurance", industry: "Insurance" },
  { query: "SRE platform engineer devops", industry: "Traditional Tech" },
  { query: "software engineer retail ecommerce", industry: "RetailTech" },
  { query: "software engineer edtech education", industry: "EdTech" },
  { query: "software engineer gaming", industry: "Gaming" },
];

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_website?: string;
  job_city: string;
  job_state: string;
  job_apply_link: string;
  job_description: string;
  job_is_remote: boolean;
  job_posted_at_datetime_utc: string;
  industry: string;
}

async function fetchJSearchJobs(query: { query: string; industry: string }) {
  const apiKey = process.env.JSEARCH_API_KEY;
  const url = new URL("https://jsearch.p.rapidapi.com/search");
  url.searchParams.set("query", query.query);
  url.searchParams.set("num_pages", "2");
  url.searchParams.set("page", "1");
  url.searchParams.set("date_posted", "week");
  url.searchParams.set("remote_jobs_only", "false");

  const res = await fetch(url.toString(), {
    headers: {
      "x-rapidapi-host": "jsearch.p.rapidapi.com",
      "x-rapidapi-key": apiKey!,
    },
  });
  if (!res.ok) throw new Error("JSearch error: " + res.status);
  const data = await res.json();
  return (data.data || []).map((job: JSearchJob) => ({
    ...job,
    industry: query.industry,
  }));
}

async function scoreJobsWithGemini(jobs: JSearchJob[]) {
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
    title: j.job_title,
    company: j.employer_name,
    description: j.job_description?.slice(0, 300),
    industry: j.industry,
  }));
  const prompt =
    "Given this candidate resume, score each job 60-95 based on match quality.\n\nResume:\n" +
    RESUME_CONTEXT +
    "\n\nJobs:\n" +
    JSON.stringify(jobSummaries) +
    '\n\nReturn JSON: { "scores": [{ "index": number, "score": number, "tags": ["skill1","skill2"], "reason": "string" }] }';
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
  if (!process.env.JSEARCH_API_KEY) {
    return NextResponse.json({ error: "JSEARCH_API_KEY not configured" }, { status: 500 });
  }
  try {
    const results = await Promise.allSettled(SEARCH_QUERIES.map(fetchJSearchJobs));
    const allJobs: JSearchJob[] = [];
    const seen = new Set<string>();
    for (const result of results) {
      if (result.status === "fulfilled") {
        for (const job of result.value) {
          if (!seen.has(job.job_id)) { seen.add(job.job_id); allJobs.push(job); }
        }
      }
    }
    if (allJobs.length === 0) {
      return NextResponse.json({ error: "No jobs found" }, { status: 500 });
    }
    const scores = await scoreJobsWithGemini(allJobs);
    const scoreMap = new Map(
      scores.map((s: { index: number; score: number; tags: string[]; reason: string }) => [s.index, s])
    );
    const roles: Role[] = allJobs.map((job, i) => {
      const scored = scoreMap.get(i) as { score: number; tags: string[]; reason: string } | undefined;
      const location = job.job_is_remote
        ? "Remote"
        : [job.job_city, job.job_state].filter(Boolean).join(", ") || "Unknown";
      return {
        id: "live-" + job.job_id,
        title: job.job_title,
        company: job.employer_name || "Unknown",
        industry: job.industry as Role["industry"],
        location,
        score: scored?.score ?? 70,
        tags: scored?.tags ?? [],
        reason: scored?.reason ?? "Matched based on your skills and experience.",
        jobUrl: job.job_apply_link,
        fetchedAt: new Date().toISOString(),
        isKnownH1b: isLikelyH1bSponsor(job.employer_name),
        postedAt: job.job_posted_at_datetime_utc,
      };
    });
    roles.sort((a, b) => b.score - a.score);
    cache = { roles, fetchedAt: new Date().toISOString() };
    return NextResponse.json({ ...cache, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Live jobs API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
