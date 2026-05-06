export const RESUME_CONTEXT = `
Hemantha (Hemu) Akkaraju — Software Engineer, ~5 years experience
Skills: Java, Spring Boot, .NET/C#, Angular, TypeScript, React, AWS (SQS/SNS, Lambda, DynamoDB, CloudWatch), Azure DevOps, Docker, Auth0, PostgreSQL, distributed/event-driven systems, CI/CD pipelines, GraphQL
Experience:
  - RBC Technologies (Nov 2025–Present): Full-stack dev on AI-powered testing automation tool; .NET, Angular, Docker, Auth0 SSO, Azure Container Apps
  - Amazon Device Supply Chain Technologies (Jan 2023–Sep 2025): Built Townsend PLM (3,000+ users), React/TypeScript UI, AWS Lambda/DynamoDB microservices, reduced downtime 20%, mentored engineers
  - Amazon Device Sales & Financial System Automation (May–Dec 2022): Cut credit claim processing by 2.5 days, automated approval workflows, reduced manager workload 60%
  - Amazon Operations Tech (Apr 2021–May 2022): 99.99% service availability automation, real-time dashboards, event-driven monitoring with Lambda+DynamoDB
Education: B.S. Computer Science & Software Engineering, University of Washington Bothell
Location: Seattle, WA
Visa: H-1B (I-140 approved, portability) — needs H-1B transfer sponsorship, not new cap filing
Open to: SWE, SRE/Platform Engineering, DevOps, Backend, Full Stack roles
Industry preference: Non-traditional industries (healthcare, biotech, fintech, aerospace, logistics, energy, insurance, retail tech, edtech, gaming, legal tech, gov tech) — also open to traditional tech but prefer less competitive verticals
`;

export const buildJobsPrompt = () => `
Given this candidate profile, generate exactly 20 realistic SWE and SWE-adjacent job roles.

Requirements:
1. Prioritize NON-TRADITIONAL industries: HealthTech, Biotech, FinTech, Aerospace, Logistics, Energy, Insurance, RetailTech, EdTech, Gaming, LegalTech, GovTech, ManufacturingTech, AgTech — at least 14 of the 20 roles must be non-traditional. Include some Traditional Tech but it should be the minority.
2. Only include companies KNOWN to sponsor H-1B visas (large employers, established tech-enabled companies, publicly traded companies — avoid small startups that typically don't sponsor)
3. Score each role 60–95 based on match to resume. Scoring criteria: tech stack overlap (Java/.NET/React/AWS/TypeScript), years of experience match, role type fit (backend/fullstack/platform), domain relevance
4. Include a realistic mix: Backend SWE, Full Stack SWE, Platform/SRE, DevOps/Infrastructure
5. Use real company names. Prefer Seattle-area companies or companies with strong remote culture or Seattle offices
6. Include at least 5 roles with score >= 85

Resume:
${RESUME_CONTEXT}

Return ONLY valid JSON, no markdown, no backticks, no explanation:
{
  "roles": [
    {
      "title": "string — specific job title",
      "company": "string — real company name",
      "industry": "string — must be one of: HealthTech, Biotech, FinTech, Aerospace, Logistics, Energy, Insurance, RetailTech, EdTech, Gaming, LegalTech, GovTech, ManufacturingTech, AgTech, Traditional Tech",
      "location": "string — e.g. Seattle, WA / Remote",
      "score": number between 60 and 95,
      "tags": ["array", "of", "3-5", "relevant", "skills"],
      "reason": "2 sentences: why this role matches the resume AND why this company/industry is H-1B friendly and less competitive than big tech",
      "jobUrl": ""
    }
  ]
}`;
