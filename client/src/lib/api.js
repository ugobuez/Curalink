const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:6505/api"
).replace(/\/$/, "");

export async function queryResearch(payload) {
  const response = await fetch(`${API_BASE}/research/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Failed to query research service");
  }

  return response.json();
}

export async function getChatHistory(params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE}/chat/history?${query}`);
  if (!response.ok) {
    throw new Error("Failed to fetch chat history");
  }
  return response.json();
}
