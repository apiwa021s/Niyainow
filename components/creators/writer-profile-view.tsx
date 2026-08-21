import Image from "next/image";
import { BookOpen, Eye, MessageCircle, Sparkles } from "lucide-react";

import { WriterProfileTabs } from "@/components/creators/writer-profile-tabs";
import { NovelTile } from "@/components/novels/novel-card";
import { WriterFollowButton } from "@/components/novels/writer-follow-button";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, SectionHeader } from "@/components/ui/section";
import { getWriterMembership } from "@/lib/domain/reader-taste";
import { formatNumber } from "@/lib/utils";
import type { WriterProfile } from "@/services/novel-service";

/** Public writer profile (brief §Module 14 / 64–68) — real author + real novels, no mock data. */
export function WriterProfileView({ profile }: { profile: WriterProfile }) {
  const totalViews = profile.novels.reduce((sum, novel) => sum + novel.views, 0);
  const ongoing = profile.novels.filter((novel) => novel.status === "ongoing");
  const completed = profile.novels.filter((novel) => novel.status === "completed");
  const featured = profile.novels[0];
  const membership = profile.novels.map((novel) => getWriterMembership(novel)).find(Boolean);

  return (
    <div className="space-y-8">
      <header className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <div className="relative mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-full border border-border bg-muted sm:mx-0">
          <Image src={profile.avatarUrl} alt="" fill sizes="96px" className="object-cover" />
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <h1 className="text-h1 font-semibold sm:text-display">{profile.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">@{profile.slug}</p>
          <div className="tabular mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground sm:justify-start">
            <span>{profile.novels.length.toLocaleString("th-TH")} เรื่อง</span>
            <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" aria-hidden />{formatNumber(totalViews)} ยอดอ่าน</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <WriterFollowButton authorName={profile.name} />
            {membership ? (
              <ButtonLink href={`/novel/${profile.novels.find((novel) => getWriterMembership(novel))?.slug}/membership`} variant="outline" size="sm">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Membership
              </ButtonLink>
            ) : null}
          </div>
        </div>
      </header>

      <WriterProfileTabs
        works={
          <div className="space-y-8">
            {featured ? (
              <section>
                <SectionHeader title="เรื่องแนะนำ" />
                <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
                  <div className="relative mx-auto aspect-[2/3] w-32 overflow-hidden rounded-[6px] border border-border bg-muted sm:mx-0 sm:w-full">
                    <Image src={featured.cover} alt="" fill sizes="160px" className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold">{featured.thaiTitle}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{featured.synopsis}</p>
                    <ButtonLink href={`/novel/${featured.slug}`} className="mt-3">
                      <BookOpen className="h-4 w-4" aria-hidden />
                      เริ่มอ่าน
                    </ButtonLink>
                  </div>
                </div>
              </section>
            ) : null}

            {ongoing.length ? (
              <section>
                <SectionHeader title="กำลังเขียน" />
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {ongoing.map((novel) => <NovelTile key={novel.slug} novel={novel} />)}
                </div>
              </section>
            ) : null}

            {completed.length ? (
              <section>
                <SectionHeader title="จบแล้ว" />
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {completed.map((novel) => <NovelTile key={novel.slug} novel={novel} />)}
                </div>
              </section>
            ) : null}

            {!profile.novels.length ? (
              <EmptyState title="ยังไม่มีผลงานที่เผยแพร่" description="ติดตามนักเขียนไว้ แล้วกลับมาดูอีกครั้งเมื่อมีเรื่องใหม่" />
            ) : null}
          </div>
        }
        posts={
          <EmptyState
            icon={<MessageCircle className="h-6 w-6" />}
            title="ยังไม่มีโพสต์"
            description="เมื่อนักเขียนคนนี้เริ่มโพสต์อัปเดตหรือตอนใหม่ จะปรากฏที่นี่"
          />
        }
        about={
          profile.bio ? (
            <p className="max-w-2xl whitespace-pre-line text-sm leading-7 text-muted-foreground">{profile.bio}</p>
          ) : (
            <EmptyState title="ยังไม่มีข้อมูลเกี่ยวกับนักเขียน" description="นักเขียนคนนี้ยังไม่ได้เพิ่มประวัติแนะนำตัว" />
          )
        }
      />
    </div>
  );
}
