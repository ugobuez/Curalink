export default function MessageThread({ messages }) {
  return (
    <div className="space-y-3">
      {messages.map((message, index) => (
        <div
          key={`${message.role}-${index}`}
          className={`rounded-lg px-4 py-3 text-sm ${
            message.role === "user"
              ? "ml-auto max-w-[85%] bg-cyan-500 text-slate-950"
              : "mr-auto max-w-[85%] bg-slate-800 text-slate-100"
          }`}
        >
          <p className="font-semibold capitalize">{message.role}</p>
          <p className="mt-1 whitespace-pre-line">{message.content}</p>
        </div>
      ))}
    </div>
  );
}
