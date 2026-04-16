import { Conversation } from "../models/Conversation.js";
import { searchPubMed } from "../services/pubmedService.js";
import { searchOpenAlex } from "../services/openAlexService.js";
import { searchClinicalTrials } from "../services/clinicalTrialsService.js";
import { expandQuery, rankResults } from "../services/rankingService.js";
import {
  checkLocalLLMHealth,
  filterRelevantPublications,
  filterRelevantTrials,
  generateGeneralMedicalFallback,
  generateStructuredResponse
} from "../services/llmService.js";
import { extractDetectedDisease } from "../services/diseaseContextService.js";
import {
  correctBiomedicalSpelling,
  hasBiomedicalIntent,
  isGreetingQuery,
  normalizeQuery
} from "../services/queryValidationService.js";

export async function researchQueryController(req, res) {
  const { query, conversationId, userId } = req.body;
  const normalizedQuery = normalizeQuery(query);
  const correctedQuery = correctBiomedicalSpelling(normalizedQuery);

  if (!correctedQuery) {
    return res.status(400).json({ error: "query is required" });
  }

  if (isGreetingQuery(correctedQuery)) {
    return res.status(200).json({
      conversationId,
      expandedTerms: [],
      response: {
        answer: "Hi there! Please ask a biomedical research question to get started.",
        publications: [],
        trials: [],
        clinicalTrials: []
      },
      answer: "Hi there! Please ask a biomedical research question to get started.",
      publications: [],
      trials: []
    });
  }

  if (!hasBiomedicalIntent(correctedQuery)) {
    return res.status(200).json({
      conversationId,
      expandedTerms: [],
      response: {
        answer: "Please enter a valid biomedical research question.",
        publications: [],
        trials: [],
        clinicalTrials: []
      },
      answer: "Please enter a valid biomedical research question.",
      publications: [],
      trials: []
    });
  }

  const detected = extractDetectedDisease(correctedQuery);
  const diseaseLabel = (detected.label || detected.searchTerms || "").trim();
  const searchPivot = (detected.searchTerms || correctedQuery).trim();

  const expandedTerms = expandQuery(correctedQuery);
  const expandedQuery = Array.from(new Set([correctedQuery, searchPivot, ...expandedTerms])).join(" ");
  const localLLMAvailable = await checkLocalLLMHealth();

  const [pubmedSet, openAlexSet, clinicalTrialSet] = await Promise.allSettled([
    searchPubMed(expandedQuery, 12),
    searchOpenAlex(expandedQuery, 12),
    searchClinicalTrials(searchPivot, 12)
  ]);

  const pubmedResults = pubmedSet.status === "fulfilled" ? pubmedSet.value : [];
  const openAlexResults = openAlexSet.status === "fulfilled" ? openAlexSet.value : [];
  const clinicalTrialResults = clinicalTrialSet.status === "fulfilled" ? clinicalTrialSet.value : [];

  const merged = [...pubmedResults, ...openAlexResults, ...clinicalTrialResults];
  const rankedResults = rankResults(merged, correctedQuery, expandedTerms, 12);
  const publicationsRanked = rankedResults.filter((item) => item.type === "publication");
  const trialsRaw = rankedResults.filter((item) => item.type === "trial");

  const publications = filterRelevantPublications(
    publicationsRanked,
    correctedQuery,
    diseaseLabel,
    detected.tokens,
    8
  );
  const trials = filterRelevantTrials(trialsRaw, correctedQuery, diseaseLabel, detected.tokens);

  if (!merged.length && !localLLMAvailable) {
    return res.status(503).json({
      conversationId,
      expandedTerms,
      response: {
        answer: "Local LLM unavailable and retrieval services failed. Please try again shortly.",
        publications: [],
        trials: [],
        clinicalTrials: []
      },
      answer: "Local LLM unavailable and retrieval services failed. Please try again shortly.",
      publications: [],
      trials: []
    });
  }

  let conversation =
    (conversationId && (await Conversation.findById(conversationId))) ||
    new Conversation({ userId, messages: [] });

  const structured = await generateStructuredResponse({
    query: correctedQuery,
    disease: diseaseLabel,
    topPublications: publications,
    topTrials: trials
  });

  let answer = structured.answer;
  if (!answer) {
    answer =
      (await generateGeneralMedicalFallback({
        query: correctedQuery,
        disease: diseaseLabel
      })) ||
      `Review the retrieved sources below. The AI summary is unavailable (check that Ollama is running at http://localhost:11434).`;
  }

  const responsePayload = {
    answer,
    publications,
    trials,
    clinicalTrials: trials
  };

  conversation.messages.push({ role: "user", content: correctedQuery });
  conversation.messages.push({
    role: "assistant",
    content: responsePayload.answer,
    structuredResponse: responsePayload
  });

  await conversation.save();

  return res.status(200).json({
    conversationId: conversation.id,
    expandedTerms,
    detectedDisease: diseaseLabel || null,
    response: responsePayload,
    answer: responsePayload.answer,
    publications: responsePayload.publications,
    trials: responsePayload.trials
  });
}
