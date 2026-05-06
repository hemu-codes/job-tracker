export const H1B_SPONSORS = new Set([
  "amazon", "microsoft", "google", "apple", "meta", "salesforce", "oracle",
  "ibm", "intel", "qualcomm", "nvidia", "adobe", "servicenow", "workday",
  "splunk", "tableau", "expedia", "zillow", "redfin", "docusign", "zendesk",
  "f5", "concur", "smartsheet", "avalara", "icertis", "convoy", "outreach",
  "highspot", "remitly", "accolade", "epic systems", "athenahealth", "cerner",
  "allscripts", "philips", "ge healthcare", "siemens healthineers", "optum",
  "teladoc", "livongo", "cedar", "health catalyst", "veeva systems", "iqvia",
  "mckesson", "cardinal health", "kaiser permanente", "providence", "swedish",
  "uwmedicine", "genentech", "amgen", "gilead", "biogen", "regeneron",
  "moderna", "pfizer", "illumina", "adaptive biotechnologies", "seagen",
  "sana biotechnology", "benchling", "labcorp", "quest diagnostics",
  "stripe", "affirm", "plaid", "chime", "robinhood", "coinbase", "visa",
  "mastercard", "american express", "jpmorgan", "goldman sachs", "capital one",
  "ally financial", "sofi", "brex", "marqeta", "adyen", "paypal", "square",
  "intuit", "blend", "opendoor", "trading technologies", "two sigma", "citadel",
  "boeing", "spacex", "blue origin", "lockheed martin", "raytheon",
  "northrop grumman", "general dynamics", "l3harris", "bae systems",
  "honeywell", "ball aerospace", "planet labs", "spire global", "maxar",
  "rocket lab", "joby aviation", "ups", "fedex", "dhl", "maersk", "flexport",
  "project44", "c.h. robinson", "xpo logistics", "samsara", "blue yonder",
  "manhattan associates", "e2open", "tesla", "sunpower", "enphase", "sunrun",
  "bloom energy", "puget sound energy", "nextera energy", "siemens energy",
  "ge renewable", "pattern energy", "invenergy", "lemonade", "root insurance",
  "hippo", "progressive", "allstate", "state farm", "liberty mutual",
  "travelers", "nationwide", "hartford", "chubb", "aig", "zurich",
  "willis towers watson", "aon", "marsh", "shopify", "bigcommerce",
  "target", "walmart", "costco", "nordstrom", "nike", "starbucks",
  "albertsons", "kroger", "coursera", "udemy", "duolingo", "chegg",
  "instructure", "powerschool", "blackboard", "pearson", "2u",
  "microsoft gaming", "xbox", "activision blizzard", "electronic arts",
  "nintendo", "epic games", "unity", "roblox", "zynga", "bungie", "valve",
  "riot games", "ubisoft", "take-two", "clio", "relativity", "everlaw",
  "lexisnexis", "thomson reuters", "wolters kluwer", "ironclad",
  "palantir", "leidos", "booz allen hamilton", "saic", "mantech", "maximus",
  "tyler technologies", "ptc", "siemens plm", "autodesk", "ansys",
  "zebra technologies", "rockwell automation", "abb", "3m", "john deere",
  "trimble", "climate corporation", "syngenta", "bayer", "corteva",
  "tata consultancy", "infosys", "wipro", "hcl", "cognizant", "capgemini",
  "accenture", "deloitte", "pwc", "kpmg", "mckinsey",
]);

export function isLikelyH1bSponsor(companyName: string): boolean {
  if (!companyName) return false;
  const normalized = companyName.toLowerCase().trim();
  for (const sponsor of H1B_SPONSORS) {
    if (
      normalized.includes(sponsor) ||
      sponsor.includes(normalized) ||
      normalized.replace(/[^a-z0-9]/g, "").includes(sponsor.replace(/[^a-z0-9]/g, ""))
    ) {
      return true;
    }
  }
  return false;
}
