import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { WriterPostManager } from "@/components/studio/posts/writer-post-manager";
import { StudioPageHeader } from "@/components/studio/studio-ui";
import { requireActiveUser } from "@/lib/auth/dal";
import { listStudioPosts } from "@/services/writer-post-service";
import { getWriterProfileForUser } from "@/services/studio-service";

export const metadata: Metadata = { title: "โพสต์" };

export default async function StudioPostsPage() {
  const user = await requireActiveUser("/studio/posts");
  if (!(await getWriterProfileForUser(user.id))) redirect("/studio/profile");
  const posts = await listStudioPosts(user.id);
  return <div><StudioPageHeader eyebrow="Studio / โพสต์" title="โพสต์ถึงแฟนของคุณ" description="แชร์อัปเดต เบื้องหลัง และข่าวสาร พร้อมกำหนดสิทธิ์การมองเห็นจากฝั่งเซิร์ฟเวอร์" /><WriterPostManager initialPosts={posts} /></div>;
}
