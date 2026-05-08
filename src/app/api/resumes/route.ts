import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export interface StoredResume {
  id: string;
  name: string;
  content: string;
  uploadedAt: string;
}

function getKey(userId: string) {
  return `resumes:${userId}`;
}

export async function GET(request: Request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ resumes: [] });
  try {
    const resumes = await redis.get<StoredResume[]>(getKey(userId));
    return NextResponse.json({ resumes: resumes || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "No user ID" }, { status: 400 });
  try {
    const { resumes } = await request.json();
    await redis.set(getKey(userId), resumes);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
