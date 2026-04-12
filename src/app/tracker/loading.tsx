export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-islamic-blue mx-auto mb-4"></div>
        <p className="text-slate-600">Loading your tracker...</p>
      </div>
    </div>
  );
}
