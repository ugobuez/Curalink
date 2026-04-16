function SourceCard({ item }) {
  return (
    <article className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-cyan-400">{item.source}</p>
      <h4 className="mt-1 text-sm font-semibold text-white">{item.title}</h4>
      <p className="mt-2 text-sm text-slate-300">{item.summary}</p>
      {item.url && (
        <a href={item.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-cyan-300">
          View source
        </a>
      )}
    </article>
  );
}

export default function ResponseCards({ response }) {
  if (!response) return null;

  return (
    <section className="mt-4 space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Publications</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {response.publications?.map((item, index) => <SourceCard key={`${item.title}-${index}`} item={item} />)}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Clinical Trials</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {response.clinicalTrials?.map((item, index) => <SourceCard key={`${item.title}-${index}`} item={item} />)}
        </div>
      </div>
    </section>
  );
}
