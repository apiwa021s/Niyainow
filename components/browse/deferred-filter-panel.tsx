"use client";

import dynamic from "next/dynamic";

import type { GenreFacet } from "@/services/novel-service";
import type { NovelQuery } from "@/types/novel-query";

const FilterPanel = dynamic(
  () => import("@/components/browse/filter-panel").then((module) => module.FilterPanel),
  { loading: () => <FilterPanelSkeleton /> },
);

export function FilterPanelSkeleton() {
  return (
    <div aria-hidden className="grid gap-4 py-1">
      <div className="skeleton h-11 w-full rounded-[6px]" />
      <div className="skeleton h-24 w-full rounded-[6px]" />
      <div className="skeleton h-24 w-full rounded-[6px]" />
    </div>
  );
}

/** Loaded only for a visible desktop rail or after the filter dialog opens. */
export function DeferredFilterPanel({
  query,
  genres,
  hideGenres,
  compact,
  onChange,
}: {
  query: NovelQuery;
  genres: GenreFacet[];
  hideGenres?: boolean;
  compact?: boolean;
  onChange: (next: NovelQuery) => void;
}) {
  return (
    <FilterPanel
      query={query}
      genres={genres}
      hideGenres={hideGenres}
      compact={compact}
      onChange={onChange}
    />
  );
}
