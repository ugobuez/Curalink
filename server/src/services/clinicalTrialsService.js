import { SOURCES, RESPONSE_TYPES } from "@curalink/shared";

async function fetchJson(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`ClinicalTrials request failed with status ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function searchClinicalTrials(query, limit = 8) {
  if (!query) return [];

  try {
    const url = new URL("https://clinicaltrials.gov/api/v2/studies");
    url.searchParams.set("query.term", query);
    url.searchParams.set("pageSize", String(limit));

    const data = await fetchJson(url.toString());
    const studies = data?.studies || [];

    return studies
      .map((study) => {
        const protocol = study.protocolSection || {};
        const identification = protocol.identificationModule || {};
        const statusModule = protocol.statusModule || {};
        const conditions = protocol.conditionsModule?.conditions || [];
        const design = protocol.designModule || {};
        const armGroups = protocol.armsInterventionsModule?.armGroups || [];
        const trialId = identification.nctId;

        return {
          type: RESPONSE_TYPES.TRIAL,
          source: SOURCES.CLINICAL_TRIALS,
          title: identification.briefTitle || identification.officialTitle || "Untitled Trial",
          summary:
            protocol.descriptionModule?.briefSummary ||
            `Condition focus: ${conditions.slice(0, 3).join(", ") || "Not specified"}.`,
          url: trialId ? `https://clinicaltrials.gov/study/${trialId}` : "https://clinicaltrials.gov/",
          publishedAt: statusModule.lastUpdatePostDateStruct?.date || statusModule.studyFirstPostDateStruct?.date || null,
          metadata: {
            nctId: trialId || null,
            status: statusModule.overallStatus || null,
            phase: (design.phases || []).join(", ") || null,
            conditions: conditions.slice(0, 5),
            arms: armGroups.length
          }
        };
      })
      .filter((item) => item.title);
  } catch (error) {
    console.error("ClinicalTrials fetch error:", error.message);
    return [];
  }
}
