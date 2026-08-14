import { relations } from "drizzle-orm";

import { adminAuditLogs, mediaAssets, siteSettings } from "./admin";
import { novelDailyStats, novelRankings } from "./analytics";
import { accounts, authenticators, sessions, users } from "./auth";
import {
  authors,
  chapters,
  genres,
  novelAlternativeTitles,
  novelAuthors,
  novelGenres,
  novelSearchDocuments,
  novelStatistics,
  novelTags,
  novels,
  tags,
} from "./content";
import {
  novelFollows,
  ratings,
  readingHistory,
  readingProgress,
  reviewLikes,
  reviews,
  userLibrary,
} from "./user";

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  authenticators: many(authenticators),
  library: many(userLibrary),
  follows: many(novelFollows),
  readingProgress: many(readingProgress),
  readingHistory: many(readingHistory),
  ratings: many(ratings),
  reviews: many(reviews, { relationName: "reviewAuthor" }),
  moderatedReviews: many(reviews, { relationName: "reviewModerator" }),
  reviewLikes: many(reviewLikes),
  mediaAssets: many(mediaAssets),
  auditLogs: many(adminAuditLogs),
  settingsUpdates: many(siteSettings),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const authenticatorsRelations = relations(authenticators, ({ one }) => ({
  user: one(users, { fields: [authenticators.userId], references: [users.id] }),
}));

export const novelsRelations = relations(novels, ({ many, one }) => ({
  alternativeTitles: many(novelAlternativeTitles),
  authors: many(novelAuthors),
  genres: many(novelGenres),
  tags: many(novelTags),
  chapters: many(chapters),
  statistics: one(novelStatistics),
  searchDocument: one(novelSearchDocuments),
  libraryEntries: many(userLibrary),
  followers: many(novelFollows),
  progress: many(readingProgress),
  history: many(readingHistory),
  ratings: many(ratings),
  reviews: many(reviews),
  dailyStats: many(novelDailyStats),
  rankings: many(novelRankings),
}));

export const authorsRelations = relations(authors, ({ many }) => ({
  novels: many(novelAuthors),
}));

export const genresRelations = relations(genres, ({ many }) => ({
  novels: many(novelGenres),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  novels: many(novelTags),
}));

export const novelAlternativeTitlesRelations = relations(novelAlternativeTitles, ({ one }) => ({
  novel: one(novels, { fields: [novelAlternativeTitles.novelId], references: [novels.id] }),
}));

export const novelAuthorsRelations = relations(novelAuthors, ({ one }) => ({
  novel: one(novels, { fields: [novelAuthors.novelId], references: [novels.id] }),
  author: one(authors, { fields: [novelAuthors.authorId], references: [authors.id] }),
}));

export const novelGenresRelations = relations(novelGenres, ({ one }) => ({
  novel: one(novels, { fields: [novelGenres.novelId], references: [novels.id] }),
  genre: one(genres, { fields: [novelGenres.genreId], references: [genres.id] }),
}));

export const novelTagsRelations = relations(novelTags, ({ one }) => ({
  novel: one(novels, { fields: [novelTags.novelId], references: [novels.id] }),
  tag: one(tags, { fields: [novelTags.tagId], references: [tags.id] }),
}));

export const novelSearchDocumentsRelations = relations(novelSearchDocuments, ({ one }) => ({
  novel: one(novels, { fields: [novelSearchDocuments.novelId], references: [novels.id] }),
}));

export const chaptersRelations = relations(chapters, ({ one }) => ({
  novel: one(novels, { fields: [chapters.novelId], references: [novels.id] }),
}));

export const novelStatisticsRelations = relations(novelStatistics, ({ one }) => ({
  novel: one(novels, { fields: [novelStatistics.novelId], references: [novels.id] }),
  latestChapter: one(chapters, { fields: [novelStatistics.latestChapterId], references: [chapters.id] }),
}));

export const userLibraryRelations = relations(userLibrary, ({ one }) => ({
  user: one(users, { fields: [userLibrary.userId], references: [users.id] }),
  novel: one(novels, { fields: [userLibrary.novelId], references: [novels.id] }),
}));

export const novelFollowsRelations = relations(novelFollows, ({ one }) => ({
  user: one(users, { fields: [novelFollows.userId], references: [users.id] }),
  novel: one(novels, { fields: [novelFollows.novelId], references: [novels.id] }),
}));

export const readingProgressRelations = relations(readingProgress, ({ one }) => ({
  user: one(users, { fields: [readingProgress.userId], references: [users.id] }),
  novel: one(novels, { fields: [readingProgress.novelId], references: [novels.id] }),
  chapter: one(chapters, { fields: [readingProgress.chapterId], references: [chapters.id] }),
}));

export const readingHistoryRelations = relations(readingHistory, ({ one }) => ({
  user: one(users, { fields: [readingHistory.userId], references: [users.id] }),
  novel: one(novels, { fields: [readingHistory.novelId], references: [novels.id] }),
  chapter: one(chapters, { fields: [readingHistory.chapterId], references: [chapters.id] }),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  user: one(users, { fields: [ratings.userId], references: [users.id] }),
  novel: one(novels, { fields: [ratings.novelId], references: [novels.id] }),
}));

export const reviewsRelations = relations(reviews, ({ many, one }) => ({
  user: one(users, {
    relationName: "reviewAuthor",
    fields: [reviews.userId],
    references: [users.id],
  }),
  moderator: one(users, {
    relationName: "reviewModerator",
    fields: [reviews.moderatedBy],
    references: [users.id],
  }),
  novel: one(novels, { fields: [reviews.novelId], references: [novels.id] }),
  likes: many(reviewLikes),
}));

export const reviewLikesRelations = relations(reviewLikes, ({ one }) => ({
  review: one(reviews, { fields: [reviewLikes.reviewId], references: [reviews.id] }),
  user: one(users, { fields: [reviewLikes.userId], references: [users.id] }),
}));

export const novelDailyStatsRelations = relations(novelDailyStats, ({ one }) => ({
  novel: one(novels, { fields: [novelDailyStats.novelId], references: [novels.id] }),
}));

export const novelRankingsRelations = relations(novelRankings, ({ one }) => ({
  novel: one(novels, { fields: [novelRankings.novelId], references: [novels.id] }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  creator: one(users, { fields: [mediaAssets.createdBy], references: [users.id] }),
}));

export const adminAuditLogsRelations = relations(adminAuditLogs, ({ one }) => ({
  actor: one(users, { fields: [adminAuditLogs.actorId], references: [users.id] }),
}));

export const siteSettingsRelations = relations(siteSettings, ({ one }) => ({
  updater: one(users, { fields: [siteSettings.updatedBy], references: [users.id] }),
}));
