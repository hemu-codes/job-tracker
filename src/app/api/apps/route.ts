import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { TrackedApp } from "@/types";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function getKey(userId: string) {
  return `apps:${userId}`;
}

export async function GET(request: Request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ apps: [] });
  try {
    const apps = await redis.get<TrackedApp[]>(getKey(userId));
    return NextResponse.json({ apps: apps || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "No user ID" }, { status: 400 });
  try {
    const { apps } = await request.json();
    await redis.set(getKey(userId), apps);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
