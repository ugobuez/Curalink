import { useState } from "react";
import ChatInput from "./components/ChatInput.jsx";
import MessageThread from "./components/MessageThread.jsx";
import ResponseCards from "./components/ResponseCards.jsx";
import { queryResearch } from "./lib/api.js";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [latestResponse, setLatestResponse] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(query) {
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: query }]);

    try {
      const data = await queryResearch({
        query,
        conversationId,
        userId: "demo-user"
      });

      setConversationId(data.conversationId);
      setLatestResponse(data.response);
      setMessages((prev) => [...prev, { role: "assistant", content: data.response.answer }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: error.message || "Something went wrong while querying research." }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <section className="mx-auto max-w-4xl">
        <header>
          <h1 className="text-3xl font-bold text-cyan-400">Curalink</h1>
          <p className="mt-2 text-slate-400">
            Context-aware biomedical chat with multi-source retrieval and structured cards.
          </p>
        </header>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
          <MessageThread messages={messages} />
          <ResponseCards response={latestResponse} />
          <ChatInput onSubmit={handleSubmit} loading={loading} />
        </div>
      </section>
    </main>
  );
}
