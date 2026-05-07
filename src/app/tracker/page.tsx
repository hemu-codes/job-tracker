"use client";

import { useState, useEffect, useCallback } from "react";
import { Role, TrackedApp, AppStatus, DiscoverCompany, DiscoverRole } from "@/types";
import styles from "./tracker.module.css";

const STATUS_META: Record<AppStatus, { label: string; color: string }> = {
  saved:        { label: "Saved",        color: "#5e5c6e" },
  applied:      { label: "Applied",      color: "#60a5fa" },
  interviewing: { label: "Interviewing", color: "#fbbf24" },
  offer:        { label: "Offer",        color: "#4ade80" },
  rejected:     { label: "Rejected",     color: "#f87171" },
  withdrawn:    { label: "Withdrawn",    color: "#5e5c6e" },
};

const ALL = "All";

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? "var(--green)" : score >= 70 ? "var(--amber)" : "var(--text-secondary)";
  const bg = score >= 85 ? "var(--green-dim)" : score >= 70 ? "var(--amber-dim)" : "rgba(255,255,255,0.04)";
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

function Spinner({ large }: { large?: boolean }) {
  return <div className={large ? styles.spinnerLg : styles.spinner} />;
}

export default function TrackerPage() {
  const [tab, setTab] = useState<"discover" | "live" | "applications" | "pipeline">("discover");

  // Discover state
  const [companies, setCompanies] = useState<DiscoverCompany[]>(() => {
    try {
      const c = localStorage.getItem("hemu_companies");
      return c ? JSON.parse(c) : [];
    } catch { return []; }
  });
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState("");
  const [discoverFetched, setDiscoverFetched] = useState<string | null>(null);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [discoverIndustry, setDiscoverIndustry] = useState(ALL);
  const [discoverSearch, setDiscoverSearch] = useState("");

  // Live state
  const [liveRoles, setLiveRoles] = useState<Role[]>(() => {
    try {
      const r = localStorage.getItem("hemu_live_roles");
      return r ? JSON.parse(r) : [];
    } catch { return []; }
  });
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [liveFetched, setLiveFetched] = useState<string | null>(null);
  const [liveIndustry, setLiveIndustry] = useState(ALL);
  const [liveSearch, setLiveSearch] = useState("");

  // Apps state
  const [apps, setApps] = useState<TrackedApp[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hemu_job_apps_v2");
      if (saved) setApps(JSON.parse(saved));
    } catch {}
  }, []);

  const saveApps = (next: TrackedApp[]) => {
    setApps(next);
    localStorage.setItem("hemu_job_apps_v2", JSON.stringify(next));
  };

  const appliedIds = new Set(
    apps.filter(a => !["saved"].includes(a.status)).map(a => a.roleId)
  );

  // ── Discover fetch ──────────────────────────────────────────────
  const fetchDiscover = useCallback(async (force = false) => {
    setDiscoverLoading(true);
    setDiscoverError("");
    try {
      const res = await fetch(`/api/discover-jobs${force ? "?force=true" : ""}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCompanies(data.companies || []);
      localStorage.setItem("hemu_companies", JSON.stringify(data.companies || []));
      setDiscoverFetched(data.fetchedAt);
    } catch (e) {
      setDiscoverError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setDiscoverLoading(false);
    }
  }, []);

  // ── Live fetch ──────────────────────────────────────────────────
  const fetchLive = useCallback(async (force = false) => {
    setLiveLoading(true);
    setLiveError("");
    try {
      const res = await fetch(`/api/live-jobs${force ? "?force=true" : ""}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLiveRoles(data.roles || []);
      localStorage.setItem("hemu_live_roles", JSON.stringify(data.roles || []));
      setLiveFetched(data.fetchedAt);
    } catch (e) {
      setLiveError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLiveLoading(false);
    }
  }, []);

  // ── Track helpers ───────────────────────────────────────────────
  const isTracked = (id: string) => apps.some(a => a.roleId === id);

  const trackRole = (role: DiscoverRole | Role, source: "discover" | "live") => {
    if (isTracked(role.id)) {
      saveApps(apps.filter(a => a.roleId !== role.id));
      return;
    }
    const app: TrackedApp = {
      id: `app-${Date.now()}`,
      roleId: role.id,
      title: role.title,
      company: role.company,
      industry: role.industry,
      location: "location" in role ? role.location : "See careers page",
      score: role.score,
      status: "saved",
      source,
      dateAdded: new Date().toLocaleDateString(),
      dateApplied: "",
      link: "careersUrl" in role ? (role.careersUrl || "") : ((role as Role).jobUrl || ""),
      notes: "",
    };
    saveApps([...apps, app]);
  };

  const updateApp = (id: string, patch: Partial<TrackedApp>) =>
    saveApps(apps.map(a => a.id === id ? { ...a, ...patch } : a));

  const removeApp = (id: string) => saveApps(apps.filter(a => a.id !== id));

  // ── Filtered lists ──────────────────────────────────────────────
  const discoverIndustries = [ALL, ...Array.from(new Set(companies.map(c => c.industry)))];
  const filteredCompanies = companies
    .filter(c => !appliedIds.has(c.id))
    .filter(c => discoverIndustry === ALL || c.industry === discoverIndustry)
    .filter(c => !discoverSearch || [c.name, c.industry, c.whyFit].join(" ").toLowerCase().includes(discoverSearch.toLowerCase()));

  const liveIndustries = [ALL, ...Array.from(new Set(liveRoles.map(r => r.industry)))];
  const filteredLive = liveRoles
    .filter(r => !appliedIds.has(r.id))
    .filter(r => liveIndustry === ALL || r.industry === liveIndustry)
    .filter(r => !liveSearch || [r.title, r.company, r.industry].join(" ").toLowerCase().includes(liveSearch.toLowerCase()));

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
          <span className={styles.headerBadge}>H-1B Sponsorship</span>
        </div>
      </header>

      {/* Stats */}
      <div className={styles.statsRow}>
        {[
          { label: "Companies to target", val: companies.length || "—" },
          { label: "Live postings", val: liveRoles.length || "—" },
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
        {([
          { key: "discover", label: "Discover Companies" },
          { key: "live", label: `Live Postings${liveRoles.length > 0 ? ` (${filteredLive.length})` : ""}` },
          { key: "applications", label: `Applications${apps.length > 0 ? ` (${apps.length})` : ""}` },
          { key: "pipeline", label: "Pipeline" },
        ] as { key: typeof tab; label: string }[]).map(t => (
          <button key={t.key} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── DISCOVER TAB ── */}
      {tab === "discover" && (
        <div>
          <div className={styles.tabHeader}>
            <div>
              <p className={styles.tabDesc}>AI-researched companies you should target — H-1B verified, non-traditional industries, matched to your background.</p>
              {discoverFetched && <span className={styles.refreshInfo}>Updated {new Date(discoverFetched).toLocaleTimeString()}</span>}
            </div>
            <button className={styles.btnPrimary} onClick={() => fetchDiscover(true)} disabled={discoverLoading}>
              {discoverLoading ? <><Spinner /> Researching...</> : <>↻ Refresh</>}
            </button>
          </div>

          {companies.length > 0 && (
            <>
              <div className={styles.toolbar}>
                <input className={styles.searchInput} type="text" placeholder="Search companies, industries..." value={discoverSearch} onChange={e => setDiscoverSearch(e.target.value)} />
              </div>
              <div className={styles.chipRow}>
                {discoverIndustries.map(ind => (
                  <button key={ind} className={`${styles.chip} ${discoverIndustry === ind ? styles.chipActive : ""}`} onClick={() => setDiscoverIndustry(ind)}>{ind}</button>
                ))}
              </div>
            </>
          )}

          {discoverError && <div className={styles.errorState}><span>⚠ {discoverError}</span><button className={styles.btnGhost} onClick={() => fetchDiscover(true)}>Retry</button></div>}

          {!discoverLoading && !discoverError && companies.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎯</div>
              <p className={styles.emptyTitle}>Discover your target companies</p>
              <p className={styles.emptyBody}>Get AI-researched recommendations of H-1B-sponsoring companies across HealthTech, FinTech, Aerospace, Gaming, and more — matched to your background.</p>
              <button className={styles.btnPrimary} onClick={() => fetchDiscover()}>Find companies now →</button>
            </div>
          )}

          {discoverLoading && (
            <div className={styles.loadingState}>
              <Spinner large />
              <p>Researching H-1B-friendly companies across all industries...</p>
              <p className={styles.loadingSubtext}>This takes about 20 seconds</p>
            </div>
          )}

          {!discoverLoading && filteredCompanies.length > 0 && (
            <div className={styles.companyList}>
              {filteredCompanies.map(company => (
                <div key={company.id} className={styles.companyCard}>
                  <div className={styles.companyHeader} onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}>
                    <div className={styles.companyLeft}>
                      <ScoreBadge score={company.score} />
                      <div>
                        <div className={styles.companyName}>{company.name}</div>
                        <div className={styles.companyMeta}>{company.industry} · {company.roles.length} matching role{company.roles.length !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                    <div className={styles.companyActions}>
                      <a href={company.careersUrl} target="_blank" rel="noopener noreferrer" className={styles.btnGhost} onClick={e => e.stopPropagation()}>↗ Careers</a>
                      <span className={styles.expandIcon}>{expandedCompany === company.id ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  <div className={styles.companyBody}>
                    <p className={styles.companyWhyFit}>{company.whyFit}</p>
                    <span className={styles.h1bNote}>✓ {company.whyH1b}</span>
                  </div>

                  {expandedCompany === company.id && (
                    <div className={styles.rolesSection}>
                      <div className={styles.rolesSectionTitle}>Matching roles at {company.name}</div>
                      {company.roles.map(role => (
                        <div key={role.id} className={`${styles.roleRow} ${isTracked(role.id) ? styles.roleRowTracked : ""}`}>
                          <div className={styles.roleRowLeft}>
                            <ScoreBadge score={role.score} />
                            <div>
                              <div className={styles.roleTitle}>{role.title}</div>
                              <div className={styles.roleReason}>{role.reason}</div>
                              <div className={styles.tagRow}>
                                {(role.tags || []).map(t => <span key={t} className={styles.tag}>{t}</span>)}
                              </div>
                            </div>
                          </div>
                          <div className={styles.roleRowActions}>
                            <a href={role.careersUrl} target="_blank" rel="noopener noreferrer" className={styles.btnGhost}>↗ Apply</a>
                            <button className={`${styles.trackBtn} ${isTracked(role.id) ? styles.trackBtnActive : ""}`} onClick={() => trackRole(role, "discover")}>
                              {isTracked(role.id) ? "✓ Tracked" : "+ Track"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LIVE POSTINGS TAB ── */}
      {tab === "live" && (
        <div>
          <div className={styles.tabHeader}>
            <div>
              <p className={styles.tabDesc}>Real job postings from LinkedIn, Indeed, Glassdoor & more — updated weekly, scored against your resume.</p>
              {liveFetched && <span className={styles.refreshInfo}>Updated {new Date(liveFetched).toLocaleTimeString()}</span>}
            </div>
            <button className={styles.btnPrimary} onClick={() => fetchLive(true)} disabled={liveLoading}>
              {liveLoading ? <><Spinner /> Loading...</> : <>↻ Refresh</>}
            </button>
          </div>

          {liveRoles.length > 0 && (
            <>
              <div className={styles.toolbar}>
                <input className={styles.searchInput} type="text" placeholder="Search roles, companies..." value={liveSearch} onChange={e => setLiveSearch(e.target.value)} />
              </div>
              <div className={styles.chipRow}>
                {liveIndustries.map(ind => (
                  <button key={ind} className={`${styles.chip} ${liveIndustry === ind ? styles.chipActive : ""}`} onClick={() => setLiveIndustry(ind)}>{ind}</button>
                ))}
              </div>
            </>
          )}

          {liveError && <div className={styles.errorState}><span>⚠ {liveError}</span><button className={styles.btnGhost} onClick={() => fetchLive(true)}>Retry</button></div>}

          {!liveLoading && !liveError && liveRoles.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📋</div>
              <p className={styles.emptyTitle}>Load live job postings</p>
              <p className={styles.emptyBody}>Pull real postings from across the web, scored against your resume. Roles you&apos;ve already applied to won&apos;t show up.</p>
              <button className={styles.btnPrimary} onClick={() => fetchLive()}>Load postings →</button>
            </div>
          )}

          {liveLoading && (
            <div className={styles.loadingState}>
              <Spinner large />
              <p>Fetching live postings across all industries...</p>
              <p className={styles.loadingSubtext}>This takes about 20 seconds</p>
            </div>
          )}

          {!liveLoading && filteredLive.length > 0 && (
            <div className={styles.roleList}>
              {filteredLive.map(role => (
                <div key={role.id} className={`${styles.roleCard} ${isTracked(role.id) ? styles.roleCardTracked : ""}`}>
                  <ScoreBadge score={role.score} />
                  <div className={styles.roleBody}>
                    <div className={styles.roleTop}>
                      <div>
                        <div className={styles.roleTitle}>{role.title}</div>
                        <div className={styles.roleMeta}>{role.company} · {role.location}</div>
                      </div>
                      <div className={styles.roleActions}>
                        {role.isKnownH1b && <span className={styles.tagH1b}>✓ H-1B</span>}
                        {!role.isKnownH1b && <span className={styles.tagVerify}>Verify H-1B</span>}
                        {role.jobUrl && <a href={role.jobUrl} target="_blank" rel="noopener noreferrer" className={styles.btnGhost}>↗ Apply</a>}
                        <button className={`${styles.trackBtn} ${isTracked(role.id) ? styles.trackBtnActive : ""}`} onClick={() => trackRole(role, "live")}>
                          {isTracked(role.id) ? "✓ Tracked" : "+ Track"}
                        </button>
                      </div>
                    </div>
                    <div className={styles.tagRow}>
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

      {/* ── APPLICATIONS TAB ── */}
      {tab === "applications" && (
        <div>
          {apps.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📋</div>
              <p className={styles.emptyTitle}>No applications yet</p>
              <p className={styles.emptyBody}>Track roles from Discover or Live Postings by clicking &quot;+ Track&quot;.</p>
              <button className={styles.btnGhost} onClick={() => setTab("discover")}>Go to Discover →</button>
            </div>
          ) : (
            <div className={styles.appList}>
              {apps.map(app => (
                <div key={app.id} className={styles.appCard}>
                  <div className={styles.appCardHeader}>
                    <div>
                      <div className={styles.appTitle}>{app.title}</div>
                      <div className={styles.appMeta}>
                        {app.company} · {app.industry} · Score: {app.score}
                        <span className={styles.sourceTag}>{app.source === "discover" ? "AI Discovered" : "Live Posting"}</span>
                      </div>
                    </div>
                    <div className={styles.appCardActions}>
                      <select className={styles.statusSelect} value={app.status} onChange={e => updateApp(app.id, { status: e.target.value as AppStatus })}>
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

      {/* ── PIPELINE TAB ── */}
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
            <div className={styles.emptyState}><p className={styles.emptyBody}>No applications tracked yet.</p></div>
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
