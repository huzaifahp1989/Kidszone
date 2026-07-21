export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f0fdfa] animate-pulse">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="h-24 rounded-2xl bg-violet-100 mx-auto max-w-md" />
        <div className="h-32 rounded-2xl bg-white border border-violet-100" />
        <div className="h-96 rounded-2xl bg-white border border-violet-100" />
      </div>
    </div>
  );
}
