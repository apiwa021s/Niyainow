import {
  Compass,
  Cpu,
  Flame,
  Ghost,
  GraduationCap,
  type LucideIcon,
  Rocket,
  Search,
  Smile,
  Sword,
  Swords,
  Heart,
  Skull,
  Dumbbell,
} from "lucide-react";
import Link from "next/link";

import type { Genre } from "@/types/novel";

const GENRE_STYLE: Record<string, { icon: LucideIcon; gradient: string }> = {
  romance: { icon: Heart, gradient: "from-rose-400 to-pink-600" },
  fantasy: { icon: Sword, gradient: "from-violet-400 to-purple-600" },
  action: { icon: Swords, gradient: "from-red-400 to-orange-600" },
  system: { icon: Cpu, gradient: "from-sky-400 to-blue-600" },
  apocalypse: { icon: Skull, gradient: "from-zinc-400 to-slate-700" },
  xianxia: { icon: Flame, gradient: "from-amber-400 to-orange-600" },
  wuxia: { icon: Sword, gradient: "from-amber-400 to-red-600" },
  adventure: { icon: Compass, gradient: "from-teal-400 to-emerald-600" },
  comedy: { icon: Smile, gradient: "from-yellow-400 to-amber-500" },
  mystery: { icon: Search, gradient: "from-indigo-400 to-indigo-700" },
  horror: { icon: Ghost, gradient: "from-slate-500 to-zinc-800" },
  "sci-fi": { icon: Rocket, gradient: "from-sky-400 to-cyan-600" },
  "school-life": { icon: GraduationCap, gradient: "from-emerald-400 to-green-600" },
  "martial-arts": { icon: Dumbbell, gradient: "from-orange-400 to-red-600" },
};

const DEFAULT_STYLE = { icon: Flame, gradient: "from-[var(--brand-primary)] to-fuchsia-600" };

function styleFor(slug: string) {
  return GENRE_STYLE[slug] ?? DEFAULT_STYLE;
}

/** Colorful genre tiles — each genre gets a distinct lucide icon + gradient (no emoji glyphs). */
export function CategoryIconRail({ items, title }: { items: { genre: Genre; covers: string[] }[]; title?: string }) {
  if (!items.length) return null;
  return (
    <nav aria-label={title ?? "เลือกตามแนวนิยาย"} className="grid gap-2">
      {title ? <p className="text-sm font-semibold text-(--text-secondary)">{title}</p> : null}
      <div className="rail-scroll -mx-1 flex gap-3 px-1">
        {items.map(({ genre }) => {
          const { icon: Icon, gradient } = styleFor(genre.slug);
          return (
            <Link
              key={genre.slug}
              href={`/genre/${genre.slug}`}
              className="group flex w-20 shrink-0 flex-col items-center gap-1.5 sm:w-24"
            >
              <span
                aria-hidden
                className={`grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-br text-white shadow-sm transition-transform group-hover:scale-105 sm:h-16 sm:w-16 ${gradient}`}
              >
                <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
              </span>
              <span className="line-clamp-1 text-center text-xs font-medium text-(--text-secondary) group-hover:text-(--text-primary)">
                {genre.thaiName || genre.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
