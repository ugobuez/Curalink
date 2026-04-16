import { hasBiomedicalIntent, normalizeQuery } from "./queryValidationService.js";

async function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkLocalLLMHealth() {
  try {
    const response = await fetchWithTimeout("http://localhost:11434/api/tags", { method: "GET" }, 3000);
    return response.ok;
  } catch {
    return false;
  }
}

function safeJson(data) {
  return JSON.stringify(data, null, 2);
}

function trimText(value, max = 300) {
  const cleaned = (value || "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 3)}...`;
}

function compactPublications(publications = []) {
  return publications.slice(0, 5).map((item) => ({
    title: item.title || "Untitled publication",
    summary: trimText(item.summary || item.abstract || ""),
    year: item.metadata?.year || (item.publishedAt ? new Date(item.publishedAt).getUTCFullYear() : null)
  }));
}

const TRIAL_RELEVANCE_STOP = new Set([
  "what",
  "how",
  "does",
  "did",
  "the",
  "and",
  "for",
  "with",
  "are",
  "is",
  "was",
  "were",
  "have",
  "has",
  "any",
  "new",
  "recent",
  "options",
  "option",
  "best",
  "latest",
  "review",
  "overview",
  "tell",
  "about",
  "explain",
  "describe",
  "will",
  "can",
  "could",
  "should",
  "may",
  "might",
  "use",
  "using",
  "used",
  "type",
  "some",
  "more",
  "most",
  "such",
  "than",
  "from",
  "into",
  "that",
  "this",
  "these",
  "those"
]);

const SHORT_MEDICAL_TOKENS = new Set([
  "hiv",
  "aids",
  "tb",
  "ms",
  "als",
  "hpv",
  "hbv",
  "hcv",
  "uti",
  "std",
  "sti",
  "adhd",
  "ptsd",
  "copd",
  "mrsa"
]);

function mergeRelevanceTokens(query, disease, extraTokens = []) {
  const text = `${query || ""} ${disease || ""} ${(extraTokens || []).join(" ")}`.toLowerCase();
  const raw = text
    .replace(/[^a-z0-9\s/-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const out = new Set();
  for (const t of raw) {
    if (TRIAL_RELEVANCE_STOP.has(t) || /^\d+$/.test(t)) continue;
    if (SHORT_MEDICAL_TOKENS.has(t)) {
      out.add(t);
      continue;
    }
    if (t.length >= 3) out.add(t);
  }
  return Array.from(out);
}

function trialMatchScore(trial, tokens) {
  if (!tokens.length) return 0;
  const conditions = (trial.metadata?.conditions || []).join(" ").toLowerCase();
  const haystack = `${trial.title || ""} ${trial.summary || ""} ${conditions}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
  let score = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) score += 1;
  }
  return score;
}

function publicationMatchScore(item, tokens) {
  if (!tokens.length) return 0;
  const haystack = `${item.title || ""} ${item.summary || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
  let score = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) score += 1;
  }
  return score;
}

/**
 * Keep publications whose title/summary overlap the detected disease / query tokens.
 * If no tokens could be derived, returns the input slice (retrieval order preserved).
 */
export function filterRelevantPublications(publications = [], query, disease, extraTokens = [], limit = 8) {
  const tokens = mergeRelevanceTokens(query, disease, extraTokens);
  if (!tokens.length) return publications.slice(0, limit);
  const scored = publications
    .map((pub) => ({ pub, score: publicationMatchScore(pub, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return [];
  return scored.map((x) => x.pub).slice(0, limit);
}

/** Keep trials whose title/summary/conditions overlap query + disease; drop unrelated hits. */
export function filterRelevantTrials(trials = [], query, disease, extraTokens = []) {
  const tokens = mergeRelevanceTokens(query, disease, extraTokens);
  if (!tokens.length) return trials.slice(0, 3);
  const scored = trials
    .map((trial) => ({ trial, score: trialMatchScore(trial, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((x) => x.trial).slice(0, 3);
}

function compactTrials(trials = []) {
  return trials.slice(0, 3).map((item) => ({
    title: item.title || "Untitled trial",
    summary: trimText(item.summary || ""),
    year: item.metadata?.year || (item.publishedAt ? new Date(item.publishedAt).getUTCFullYear() : null)
  }));
}

function buildStructuredPrompt({ query, disease, publications, trials }) {
  const diseaseLine = (disease || "").trim();

  return `You are an advanced biomedical research assistant.

Answer the user's question directly using the research data below. Do not answer a different question.

User Question:
${query}

Detected disease / topic (from the query):
${diseaseLine || "[infer only from the user question]"}

Research Data (may be partial; do not invent citations):

Publications:
${publications}

Clinical Trials:
${trials}

Instructions:
- Start with a direct answer to the user question (no preamble, no "I will…", no "this assistant/chatbot").
- Base claims on the publications and trials provided. If a section has no matching items, write "None listed in retrieved data" for that part only.
- For conditions without a true cure (e.g. many chronic viral illnesses), explain long-term management, standard-of-care, and prevention—do not promise a cure unless the provided evidence supports it.
- Omit unrelated studies; do not discuss diseases not tied to the detected topic.
- Use clear, accurate medical reasoning.

Return structured output exactly:

1. Condition Overview (brief)
2. Treatment / Key Effects (clear, practical)
3. Research Insights (from publications only)
4. Clinical Trials (only those relevant to the topic; otherwise state none)
5. Key Takeaway (1–2 lines)

Write like a clinician-educator, not generic support text.`;
}

function isValidAnswer(value) {
  return typeof value === "string" && value.trim().length > 0;
}

async function callOllama(prompt) {
  try {
    console.log("[LLM] Sending prompt to Ollama (phi) at http://localhost:11434");
    const response = await fetchWithTimeout(
      "http://localhost:11434/api/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "phi",
          prompt,
          stream: false
        })
      },
      60000
    );

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log("LLM RAW:", data);
    return data;
  } catch (error) {
    console.error("[LLM] Ollama call error:", error.message);
    throw error;
  }
}

export async function generateStructuredResponse({ query, disease, topPublications, topTrials }) {
  const normalizedQuery = normalizeQuery(query);
  const publications = topPublications || [];
  const trials = topTrials || [];

  if (!normalizedQuery || !hasBiomedicalIntent(normalizedQuery)) {
    return {
      answer: "INVALID_QUERY",
      publications: [],
      trials: []
    };
  }

  const localLLMAvailable = await checkLocalLLMHealth();
  if (!localLLMAvailable) {
    console.log("[LLM] Ollama unavailable at http://localhost:11434");
    return {
      answer: null,
      publications,
      trials,
      localLLMAvailable: false
    };
  }

  const shortPublications = compactPublications(publications);
  const shortTrials = compactTrials(trials);
  const prompt = buildStructuredPrompt({
    query: normalizedQuery,
    disease: (disease || "").trim(),
    publications: safeJson(shortPublications),
    trials: safeJson(shortTrials)
  });

  try {
    const firstAttempt = await callOllama(prompt);
    let answer = firstAttempt?.response;

    if (!isValidAnswer(answer)) {
      console.log("[LLM] Empty response received; retrying once.");
      const secondAttempt = await callOllama(prompt);
      answer = secondAttempt?.response;
    }

    if (!isValidAnswer(answer)) {
      return {
        answer: null,
        publications,
        trials,
        localLLMAvailable: true
      };
    }

    return {
      answer: answer.trim(),
      publications,
      trials,
      localLLMAvailable: true
    };
  } catch (error) {
    console.error("[LLM] Structured generation failed:", error.message);
    return {
      answer: null,
      publications,
      trials,
      localLLMAvailable: false
    };
  }
}

export async function generateGeneralMedicalFallback({ query, disease }) {
  const localLLMAvailable = await checkLocalLLMHealth();
  if (!localLLMAvailable) {
    return null;
  }

  const prompt = `You are an advanced biomedical research assistant.

Answer the user's question directly. No preamble. Do NOT describe what you will do. Do NOT say "this chatbot".

User Question:
${query}

Detected disease / topic:
${(disease || "").trim() || "[infer only from the user question]"}

No publication list was retrieved for this query. Give a careful, expert-style overview using established medical knowledge. Do not invent study titles or trial IDs. For conditions without a cure, describe management honestly.

Return structured output:

1. Condition Overview (brief)
2. Treatment / Key Effects (clear, practical)
3. Research Insights (general evidence themes; do not invent specific papers)
4. Clinical Trials (state "None retrieved" if none apply)
5. Key Takeaway (1–2 lines)

Sound like a medical expert, not a chatbot.`;

  try {
    const firstAttempt = await callOllama(prompt);
    let answer = firstAttempt?.response;

    if (!isValidAnswer(answer)) {
      console.log("[LLM] Empty fallback response; retrying once.");
      const secondAttempt = await callOllama(prompt);
      answer = secondAttempt?.response;
    }

    return isValidAnswer(answer) ? answer.trim() : null;
  } catch (error) {
    console.error("[LLM] Fallback generation failed:", error.message);
    return null;
  }
}
