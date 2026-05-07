export function MessageSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 w-full">
          <div className="h-4 w-2/3 rounded bg-zinc-200" />
          <div className="h-3 w-1/3 rounded bg-zinc-100" />
        </div>
        <div className="h-6 w-16 rounded-full bg-zinc-200" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-zinc-100" />
        <div className="h-3 w-5/6 rounded bg-zinc-100" />
        <div className="h-3 w-2/3 rounded bg-zinc-100" />
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div className="h-3 w-24 rounded bg-zinc-100" />
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded-lg bg-zinc-200" />
          <div className="h-8 w-16 rounded-lg bg-zinc-200" />
        </div>
      </div>
    </div>
  );
}
