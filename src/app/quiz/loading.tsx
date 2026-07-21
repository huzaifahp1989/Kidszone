export default function Loading() {
  return (
    <div className="page-inner animate-pulse space-y-6">
      <div className="h-32 rounded-3xl bg-violet-100" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-24 rounded-2xl bg-slate-100" />
        <div className="h-24 rounded-2xl bg-slate-100" />
      </div>
      <div className="h-64 rounded-2xl bg-slate-100" />
    </div>
  );
}
