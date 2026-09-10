import { loadEnvConfig } from "@next/env";
import postgres from "postgres";

import { invalidateImportedNovelCaches } from "@/lib/redis/invalidation";

loadEnvConfig(process.cwd());

type TaxonomyPlan = {
  slug: string;
  genres: string[];
  tags: Array<{ slug: string; name: string }>;
};

const plans: TaxonomyPlan[] = [
  {
    slug: "otherworldly-evil-monarch",
    genres: ["action", "adventure", "fantasy", "martial-arts"],
    tags: [
      { slug: "isekai", name: "ต่างโลก" },
      { slug: "reincarnation", name: "เกิดใหม่" },
      { slug: "cultivation", name: "บำเพ็ญเซียน" },
      { slug: "assassin", name: "นักฆ่า" },
      { slug: "overpowered-protagonist", name: "พระเอกเก่ง" },
    ],
  },
  {
    slug: "cultivation-chat-group",
    genres: ["comedy", "fantasy", "martial-arts", "adventure", "contemporary"],
    tags: [
      { slug: "cultivation", name: "บำเพ็ญเซียน" },
      { slug: "chat-group", name: "กลุ่มแชต" },
      { slug: "modern-world", name: "โลกปัจจุบัน" },
      { slug: "supernatural", name: "เหนือธรรมชาติ" },
      { slug: "alchemy", name: "หลอมโอสถ" },
    ],
  },
  {
    slug: "demon-noble-girl-story-of-a-careless-demon",
    genres: ["fantasy", "adventure", "slice-of-life", "drama"],
    tags: [
      { slug: "reincarnation", name: "เกิดใหม่" },
      { slug: "female-protagonist", name: "นางเอก" },
      { slug: "demon", name: "ปีศาจ" },
      { slug: "magic", name: "เวทมนตร์" },
      { slug: "survival", name: "เอาชีวิตรอด" },
    ],
  },
  {
    slug: "my-three-wives-are-beautiful-vampires",
    genres: ["fantasy", "romance", "action"],
    tags: [
      { slug: "vampire", name: "แวมไพร์" },
      { slug: "harem", name: "ฮาเร็ม" },
      { slug: "supernatural", name: "เหนือธรรมชาติ" },
      { slug: "overpowered-protagonist", name: "พระเอกเก่ง" },
      { slug: "rare-blood", name: "เลือดหายาก" },
    ],
  },
  {
    slug: "rebirth-of-the-thief-who-roamed-the-world",
    genres: ["system", "action", "adventure", "fantasy"],
    tags: [
      { slug: "online-game", name: "เกมออนไลน์" },
      { slug: "vrmmo", name: "VRMMO" },
      { slug: "reincarnation", name: "เกิดใหม่" },
      { slug: "time-travel", name: "ย้อนเวลา" },
      { slug: "thief", name: "โจร" },
      { slug: "overpowered-protagonist", name: "พระเอกเก่ง" },
    ],
  },
  {
    slug: "lord-of-the-mysteries",
    genres: ["mystery", "fantasy", "adventure", "thriller", "horror"],
    tags: [
      { slug: "isekai", name: "ต่างโลก" },
      { slug: "reincarnation", name: "เกิดใหม่" },
      { slug: "steampunk", name: "สตีมพังก์" },
      { slug: "supernatural", name: "เหนือธรรมชาติ" },
      { slug: "tarot", name: "ไพ่ทาโรต์" },
      { slug: "sealed-artifacts", name: "วัตถุปิดผนึก" },
    ],
  },
  {
    slug: "sss",
    genres: ["action", "system", "fantasy", "adventure"],
    tags: [
      { slug: "overpowered", name: "พลังเหนือชั้น" },
      { slug: "revenge", name: "แก้แค้น" },
      { slug: "antihero", name: "แอนติฮีโร" },
      { slug: "adaptation", name: "ปรับตัว" },
      { slug: "sss-awakening", name: "ปลุกพลัง SSS" },
      { slug: "gate", name: "เกต" },
      { slug: "dungeon", name: "ดันเจี้ยน" },
    ],
  },
  {
    slug: "2",
    genres: ["fantasy", "romance", "comedy", "slice-of-life", "adventure"],
    tags: [
      { slug: "isekai", name: "ต่างโลก" },
      { slug: "hero", name: "ผู้กล้า" },
      { slug: "cheat-skill", name: "พลังโกง" },
      { slug: "marriage", name: "แต่งงาน" },
      { slug: "slow-life", name: "ชีวิตสบาย ๆ" },
      { slug: "family", name: "ครอบครัว" },
      { slug: "demon", name: "ปีศาจ" },
    ],
  },
];

async function main() {
  if (!process.argv.includes("--apply")) {
    console.info(JSON.stringify({ dryRun: true, novels: plans }, null, 2));
    return;
  }

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  try {
    const summaries = await sql.begin(async (tx) => {
      const published = await tx<{ id: string; slug: string; title: string }[]>`
        select id, slug, title
        from novels
        where slug in ${tx(plans.map((plan) => plan.slug))}
          and publication_status = 'PUBLISHED'
          and deleted_at is null
        for update
      `;
      if (published.length !== plans.length) {
        const found = new Set(published.map((novel) => novel.slug));
        throw new Error(`Expected ${plans.length} published novels; missing: ${plans.filter((plan) => !found.has(plan.slug)).map((plan) => plan.slug).join(", ")}`);
      }

      const genreSlugs = [...new Set(plans.flatMap((plan) => plan.genres))];
      const genreRows = await tx<{ id: string; slug: string }[]>`
        select id, slug from genres where slug in ${tx(genreSlugs)} and is_active = true
      `;
      const genreIds = new Map(genreRows.map((genre) => [genre.slug, genre.id]));
      const missingGenres = genreSlugs.filter((slug) => !genreIds.has(slug));
      if (missingGenres.length) throw new Error(`Missing active genres: ${missingGenres.join(", ")}`);

      const result: Array<{ slug: string; title: string; genres: string[]; tags: string[] }> = [];
      for (const plan of plans) {
        const novel = published.find((entry) => entry.slug === plan.slug)!;
        const beforeGenres = await tx<{ slug: string }[]>`
          select g.slug from novel_genres ng join genres g on g.id = ng.genre_id
          where ng.novel_id = ${novel.id} order by ng.sort_order
        `;
        const beforeTags = await tx<{ name: string }[]>`
          select t.name from novel_tags nt join tags t on t.id = nt.tag_id
          where nt.novel_id = ${novel.id} order by t.name
        `;

        const tagIds: string[] = [];
        for (const tag of plan.tags) {
          const [existing] = await tx<{ id: string }[]>`
            select id from tags where lower(name) = lower(${tag.name}) limit 1
          `;
          if (existing) {
            await tx`update tags set is_active = true, updated_at = now() where id = ${existing.id}`;
            tagIds.push(existing.id);
          } else {
            const [created] = await tx<{ id: string }[]>`
              insert into tags (slug, name) values (${tag.slug}, ${tag.name}) returning id
            `;
            tagIds.push(created.id);
          }
        }

        await tx`delete from novel_genres where novel_id = ${novel.id}`;
        await tx`delete from novel_tags where novel_id = ${novel.id}`;
        for (const [index, genreSlug] of plan.genres.entries()) {
          await tx`
            insert into novel_genres (novel_id, genre_id, is_primary, sort_order)
            values (${novel.id}, ${genreIds.get(genreSlug)!}, ${index === 0}, ${index + 1})
          `;
        }
        for (const tagId of tagIds) {
          await tx`insert into novel_tags (novel_id, tag_id) values (${novel.id}, ${tagId})`;
        }

        const [searchSource] = await tx<{ search_text: string }[]>`
          select concat_ws(' ', n.title, n.title_original,
            (select string_agg(nat.title, ' ') from novel_alternative_titles nat where nat.novel_id = n.id),
            (select string_agg(a.name, ' ') from novel_authors na join authors a on a.id = na.author_id where na.novel_id = n.id),
            (select string_agg(concat_ws(' ', g.name, g.thai_name), ' ') from novel_genres ng join genres g on g.id = ng.genre_id where ng.novel_id = n.id),
            (select string_agg(t.name, ' ') from novel_tags nt join tags t on t.id = nt.tag_id where nt.novel_id = n.id)
          ) as search_text
          from novels n where n.id = ${novel.id}
        `;
        await tx`
          insert into novel_search_documents (novel_id, search_text, updated_at)
          values (${novel.id}, ${searchSource.search_text}, now())
          on conflict (novel_id) do update set search_text = excluded.search_text, updated_at = excluded.updated_at
        `;
        await tx`update novels set updated_at = now() where id = ${novel.id}`;
        await tx`
          insert into admin_audit_logs (action, entity_type, entity_id, before, after, metadata)
          values (
            'novel.taxonomy.curate',
            'novel',
            ${novel.id},
            ${tx.json({ genres: beforeGenres.map((row) => row.slug), tags: beforeTags.map((row) => row.name) })},
            ${tx.json({ genres: plan.genres, tags: plan.tags.map((tag) => tag.name) })},
            ${tx.json({ source: "db/curate-published-taxonomy.ts", slug: plan.slug })}
          )
        `;
        result.push({ slug: plan.slug, title: novel.title, genres: plan.genres, tags: plan.tags.map((tag) => tag.name) });
      }

      await tx`
        update tags t set usage_count = (
          select count(*)::int from novel_tags nt where nt.tag_id = t.id
        ), updated_at = now()
      `;
      return result;
    });

    await invalidateImportedNovelCaches(plans.map((plan) => plan.slug));
    console.info(JSON.stringify({ applied: true, novels: summaries }, null, 2));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
