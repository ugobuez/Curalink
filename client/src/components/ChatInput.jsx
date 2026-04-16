import { useState } from "react";

export default function ChatInput({ onSubmit, loading }) {
  const [value, setValue] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const query = value.trim();
    if (!query || loading) return;
    onSubmit(query);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
      <input
        className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
        placeholder="Ask biomedical research question..."
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-cyan-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60"
      >
        {loading ? "Searching..." : "Send"}
      </button>
    </form>
  );
}
