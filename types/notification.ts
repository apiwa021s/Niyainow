export type NotificationType =
  | "new_chapter"
  | "new_story_from_writer"
  | "writer_post"
  | "early_access"
  | "membership"
  | "coin_purchase"
  | "chapter_purchase"
  | "chapter_published"
  | "scheduled_publish"
  | "fan_summary"
  | "membership_summary"
  | "earnings_summary";

export type NotificationFeedItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationFeedPage = {
  items: NotificationFeedItem[];
  unreadCount: number;
  nextCursor: string | null;
};
