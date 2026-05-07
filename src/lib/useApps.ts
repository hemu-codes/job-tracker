"use client";

import { useState, useEffect, useCallback } from "react";
import { TrackedApp } from "@/types";
import { getUserId } from "./userId";

export function useApps() {
  const [apps, setApps] = useState<TrackedApp[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Load from Redis on mount
  useEffect(() => {
    const userId = getUserId();
    if (!userId) return;

    // Show localStorage data immediately while fetching from Redis
    try {
      const local = localStorage.getItem("hemu_job_apps_v2");
      if (local) setApps(JSON.parse(local));
    } catch {}

    // Then fetch from Redis and merge
    fetch("/api/apps", { headers: { "x-user-id": userId } })
      .then(r => r.json())
      .then(data => {
        if (data.apps && data.apps.length > 0) {
          setApps(data.apps);
          localStorage.setItem("hemu_job_apps_v2", JSON.stringify(data.apps));
        }
      })
      .catch(() => {});
  }, []);

  const saveApps = useCallback(async (next: TrackedApp[]) => {
    setApps(next);
    localStorage.setItem("hemu_job_apps_v2", JSON.stringify(next));

    // Sync to Redis in background
    const userId = getUserId();
    if (!userId) return;
    setSyncing(true);
    try {
      await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ apps: next }),
      });
    } catch {} finally {
      setSyncing(false);
    }
  }, []);

  return { apps, saveApps, syncing };
}
