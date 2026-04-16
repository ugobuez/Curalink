const GREETING_PHRASES = new Set([
  "hi",
  "hello",
  "hey",
  "good morning",
  "good afternoon",
  "good evening"
]);

const BIOMEDICAL_KEYWORDS = [
  "health",
  "medical",
  "medicine",
  "biomedical",
  "biology",
  "disease",
  "disorder",
  "syndrome",
  "symptom",
  "diagnosis",
  "drug",
  "medication",
  "treatment",
  "therapy",
  "clinical",
  "trial",
  "patient",
  "hospital",
  "doctor",
  "infection",
  "virus",
  "bacteria",
  "cancer",
  "tumor",
  "gene",
  "genetic",
  "protein",
  "vaccine",
  "immune",
  "pathology",
  "bite",
  "bed bug",
  "rash",
  "itch",
  "pain",
  "fever",
  "swelling",
  "inflammation",
  "wound",
  "allergy",
  "parasite"
];

const BIOMEDICAL_ACTION_WORDS = [
  "treat",
  "treatment",
  "treating",
  "manage",
  "prevent",
  "preventing",
  "cure",
  "curing",
  "diagnose",
  "diagnosis",
  "therapy"
];

const BIOMEDICAL_SUBJECT_WORDS = [
  "bite",
  "bug",
  "bed bug",
  "cancer",
  "diabetes",
  "malaria",
  "disease",
  "infection",
  "symptom",
  "rash",
  "pain",
  "fever",
  "hiv",
  "aids",
  "hepatitis",
  "tuberculosis",
  "pneumonia",
  "covid",
  "stroke",
  "asthma",
  "arthritis",
  "depression",
  "anxiety"
];

/** Matches common conditions, pathogens, and medical shorthand (e.g. HIV, TB) so short queries still qualify. */
const MEDICAL_ENTITY_OR_TOPIC =
  /\b(hiv|aids|hiv\/aids|hbv|hcv|hpv|tb|copd|ms|als|adhd|ptsd|std|sti|uti|mrsa|covid(?:-19)?|sars-cov-2|cancer|diabetes|tuberculosis|hepatitis|pneumonia|malaria|stroke|asthma|arthritis|lupus|fibromyalgia|endometriosis|psoriasis|crohn|colitis|anemia|leukemia|lymphoma|sepsis|migraine|epilepsy|autism|dementia|parkinson|alzheimer|schizophrenia|obesity|hypertension|influenza|gonorrhea|chlamydia|syphilis|herpes|ebola|dengue|cholera|zika|virus|bacteria|parasite|tumor|tumour|oncology|cardiac|renal|hepatic|pulmonary)\b/i;

const TYPO_CORRECTIONS = {
  canser: "cancer",
  diabtes: "diabetes",
  maleria: "malaria"
};

export function normalizeQuery(value) {
  return (value || "").trim().replace(/\s+/g, " ");
}

export function correctBiomedicalSpelling(query) {
  const normalized = normalizeQuery(query);
  if (!normalized) return "";

  return normalized
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase();
      return TYPO_CORRECTIONS[lower] || word;
    })
    .join(" ");
}

export function isGreetingQuery(query) {
  const normalized = normalizeQuery(query).toLowerCase();
  if (!normalized) return false;
  if (GREETING_PHRASES.has(normalized)) return true;
  return /^((hi|hello|hey)\W*)+$/.test(normalized);
}

export function hasBiomedicalIntent(query) {
  const normalized = normalizeQuery(query).toLowerCase();
  if (!normalized) return false;
  if (BIOMEDICAL_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return true;
  }

  if (MEDICAL_ENTITY_OR_TOPIC.test(normalized)) {
    return true;
  }

  const tokens = normalized.split(/\s+/);
  const hasBiomedicalAction = BIOMEDICAL_ACTION_WORDS.some((word) => tokens.includes(word));
  const hasBiomedicalSubject = BIOMEDICAL_SUBJECT_WORDS.some((word) => normalized.includes(word));
  return hasBiomedicalAction && hasBiomedicalSubject;
}
