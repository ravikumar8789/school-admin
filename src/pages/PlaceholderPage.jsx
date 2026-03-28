export function PlaceholderPage({ title }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-2 text-sm">This module will be implemented in the next phase.</p>
    </div>
  );
}
