export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-label="Memuat">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
    </div>
  );
}
