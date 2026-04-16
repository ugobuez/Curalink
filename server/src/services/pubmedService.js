import { SOURCES, RESPONSE_TYPES } from "@curalink/shared";

async function fetchJson(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`PubMed request failed with status ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function extractSummaryFromAbstract(abstractText = "") {
  if (!abstractText) return "";
  const collapsed = abstractText.replace(/\s+/g, " ").trim();
  if (collapsed.length <= 320) return collapsed;
  return `${collapsed.slice(0, 317)}...`;
}

export async function searchPubMed(query, limit = 8) {
  if (!query) return [];

  try {
    const searchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
    searchUrl.searchParams.set("db", "pubmed");
    searchUrl.searchParams.set("retmode", "json");
    searchUrl.searchParams.set("sort", "relevance");
    searchUrl.searchParams.set("retmax", String(limit));
    searchUrl.searchParams.set("term", query);

    const searchData = await fetchJson(searchUrl.toString());
    const ids = searchData?.esearchresult?.idlist || [];
    if (!ids.length) return [];

    const summaryUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi");
    summaryUrl.searchParams.set("db", "pubmed");
    summaryUrl.searchParams.set("retmode", "json");
    summaryUrl.searchParams.set("id", ids.join(","));
    const summaries = await fetchJson(summaryUrl.toString());
    const records = summaries?.result || {};

    return ids
      .map((id) => {
        const record = records[id];
        if (!record) return null;

        const publicationDate = record.pubdate || record.sortpubdate || null;
        return {
          type: RESPONSE_TYPES.PUBLICATION,
          source: SOURCES.PUBMED,
          title: record.title || "Untitled PubMed Record",
          summary:
            extractSummaryFromAbstract(record.elocationid || "") ||
            (record.authors?.length
              ? `Authors: ${record.authors.slice(0, 4).map((author) => author.name).join(", ")}`
              : "No abstract summary available."),
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          publishedAt: publicationDate ? new Date(publicationDate).toISOString() : null,
          metadata: {
            pmid: id,
            journal: record.fulljournalname || record.source || null,
            year: publicationDate ? new Date(publicationDate).getUTCFullYear() : null,
            authors: record.authors?.slice(0, 6).map((author) => author.name) || []
          }
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error("PubMed fetch error:", error.message);
    return [];
  }
}
