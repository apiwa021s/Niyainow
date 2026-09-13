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
  {
    slug: "shadow-slave",
    genres: ["fantasy", "action", "adventure", "system", "horror"],
    tags: [
      { slug: "nightmare-spell", name: "มนตร์ฝันร้าย" },
      { slug: "awakened", name: "ผู้ตื่นรู้" },
      { slug: "survival", name: "เอาชีวิตรอด" },
      { slug: "dark-fantasy", name: "ดาร์กแฟนตาซี" },
      { slug: "monsters", name: "สัตว์ประหลาด" },
      { slug: "shadow-power", name: "พลังเงา" },
    ],
  },
  {
    slug: "follow-the-path-of-dao-from-infancy",
    genres: ["martial-arts", "fantasy", "action", "adventure", "historical"],
    tags: [
      { slug: "cultivation", name: "บำเพ็ญเซียน" },
      { slug: "dao", name: "วิถีเต๋า" },
      { slug: "child-protagonist", name: "ตัวเอกวัยเด็ก" },
      { slug: "prodigy", name: "อัจฉริยะ" },
      { slug: "swordsmanship", name: "วิถีกระบี่" },
      { slug: "military-family", name: "ตระกูลขุนศึก" },
    ],
  },
  {
    slug: "wizard-starting-from-the-skill-tree",
    genres: ["system", "fantasy", "adventure", "action"],
    tags: [
      { slug: "skill-tree", name: "ต้นไม้ทักษะ" },
      { slug: "wizard", name: "พ่อมด" },
      { slug: "transmigration", name: "ทะลุมิติ" },
      { slug: "progression", name: "การเติบโตทางพลัง" },
      { slug: "magic", name: "เวทมนตร์" },
      { slug: "immortality", name: "เส้นทางนิรันดร์" },
    ],
  },
  {
    slug: "sss-2",
    genres: ["system", "action", "adventure", "fantasy", "apocalypse"],
    tags: [
      { slug: "sss-awakening", name: "ปลุกพลัง SSS" },
      { slug: "class-change", name: "เปลี่ยนคลาส" },
      { slug: "game-system", name: "ระบบเกม" },
      { slug: "overpowered-protagonist", name: "พระเอกเก่ง" },
      { slug: "underdog", name: "จากผู้ไร้ค่าสู่ผู้แข็งแกร่ง" },
      { slug: "survival", name: "เอาชีวิตรอด" },
      { slug: "leveling", name: "เก็บเลเวล" },
    ],
  },
  {
    slug: "divine-emperor-of-death",
    genres: ["martial-arts", "fantasy", "adventure", "action", "comedy"],
    tags: [
      { slug: "isekai", name: "ต่างโลก" },
      { slug: "reincarnation", name: "เกิดใหม่" },
      { slug: "cultivation", name: "บำเพ็ญเซียน" },
      { slug: "child-protagonist", name: "ตัวเอกวัยเด็ก" },
      { slug: "death-power", name: "พลังแห่งความตาย" },
      { slug: "crown-prince", name: "มกุฎราชกุมาร" },
      { slug: "overpowered-protagonist", name: "พระเอกเก่ง" },
    ],
  },
  {
    slug: "novel-q3af65",
    genres: ["system", "fantasy", "action", "adventure", "martial-arts"],
    tags: [
      { slug: "isekai", name: "ต่างโลก" },
      { slug: "world-hopping", name: "ท่องหลายโลก" },
      { slug: "cheat-skill", name: "พลังโกง" },
      { slug: "copy-ability", name: "คัดลอกความสามารถ" },
      { slug: "cultivation", name: "บำเพ็ญเซียน" },
      { slug: "anime-worlds", name: "โลกอนิเมะ" },
      { slug: "genius-class", name: "ห้องอัจฉริยะ" },
    ],
  },
  {
    slug: "reborn-as-the-genius-son-of-the-richest-family",
    genres: ["fantasy", "slice-of-life", "adventure", "system"],
    tags: [
      { slug: "reincarnation", name: "เกิดใหม่" },
      { slug: "isekai", name: "ต่างโลก" },
      { slug: "ai-assistant", name: "ผู้ช่วย AI" },
      { slug: "technology", name: "เทคโนโลยี" },
      { slug: "magic", name: "เวทมนตร์" },
      { slug: "inventor", name: "นักประดิษฐ์" },
      { slug: "noble-family", name: "ตระกูลขุนนาง" },
    ],
  },
  {
    slug: "novel-vgd9ev",
    genres: ["horror", "adventure", "mystery", "apocalypse", "thriller"],
    tags: [
      { slug: "apocalypse", name: "วันสิ้นโลก" },
      { slug: "survival", name: "เอาชีวิตรอด" },
      { slug: "ghost-ship", name: "เรืออาถรรพ์" },
      { slug: "sea-adventure", name: "ผจญภัยทางทะเล" },
      { slug: "anomaly", name: "สิ่งผิดปกติ" },
      { slug: "mission-dungeon", name: "ด่านภารกิจ" },
      { slug: "ship-upgrade", name: "พัฒนาเรือ" },
    ],
  },
  {
    slug: "novel-69ots4",
    genres: ["fantasy", "romance", "drama", "historical"],
    tags: [
      { slug: "female-protagonist", name: "นางเอก" },
      { slug: "pharmacist", name: "เภสัชกร" },
      { slug: "potion-making", name: "ปรุงยา" },
      { slug: "adopted-daughter", name: "ลูกบุญธรรม" },
      { slug: "revenge", name: "แก้แค้น" },
      { slug: "cursed-prince", name: "เจ้าชายต้องคำสาป" },
      { slug: "merchant", name: "การค้า" },
    ],
  },
  {
    slug: "novel-1kpi428",
    genres: ["slice-of-life", "romance", "fantasy", "adventure", "apocalypse"],
    tags: [
      { slug: "female-protagonist", name: "นางเอก" },
      { slug: "farming", name: "การเกษตร" },
      { slug: "merchant", name: "การค้า" },
      { slug: "territory-development", name: "พัฒนาดินแดน" },
      { slug: "northern-duke", name: "แกรนด์ดยุกแดนเหนือ" },
      { slug: "ecological-restoration", name: "ฟื้นฟูผืนดิน" },
      { slug: "flowers", name: "ดอกไม้" },
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
        where publication_status = 'PUBLISHED'
          and deleted_at is null
        for update
      `;
      const publishedSlugs = new Set(published.map((novel) => novel.slug));
      const plannedSlugs = new Set(plans.map((plan) => plan.slug));
      const applicablePlans = plans.filter((plan) => publishedSlugs.has(plan.slug));
      const unplannedPublished = published.filter((novel) => !plannedSlugs.has(novel.slug)).map((novel) => novel.slug);
      if (unplannedPublished.length) throw new Error(`Published novels missing taxonomy plans: ${unplannedPublished.join(", ")}`);

      const genreSlugs = [...new Set(applicablePlans.flatMap((plan) => plan.genres))];
      const genreRows = await tx<{ id: string; slug: string }[]>`
        select id, slug from genres where slug in ${tx(genreSlugs)} and is_active = true
      `;
      const genreIds = new Map(genreRows.map((genre) => [genre.slug, genre.id]));
      const missingGenres = genreSlugs.filter((slug) => !genreIds.has(slug));
      if (missingGenres.length) throw new Error(`Missing active genres: ${missingGenres.join(", ")}`);

      const result: Array<{ slug: string; title: string; genres: string[]; tags: string[] }> = [];
      for (const plan of applicablePlans) {
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

    await invalidateImportedNovelCaches(summaries.map((novel) => novel.slug));
    console.info(JSON.stringify({ applied: true, novels: summaries }, null, 2));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
