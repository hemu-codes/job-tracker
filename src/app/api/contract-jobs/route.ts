import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RESUME_CONTEXT } from "@/lib/resume";
import { Role, JobsCache } from "@/types";
import { isLikelyH1bSponsor } from "@/lib/h1b-sponsors";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const CACHE_KEY = "contract:roles";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const SEARCH_QUERIES = [
  { query: "software engineer contract C2C", industry: "Traditional Tech" },
  { query: "backend engineer contract remote", industry: "Traditional Tech" },
  { query: "full stack developer contract C2C", industry: "Traditional Tech" },
  { query: "SRE platform engineer contract", industry: "Traditional Tech" },
  { query: "software engineer contract healthtech", industry: "HealthTech" },
  { query: "software engineer contract fintech", industry: "FinTech" },
  { query: "devops engineer contract C2C remote", industry: "Traditional Tech" },
  { query: "software engineer contract logistics", industry: "Logistics" },
];

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city: string;
  job_state: string;
  job_apply_link: string;
  job_description: string;
  job_is_remote: boolean;
  job_employment_type: string;
  job_posted_at_datetime_utc: string;
  industry: string;
}

async function fetchContractJobs(query: { query: string; industry: string }) {
  const apiKey = process.env.JSEARCH_API_KEY;
  const url = new URL("https://jsearch.p.rapidapi.com/search");
  url.searchParams.set("query", query.query);
  url.searchParams.set("num_pages", "2");
  url.searchParams.set("page", "1");
  url.searchParams.set("date_posted", "month");
  url.searchParams.set("employment_types", "CONTRACTOR");
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
    type: j.job_employment_type,
  }));
  const prompt =
    "Given this candidate resume, score each contract job 60-95 based on match quality.\n\nResume:\n" +
    RESUME_CONTEXT +
    "\n\nJobs:\n" +
    JSON.stringify(jobSummaries) +
    '\n\nReturn JSON: { "scores": [{ "index": number, "score": number, "tags": ["skill1","skill2"], "reason": "string", "contractType": "C2C or W2 Contract or Contract-to-Hire" }] }';
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
  return parsed.scores || [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  if (!force) {
    try {
      const cached = await redis.get<JobsCache>(CACHE_KEY);
      if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS) {
        return NextResponse.json({ ...cached, cached: true });
      }
    } catch {}
  }

  if (!process.env.JSEARCH_API_KEY) {
    return NextResponse.json({ error: "JSEARCH_API_KEY not configured" }, { status: 500 });
  }

  try {
    const results = await Promise.allSettled(SEARCH_QUERIES.map(fetchContractJobs));
    const allJobs: JSearchJob[] = [];
    const seen = new Set<string>();
    for (const result of results) {
      if (result.status === "fulfilled") {
        for (const job of result.value) {
          if (!seen.has(job.job_id)) {
            seen.add(job.job_id);
            allJobs.push(job);
          }
        }
      }
    }
    if (allJobs.length === 0) {
      return NextResponse.json({ error: "No contract jobs found" }, { status: 500 });
    }

    const scores = await scoreJobsWithGemini(allJobs);
    const scoreMap = new Map(
      scores.map((s: { index: number; score: number; tags: string[]; reason: string; contractType: string }) => [s.index, s])
    );

    const roles: Role[] = allJobs.map((job, i) => {
      const scored = scoreMap.get(i) as { score: number; tags: string[]; reason: string; contractType: string } | undefined;
      const location = job.job_is_remote
        ? "Remote"
        : [job.job_city, job.job_state].filter(Boolean).join(", ") || "Unknown";
      return {
        id: "contract-" + job.job_id,
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
        contractType: scored?.contractType ?? "Contract",
      };
    });

    roles.sort((a, b) => b.score - a.score);
    const payload: JobsCache = { roles, fetchedAt: new Date().toISOString() };
    await redis.set(CACHE_KEY, payload, { ex: 25200 });
    return NextResponse.json({ ...payload, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Contract jobs API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
