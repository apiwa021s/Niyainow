export default function PersonalizeLoading() {
  return (
    <main id="main" className="mx-auto w-full max-w-(--home-max) animate-pulse px-3 py-4 pb-24 sm:px-4 lg:px-5 lg:pb-8">
      <div className="h-[clamp(330px,48dvh,520px)] rounded-(--r-xl) bg-muted" />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="h-24 rounded-(--r-lg) bg-muted" />
        <div className="h-24 rounded-(--r-lg) bg-muted" />
        <div className="h-24 rounded-(--r-lg) bg-muted" />
      </div>
      <div className="mt-8 h-7 w-60 rounded bg-muted" />
      <div className="mt-4 flex gap-3 overflow-hidden">
        {Array.from({ length: 7 }, (_, index) => <div key={index} className="aspect-[2/3] w-36 shrink-0 rounded-(--r-md) bg-muted" />)}
      </div>
    </main>
  );
}
