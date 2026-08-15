export type SearchSuggestion = {
  kind?: "novel" | "author" | "translator" | "genre" | "tag";
  label: string;
  meta: string;
  href: string;
};

export type SearchSuggestionGroupKind = "novels" | "authors" | "translators" | "genres" | "tags";

export type GroupedSearchSuggestion = {
  kind: SearchSuggestionGroupKind;
  items: Array<{ option: SearchSuggestion; index: number }>;
};

const SEARCH_SUGGESTION_GROUP_ORDER: readonly SearchSuggestionGroupKind[] = [
  "novels",
  "authors",
  "translators",
  "genres",
  "tags",
];

function kindOf(suggestion: SearchSuggestion): SearchSuggestionGroupKind {
  if (suggestion.kind === "author") return "authors";
  if (suggestion.kind === "translator") return "translators";
  if (suggestion.kind === "genre" || suggestion.href.startsWith("/genre/")) return "genres";
  if (suggestion.kind === "tag" || suggestion.href.startsWith("/tag/")) return "tags";
  return "novels";
}

/**
 * Produces the exact visible order used by the grouped listbox. The index is
 * assigned after grouping so keyboard navigation and aria-activedescendant can
 * address the same option that is rendered at that position in the DOM.
 */
export function groupSearchSuggestions(options: readonly SearchSuggestion[]) {
  let visibleIndex = 0;

  return SEARCH_SUGGESTION_GROUP_ORDER.flatMap<GroupedSearchSuggestion>((kind) => {
    const items = options
      .filter((option) => kindOf(option) === kind)
      .map((option) => ({ option, index: visibleIndex++ }));

    return items.length ? [{ kind, items }] : [];
  });
}

export function flattenGroupedSearchSuggestions(groups: readonly GroupedSearchSuggestion[]) {
  return groups.flatMap((group) => group.items.map(({ option }) => option));
}
