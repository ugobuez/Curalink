const QUERY_SYNONYMS = {
  cancer: ["oncology", "tumor", "neoplasm"],
  diabetes: ["glycemic", "insulin", "hyperglycemia"],
  alzheimer: ["dementia", "cognitive decline", "amyloid"],
  hypertension: ["high blood pressure", "cardiovascular", "bp"],
  obesity: ["body mass index", "metabolic syndrome", "weight loss"],
  asthma: ["airway inflammation", "bronchodilator", "respiratory"],
  covid: ["sars-cov-2", "coronavirus", "long covid"],
  stroke: ["cerebrovascular", "ischemic", "neurologic deficit"],
  hiv: ["aids", "antiretroviral", "antiretrovirals", "immunodeficiency", "art", "arv"]
};

const SOURCE_CREDIBILITY = {
  pubmed: 1,
  openalex: 0.8,
  clinical_trials: 0.95
};

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "for",
  "to",
  "in",
  "on",
  "with",
  "about",
  "how",
  "what",
  "why",
  "is",
  "are",
  "does",
  "can"
]);

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !STOP_WORDS.has(token));
}

function getRecencyScore(publishedAt) {
  if (!publishedAt) return 0.25;
  const publishedDate = new Date(publishedAt);
  if (Number.isNaN(publishedDate.getTime())) return 0.25;

  const ageInYears = (Date.now() - publishedDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (ageInYears <= 1) return 1;
  if (ageInYears <= 3) return 0.85;
  if (ageInYears <= 5) return 0.65;
  if (ageInYears <= 10) return 0.45;
  return 0.25;
}

function getCredibilityScore(item) {
  const sourceScore = SOURCE_CREDIBILITY[item.source] ?? 0.5;
  const citations = Number(item.metadata?.citations) || 0;
  const citationBoost = Math.min(citations / 1000, 0.2);
  return Math.min(sourceScore + citationBoost, 1);
}

function getRelevanceScore(item, query, expandedTerms) {
  const queryTokens = new Set(tokenize(query));
  const expansionTokens = new Set(tokenize(expandedTerms.join(" ")));
  const haystack = `${item.title || ""} ${item.summary || ""}`.toLowerCase();
  const titleHaystack = `${item.title || ""}`.toLowerCase();

  let score = 0;
  for (const token of queryTokens) {
    if (titleHaystack.includes(token)) score += 3;
    else if (haystack.includes(token)) score += 1.5;
  }
  for (const token of expansionTokens) {
    if (titleHaystack.includes(token)) score += 1.2;
    else if (haystack.includes(token)) score += 0.6;
  }
  if (query && haystack.includes(query.toLowerCase())) {
    score += 3;
  }
  return Math.min(score / 15, 1);
}

function dedupeResults(results) {
  const seen = new Set();
  return results.filter((item) => {
    const fingerprint = `${item.type}:${item.url || ""}:${(item.title || "").toLowerCase()}`;
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
}

export function expandQuery(query) {
  const baseTokens = tokenize(query);
  const expanded = new Set(baseTokens);
  for (const token of baseTokens) {
    const synonyms = QUERY_SYNONYMS[token] || [];
    synonyms.forEach((synonym) => expanded.add(synonym.toLowerCase()));
  }
  return Array.from(expanded);
}

export function rankResults(results, query, expandedTerms, limit = 8) {
  const ranked = dedupeResults(results)
    .map((item) => {
      const relevance = getRelevanceScore(item, query, expandedTerms);
      const recency = getRecencyScore(item.publishedAt);
      const credibility = getCredibilityScore(item);
      const rankingScore = relevance * 0.55 + recency * 0.2 + credibility * 0.25;

      return {
        ...item,
        ranking: {
          relevance,
          recency,
          credibility,
          score: Number(rankingScore.toFixed(4))
        }
      };
    })
    .sort((a, b) => b.ranking.score - a.ranking.score);

  const cap = Math.min(Math.max(limit, 6), 16);
  return ranked.slice(0, cap);
}
