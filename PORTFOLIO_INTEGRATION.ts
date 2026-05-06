// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO INTEGRATION PATCH
// Add this project card to the Projects section of hemantha-personal-website
//
// Your portfolio appears to be a single-page Next.js/TypeScript app.
// Find the section that renders your project cards (search for "FinanceTracker"
// or "Finance Tracker" in your portfolio source) and add this object to
// your projects array, or paste the JSX block directly.
// ─────────────────────────────────────────────────────────────────────────────

// OPTION A — If you have a projects data array (recommended)
// Add this to your projects array:

const jobTrackerProject = {
  title: "H-1B Job Tracker",
  description:
    "An AI-powered job search dashboard that discovers H-1B-sponsoring SWE roles in non-traditional industries (HealthTech, FinTech, Aerospace, etc.), ranks them by resume match score using Claude AI, and lets you track every application through a full pipeline.",
  features: [
    "AI-generated role discovery via Claude claude-sonnet-4-20250514",
    "Resume match scoring (60–95) based on real profile data",
    "Non-traditional industry focus with H-1B sponsorship filter",
    "Application tracker with status pipeline (Applied → Interviewing → Offer)",
    "Vercel cron job for automatic refresh every 6 hours",
  ],
  technologies: [
    "Next.js", "TypeScript", "React", "Anthropic SDK",
    "Vercel", "Vercel Cron", "CSS Modules",
  ],
  githubUrl: "https://github.com/hemu-codes/job-tracker",
  liveUrl: "https://hemu-job-tracker.vercel.app", // update after deploy
};


// ─────────────────────────────────────────────────────────────────────────────
// OPTION B — Direct JSX to paste into your Projects section
// Replace YOUR_LIVE_URL with the deployed Vercel URL after deployment
// ─────────────────────────────────────────────────────────────────────────────

/*
<div className="project-card">          {/* use your existing project card class */}
  <h3>H-1B Job Tracker</h3>

  <p>
    An AI-powered job search dashboard that automatically discovers H-1B-sponsoring
    SWE roles in non-traditional industries — HealthTech, FinTech, Aerospace,
    Logistics, Gaming, and more — and ranks them by resume match score using Claude AI.
    Includes a full application tracker with pipeline stages from Saved → Offer.
  </p>

  <h4>Key Features:</h4>
  <ul>
    <li>AI-generated role discovery powered by Claude claude-sonnet-4-20250514</li>
    <li>Resume match scoring (60–95) personalized to your actual skills and experience</li>
    <li>H-1B sponsorship filter — only includes known H-1B-sponsoring employers</li>
    <li>Application tracker: status, notes, date applied, job link per role</li>
    <li>Vercel cron job refreshes role list every 6 hours automatically</li>
  </ul>

  <h4>Technologies Used:</h4>
  {/* Use your existing tech tag components */}
  <span>Next.js</span>
  <span>TypeScript</span>
  <span>React</span>
  <span>Anthropic Claude API</span>
  <span>Vercel</span>
  <span>Vercel Cron</span>
  <span>CSS Modules</span>

  <a href="https://github.com/hemu-codes/job-tracker" target="_blank" rel="noopener noreferrer">
    View on GitHub →
  </a>
  <a href="YOUR_LIVE_URL" target="_blank" rel="noopener noreferrer">
    Live Demo →
  </a>
</div>
*/
