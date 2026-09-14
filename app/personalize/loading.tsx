export default function PersonalizeLoading() {
  return (
    <main id="main" className="mx-auto w-full max-w-(--home-max) animate-pulse px-1.5 py-2 pb-20 sm:px-3 sm:py-3 lg:px-4 lg:pb-8">
      <div className="h-[clamp(330px,48dvh,520px)] rounded-[8px] bg-muted" />
      <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
        <div className="h-24 rounded-[8px] bg-muted" />
        <div className="h-24 rounded-[8px] bg-muted" />
        <div className="h-24 rounded-[8px] bg-muted" />
      </div>
      <div className="mt-8 h-7 w-60 rounded bg-muted" />
      <div className="mt-4 flex gap-3 overflow-hidden">
        {Array.from({ length: 7 }, (_, index) => <div key={index} className="aspect-[2/3] w-36 shrink-0 rounded-[6px] bg-muted" />)}
      </div>
    </main>
  );
}
