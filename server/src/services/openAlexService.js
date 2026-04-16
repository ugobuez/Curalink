import { SOURCES, RESPONSE_TYPES } from "@curalink/shared";

async function fetchJson(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`OpenAlex request failed with status ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function formatOpenAlexAbstract(invertedIndex) {
  const safeIndex = invertedIndex || {};
  const entries = Object.entries(safeIndex);
  if (!entries.length) return "";

  const tokenPositions = [];
  for (const [word, positions] of entries) {
    for (const position of positions) {
      tokenPositions.push([position, word]);
    }
  }

  tokenPositions.sort((a, b) => a[0] - b[0]);
  const fullText = tokenPositions.map((entry) => entry[1]).join(" ");
  if (fullText.length <= 320) return fullText;
  return `${fullText.slice(0, 317)}...`;
}

export async function searchOpenAlex(query, limit = 8) {
  if (!query) return [];

  try {
    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", query);
    url.searchParams.set("per-page", String(limit));
    url.searchParams.set("sort", "relevance_score:desc");

    const data = await fetchJson(url.toString());
    const works = data?.results || [];

    return works
      .map((work) => ({
        type: RESPONSE_TYPES.PUBLICATION,
        source: SOURCES.OPENALEX,
        title: work.title || "Untitled OpenAlex Work",
        summary:
          formatOpenAlexAbstract(work.abstract_inverted_index) ||
          `Publication type: ${work.type || "unknown"}.`,
        url: work.primary_location?.landing_page_url || work.id || null,
        publishedAt: work.publication_date || null,
        metadata: {
          openAlexId: work.id || null,
          year: work.publication_year || null,
          citations: work.cited_by_count || 0,
          journal: work.primary_location?.source?.display_name || null
        }
      }))
      .filter((item) => item.title && item.url);
  } catch (error) {
    console.error("OpenAlex fetch error:", error.message);
    return [];
  }
}
