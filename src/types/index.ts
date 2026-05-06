export type Industry =
  | "HealthTech" | "Biotech" | "FinTech" | "Aerospace" | "Logistics"
  | "Energy" | "Insurance" | "RetailTech" | "EdTech" | "Gaming"
  | "LegalTech" | "GovTech" | "ManufacturingTech" | "AgTech" | "Traditional Tech";

export interface Role {
  id: string;
  title: string;
  company: string;
  industry: Industry;
  location: string;
  score: number;
  tags: string[];
  reason: string;
  jobUrl?: string;
  careersUrl?: string;
  fetchedAt: string;
  isKnownH1b?: boolean;
  postedAt?: string;
}

export interface DiscoverRole {
  id: string;
  title: string;
  company: string;
  industry: Industry;
  score: number;
  tags: string[];
  reason: string;
  careersUrl: string;
  fetchedAt: string;
}

export interface DiscoverCompany {
  id: string;
  name: string;
  industry: Industry;
  whyFit: string;
  whyH1b: string;
  careersUrl: string;
  score: number;
  roles: DiscoverRole[];
  fetchedAt: string;
}

export type AppStatus =
  | "saved" | "applied" | "interviewing" | "offer" | "rejected" | "withdrawn";

export interface TrackedApp {
  id: string;
  roleId: string;
  title: string;
  company: string;
  industry: string;
  location: string;
  score: number;
  status: AppStatus;
  source: "discover" | "live";
  dateAdded: string;
  dateApplied: string;
  link: string;
  notes: string;
}

export interface JobsCache {
  roles: Role[];
  fetchedAt: string;
}

export interface DiscoverCache {
  companies: DiscoverCompany[];
  fetchedAt: string;
}
