import { normalizeQuery } from "./queryValidationService.js";

/** Words removed when inferring the disease / topic phrase from free text. */
const DISEASE_EXTRACTION_STOP = new Set([
  "how",
  "what",
  "why",
  "when",
  "where",
  "who",
  "which",
  "whom",
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "does",
  "do",
  "did",
  "can",
  "could",
  "would",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "to",
  "for",
  "of",
  "in",
  "on",
  "at",
  "by",
  "with",
  "from",
  "about",
  "into",
  "onto",
  "over",
  "after",
  "before",
  "during",
  "than",
  "then",
  "tell",
  "give",
  "get",
  "got",
  "help",
  "please",
  "need",
  "want",
  "know",
  "learn",
  "find",
  "show",
  "explain",
  "describe",
  "like",
  "just",
  "only",
  "also",
  "some",
  "any",
  "all",
  "each",
  "both",
  "such",
  "very",
  "much",
  "more",
  "most",
  "well",
  "still",
  "even",
  "there",
  "here",
  "this",
  "that",
  "these",
  "those",
  "way",
  "ways",
  "best",
  "new",
  "old",
  "long",
  "use",
  "using",
  "used",
  "me",
  "my",
  "we",
  "you",
  "your",
  "i",
  "it",
  "its",
  "if",
  "or",
  "and",
  "but",
  "not",
  "no",
  "yes",
  "so",
  "as",
  "up",
  "out",
  "off",
  "per",
  "via",
  "vs",
  "versus"
]);

/** Optional synonym expansion for matching retrieved text (not shown as user-facing labels). */
const TOKEN_ALIASES = {
  hiv: ["aids", "antiretroviral", "antiretrovirals", "art", "arv"],
  aids: ["hiv", "antiretroviral"],
  tb: ["tuberculosis", "mycobacterium"],
  hepatitis: ["hbv", "hcv", "hep"],
  diabetes: ["diabetic", "glycemic", "insulin", "hyperglycemia"],
  cancer: ["oncology", "tumor", "tumour", "neoplasm", "malignancy"],
  stroke: ["cerebrovascular", "ischemic"]
};

function tokenizePhrase(phrase) {
  return (phrase || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function expandTokens(tokens) {
  const out = new Set();
  for (const t of tokens) {
    out.add(t);
    const aliases = TOKEN_ALIASES[t] || [];
    aliases.forEach((a) => out.add(a));
  }
  return Array.from(out);
}

function formatLabel(phrase) {
  const raw = (phrase || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  const abbrevDisplay = {
    hiv: "HIV",
    aids: "AIDS",
    "hiv/aids": "HIV/AIDS",
    hpv: "HPV",
    hbv: "HBV",
    hcv: "HCV",
    tb: "TB",
    ms: "MS",
    copd: "COPD",
    als: "ALS",
    adhd: "ADHD",
    ptsd: "PTSD",
    std: "STD",
    sti: "STI",
    uti: "UTI",
    mrsa: "MRSA",
    covid: "COVID-19",
    "covid-19": "COVID-19",
    "sars-cov-2": "SARS-CoV-2"
  };
  if (abbrevDisplay[lower]) return abbrevDisplay[lower];

  return raw
    .split(/\s+/)
    .map((word) => {
      const wl = word.toLowerCase();
      if (abbrevDisplay[wl]) return abbrevDisplay[wl];
      if (/^\d+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Infer the main disease / clinical topic from the user query for search and filtering.
 * @returns {{ label: string, tokens: string[], searchTerms: string }}
 */
export function extractDetectedDisease(rawQuery) {
  const normalized = normalizeQuery(rawQuery).replace(/\?+$/g, "").trim();
  const lower = normalized.toLowerCase();
  const empty = { label: "", tokens: [], searchTerms: "" };

  if (!lower) return empty;

  const patterns = [
    /(?:^|\s)(?:how\s+to\s+)?(?:treat|treating|treats|cure|curing|cures|manage|managing|manages|prevent|preventing|prevents|diagnose|diagnosing|diagnoses)\s+(?:a\s+|an\s+|the\s+)?(.+)$/i,
    /(?:^|\s)(?:treatment|therapy|therapies|medication|medications|meds|drug|drugs)\s+(?:for|of)\s+(?:a\s+|an\s+|the\s+)?(.+)$/i,
    /(?:^|\s)(?:symptoms?|signs?|causes?|risks?|effects?)\s+(?:of|for)\s+(?:a\s+|an\s+|the\s+)?(.+)$/i,
    /(?:^|\s)(?:what\s+is|what\s+are|what's|whats)\s+(?:a\s+|an\s+|the\s+)?(.+)$/i,
    /(?:^|\s)(?:living\s+with|dealing\s+with|history\s+of)\s+(?:a\s+|an\s+|the\s+)?(.+)$/i
  ];

  let captured = null;
  for (const p of patterns) {
    const m = lower.match(p);
    if (m?.[1]) {
      captured = m[1].trim();
      break;
    }
  }

  if (!captured) {
    const parts = lower.split(/\s+/).filter((w) => w && !DISEASE_EXTRACTION_STOP.has(w));
    captured = parts.join(" ").trim();
  }

  if (!captured) return empty;

  const coreTokens = tokenizePhrase(captured);
  const tokens = expandTokens(coreTokens);
  const label = formatLabel(captured);

  return {
    label,
    tokens,
    searchTerms: captured
  };
}
