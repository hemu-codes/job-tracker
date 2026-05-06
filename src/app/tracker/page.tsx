"use client";

import { useState, useEffect, useCallback } from "react";
import { Role, TrackedApp, AppStatus } from "@/types";
import styles from "./tracker.module.css";

const STATUS_META: Record<AppStatus, { label: string; color: string }> = {
  saved:        { label: "Saved",        color: "#5e5c6e" },
  applied:      { label: "Applied",      color: "#60a5fa" },
  interviewing: { label: "Interviewing", color: "#fbbf24" },
  offer:        { label: "Offer",        color: "#4ade80" },
  rejected:     { label: "Rejected",     color: "#f87171" },
  withdrawn:    { label: "Withdrawn",    color: "#5e5c6e" },
};

const ALL_INDUSTRIES = "All";

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? "var(--green)" : score >= 70 ? "var(--amber)" : "var(--text-secondary)";
  const bg   = score >= 85 ? "var(--green-dim)" : score >= 70 ? "var(--amber-dim)" : "rgba(255,255,255,0.04)";
  return (
    <div className={styles.scoreBadge} style={{ background: bg, color }}>
      <span className={styles.scoreNum}>{score}</span>
      <span className={styles.scoreLbl}>match</span>
    </div>
  );
}

function StatusPill({ status }: { status: AppStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={styles.statusPill} style={{ color: m.color, background: `${m.color}18`, border: `1px solid ${m.color}33` }}>
      {m.label}
    </span>
  );
}

export default function TrackerPage() {
  const [tab, setTab] = useState<"discover" | "applications" | "pipeline">("discover");
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [nextRefresh, setNextRefresh] = useState<string>("");
  const [searchQ, setSearchQ] = useState("");
  const [industryFilter, setIndustryFilter] = useState(ALL_INDUSTRIES);
  const [sortBy, setSortBy] = useState<"score" | "industry" | "alpha">("score");
  const [apps, setApps] = useState<TrackedApp[]>([]);
  const [error, setError] = useState("");

  // Load apps from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("hemu_job_apps");
      if (saved) setApps(JSON.parse(saved));
    } catch {}
  }, []);

  const saveApps = (next: TrackedApp[]) => {
    setApps(next);
    localStorage.setItem("hemu_job_apps", JSON.stringify(next));
  };

  // Countdown timer
  useEffect(() => {
    if (!lastFetched) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - new Date(lastFetched).getTime();
      const remaining = Math.max(0, 6 * 60 * 60 * 1000 - elapsed);
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      setNextRefresh(`Next refresh in ${h}h ${m}m`);
    }, 30000);
    return () => clearInterval(interval);
  }, [lastFetched]);

  const fetchJobs = useCallback(async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs${force ? "?force=true" : ""}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRoles(data.roles || []);
      setLastFetched(data.fetchedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  const isTracked = (role: Role) => apps.some(a => a.roleId === role.id);

  const toggleTrack = (role: Role) => {
    if (isTracked(role)) {
      saveApps(apps.filter(a => a.roleId !== role.id));
    } else {
      const app: TrackedApp = {
        id: `app-${Date.now()}`,
        roleId: role.id,
        title: role.title,
        company: role.company,
        industry: role.industry,
        location: role.location,
        score: role.score,
        status: "saved",
        dateAdded: new Date().toLocaleDateString(),
        dateApplied: "",
        link: "",
        notes: "",
      };
      saveApps([...apps, app]);
    }
  };

  const updateApp = (id: string, patch: Partial<TrackedApp>) => {
    saveApps(apps.map(a => a.id === id ? { ...a, ...patch } : a));
  };

  const removeApp = (id: string) => saveApps(apps.filter(a => a.id !== id));

  // Filtered + sorted roles
  const industries = [ALL_INDUSTRIES, ...Array.from(new Set(roles.map(r => r.industry)))];
  const filtered = roles
    .filter(r => industryFilter === ALL_INDUSTRIES || r.industry === industryFilter)
    .filter(r => !searchQ || [r.title, r.company, r.industry, r.reason, ...(r.tags || [])].join(" ").toLowerCase().includes(searchQ.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "industry") return a.industry.localeCompare(b.industry);
      return a.title.localeCompare(b.title);
    });

  // Pipeline counts
  const pipelineCounts = Object.keys(STATUS_META).reduce((acc, s) => {
    acc[s as AppStatus] = apps.filter(a => a.status === s).length;
    return acc;
  }, {} as Record<AppStatus, number>);

  return (
    <div className={styles.root}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="7" height="7" rx="2" fill="var(--accent)" opacity="0.9"/>
              <rect x="11" y="2" width="7" height="7" rx="2" fill="var(--accent)" opacity="0.5"/>
              <rect x="2" y="11" width="7" height="7" rx="2" fill="var(--accent)" opacity="0.5"/>
              <rect x="11" y="11" width="7" height="7" rx="2" fill="var(--accent)" opacity="0.9"/>
            </svg>
            <span>Job Tracker</span>
          </div>
          <span className={styles.headerBadge}>H-1B Sponsorship Only</span>
        </div>
        <div className={styles.headerRight}>
          {lastFetched && <span className={styles.refreshMeta}>{nextRefresh}</span>}
          <button className={styles.btnPrimary} onClick={() => fetchJobs(true)} disabled={loading}>
            {loading ? (
              <><span className={styles.spinner} /> Searching...</>
            ) : (
              <>↻ Refresh roles</>
            )}
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className={styles.statsRow}>
        {[
          { label: "Roles found", val: roles.length || "—" },
          { label: "Strong matches (85+)", val: roles.filter(r => r.score >= 85).length || (roles.length ? "0" : "—") },
          { label: "Applications", val: apps.length },
          { label: "Interviewing", val: pipelineCounts.interviewing },
        ].map(s => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statVal}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(["discover", "applications", "pipeline"] as const).map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`} onClick={() => setTab(t)}>
            {t === "discover" && "Discover"}
            {t === "applications" && `Applications${apps.length > 0 ? ` (${apps.length})` : ""}`}
            {t === "pipeline" && "Pipeline"}
          </button>
        ))}
      </div>

      {/* DISCOVER */}
      {tab === "discover" && (
        <div>
          {/* Search + sort */}
          <div className={styles.toolbar}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search roles, companies, skills..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
            <select className={styles.sortSelect} value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
              <option value="score">Sort: Match score</option>
              <option value="industry">Sort: Industry</option>
              <option value="alpha">Sort: A–Z</option>
            </select>
          </div>

          {/* Industry chips */}
          {roles.length > 0 && (
            <div className={styles.chipRow}>
              {industries.map(ind => (
                <button
                  key={ind}
                  className={`${styles.chip} ${industryFilter === ind ? styles.chipActive : ""}`}
                  onClick={() => setIndustryFilter(ind)}
                >
                  {ind}
                </button>
              ))}
            </div>
          )}

          {/* Refresh info */}
          {lastFetched && (
            <div className={styles.refreshInfo}>
              Last updated {new Date(lastFetched).toLocaleTimeString()} · {filtered.length} role{filtered.length !== 1 ? "s" : ""}
            </div>
          )}

          {/* States */}
          {error && (
            <div className={styles.errorState}>
              <span>⚠ {error}</span>
              <button className={styles.btnGhost} onClick={() => fetchJobs(true)}>Retry</button>
            </div>
          )}

          {!loading && !error && roles.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎯</div>
              <p className={styles.emptyTitle}>Find your next role</p>
              <p className={styles.emptyBody}>
                Click &ldquo;Refresh roles&rdquo; to discover H-1B-friendly SWE positions in non-traditional industries, ranked by how well they match your background.
              </p>
              <button className={styles.btnPrimary} onClick={() => fetchJobs()}>Find roles now →</button>
            </div>
          )}

          {loading && (
            <div className={styles.loadingState}>
              <div className={styles.spinnerLg} />
              <p>Searching for H-1B-friendly roles matching your background...</p>
              <p className={styles.loadingSubtext}>This takes about 15 seconds</p>
            </div>
          )}

          {/* Role cards */}
          {!loading && filtered.length > 0 && (
            <div className={styles.roleList}>
              {filtered.map(role => (
                <div key={role.id} className={`${styles.roleCard} ${isTracked(role) ? styles.roleCardTracked : ""}`}>
                  <ScoreBadge score={role.score} />
                  <div className={styles.roleBody}>
                    <div className={styles.roleTop}>
                      <div>
                        <div className={styles.roleTitle}>{role.title}</div>
                        <div className={styles.roleMeta}>{role.company} · {role.location}</div>
                      </div>
                      <div className={styles.roleActions}>
                        {role.jobUrl && (
                          <a href={role.jobUrl} target="_blank" rel="noopener noreferrer" className={styles.btnGhost}>
                            ↗ View
                          </a>
                        )}
                        <button
                          className={`${styles.trackBtn} ${isTracked(role) ? styles.trackBtnActive : ""}`}
                          onClick={() => toggleTrack(role)}
                        >
                          {isTracked(role) ? "✓ Tracked" : "+ Track"}
                        </button>
                      </div>
                    </div>
                    <div className={styles.tagRow}>
                      <span className={styles.tagH1b}>H-1B</span>
                      <span className={styles.tagInd}>{role.industry}</span>
                      {(role.tags || []).map(t => <span key={t} className={styles.tag}>{t}</span>)}
                    </div>
                    <p className={styles.roleReason}>{role.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* APPLICATIONS */}
      {tab === "applications" && (
        <div>
          {apps.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📋</div>
              <p className={styles.emptyTitle}>No applications yet</p>
              <p className={styles.emptyBody}>Discover roles and click &ldquo;+ Track&rdquo; to start tracking your applications here.</p>
              <button className={styles.btnGhost} onClick={() => setTab("discover")}>Go to Discover →</button>
            </div>
          ) : (
            <div className={styles.appList}>
              {apps.map(app => (
                <div key={app.id} className={styles.appCard}>
                  <div className={styles.appCardHeader}>
                    <div>
                      <div className={styles.appTitle}>{app.title}</div>
                      <div className={styles.appMeta}>{app.company} · {app.industry} · Match: {app.score}</div>
                    </div>
                    <div className={styles.appCardActions}>
                      <select
                        className={styles.statusSelect}
                        value={app.status}
                        onChange={e => updateApp(app.id, { status: e.target.value as AppStatus })}
                      >
                        {Object.entries(STATUS_META).map(([s, m]) => (
                          <option key={s} value={s}>{m.label}</option>
                        ))}
                      </select>
                      <button className={styles.btnIconDanger} onClick={() => removeApp(app.id)} title="Remove">✕</button>
                    </div>
                  </div>
                  <div className={styles.appFields}>
                    <div className={styles.appField}>
                      <label>Date applied</label>
                      <input type="date" value={app.dateApplied} onChange={e => updateApp(app.id, { dateApplied: e.target.value })} />
                    </div>
                    <div className={styles.appField}>
                      <label>Job link</label>
                      <input type="text" placeholder="https://..." value={app.link} onChange={e => updateApp(app.id, { link: e.target.value })} />
                    </div>
                    <div className={`${styles.appField} ${styles.appFieldFull}`}>
                      <label>Notes</label>
                      <textarea rows={2} placeholder="Recruiter name, next steps, salary range..." value={app.notes} onChange={e => updateApp(app.id, { notes: e.target.value })} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PIPELINE */}
      {tab === "pipeline" && (
        <div>
          <div className={styles.pipelineBar}>
            {(Object.entries(STATUS_META) as [AppStatus, { label: string; color: string }][]).map(([s, m]) => (
              <div key={s} className={styles.pipelineStep}>
                <div className={styles.pipelineCount} style={{ color: pipelineCounts[s] > 0 ? m.color : "var(--text-muted)" }}>
                  {pipelineCounts[s]}
                </div>
                <div className={styles.pipelineLabel}>{m.label}</div>
              </div>
            ))}
          </div>

          {apps.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyBody}>No applications tracked yet.</p>
            </div>
          ) : (
            <div className={styles.pipelineGroups}>
              {(["interviewing", "applied", "saved", "offer", "rejected", "withdrawn"] as AppStatus[]).map(s => {
                const group = apps.filter(a => a.status === s);
                if (!group.length) return null;
                return (
                  <div key={s} className={styles.pipelineGroup}>
                    <div className={styles.pipelineGroupHeader}>
                      <StatusPill status={s} />
                      <span className={styles.pipelineGroupCount}>{group.length}</span>
                    </div>
                    {group.map(app => (
                      <div key={app.id} className={styles.pipelineItem}>
                        <span className={styles.pipelineItemTitle}>{app.title}</span>
                        <span className={styles.pipelineItemCompany}>{app.company}</span>
                        {app.dateApplied && <span className={styles.pipelineItemDate}>Applied {app.dateApplied}</span>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
