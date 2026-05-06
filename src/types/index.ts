export type Industry =
  | "HealthTech"
  | "Biotech"
  | "FinTech"
  | "Aerospace"
  | "Logistics"
  | "Energy"
  | "Insurance"
  | "RetailTech"
  | "EdTech"
  | "Gaming"
  | "LegalTech"
  | "GovTech"
  | "ManufacturingTech"
  | "AgTech"
  | "Traditional Tech";

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
  fetchedAt: string;
}

export type AppStatus =
  | "saved"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected"
  | "withdrawn";

export interface TrackedApp {
  id: string;
  roleId: string;
  title: string;
  company: string;
  industry: string;
  location: string;
  score: number;
  status: AppStatus;
  dateAdded: string;
  dateApplied: string;
  link: string;
  notes: string;
}

export interface JobsCache {
  roles: Role[];
  fetchedAt: string;
}
