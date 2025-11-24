import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("USER"),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const registerUserSchema = insertUserSchema.omit({ passwordHash: true }).extend({
  password: z.string().min(6),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Profiles table
export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  location: jsonb("location").$type<{
    lat?: number;
    lng?: number;
    city?: string;
    state?: string;
    country?: string;
  }>(),
  vehicle: jsonb("vehicle").$type<{
    brand?: string;
    model?: string;
    year?: number;
    batteryCapacity?: number;
  }>(),
  interests: text("interests").array(),
  followersCount: integer("followers_count").notNull().default(0),
  followingCount: integer("following_count").notNull().default(0),
  notificationPrefs: jsonb("notification_prefs").$type<{
    newPost?: boolean;
    like?: boolean;
    comment?: boolean;
  }>().default(sql`'{}'::jsonb`),
  acceptsMessages: boolean("accepts_messages").notNull().default(true),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
});

export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

// User follows table (follower/following relationships)
export const userFollows = pgTable("user_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: varchar("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  followerFollowingUnique: uniqueIndex("user_follows_follower_following_idx").on(table.followerId, table.followingId),
}));

export const insertUserFollowSchema = createInsertSchema(userFollows).omit({
  id: true,
  createdAt: true,
});

export type InsertUserFollow = z.infer<typeof insertUserFollowSchema>;
export type UserFollow = typeof userFollows.$inferSelect;

// User blocks table
export const userBlocks = pgTable("user_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockerId: varchar("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  blockedId: varchar("blocked_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  blockerBlockedUnique: uniqueIndex("user_blocks_blocker_blocked_idx").on(table.blockerId, table.blockedId),
}));

export const insertUserBlockSchema = createInsertSchema(userBlocks).omit({
  id: true,
  createdAt: true,
});

export type InsertUserBlock = z.infer<typeof insertUserBlockSchema>;
export type UserBlock = typeof userBlocks.$inferSelect;

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  actorId: varchar("actor_id").references(() => users.id, { onDelete: "set null" }),
  targetType: text("target_type"),
  targetId: varchar("target_id"),
  metadata: jsonb("metadata"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Conversation table for direct messages between users
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantAId: varchar("participant_a_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  participantBId: varchar("participant_b_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueParticipants: uniqueIndex("conversations_participants_idx").on(table.participantAId, table.participantBId),
}));

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  isRead: true,
  readAt: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Communities table
export const communities = pgTable("communities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  type: text("type").notNull(),
  coverImageUrl: text("cover_image_url"),
  description: text("description"),
  moderators: text("moderators").array(),
  membersCount: integer("members_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCommunitySchema = createInsertSchema(communities).omit({
  id: true,
  membersCount: true,
  createdAt: true,
});

export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communities.$inferSelect;

// Community members junction table
export const communityMembers = pgTable("community_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  communityId: varchar("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const insertCommunityMemberSchema = createInsertSchema(communityMembers).omit({
  id: true,
  joinedAt: true,
});

export type InsertCommunityMember = z.infer<typeof insertCommunityMemberSchema>;
export type CommunityMember = typeof communityMembers.$inferSelect;

// Posts table
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  communityId: varchar("community_id").references(() => communities.id, { onDelete: "set null" }),
  title: text("title"),
  text: text("text").notNull(),
  media: jsonb("media").$type<Array<{ type: string; url: string }>>(),
  likes: text("likes").array().notNull().default(sql`ARRAY[]::text[]`),
  commentsCount: integer("comments_count").notNull().default(0),
  visibility: text("visibility").notNull().default("PUBLIC"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  likes: true,
  commentsCount: true,
  createdAt: true,
});

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

// Comments table
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// Stations table
export const stations = pgTable("stations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: text("external_id"),
  name: text("name").notNull(),
  coords: jsonb("coords").notNull().$type<{ lat: number; lng: number }>(),
  address: text("address").notNull(),
  connectors: jsonb("connectors").notNull().$type<Array<{ type: string; powerKW: number }>>(),
  provider: text("provider"),
  pricing: text("pricing"),
  availability: text("availability"),
  verified: boolean("verified").notNull().default(false),
  addedBy: varchar("added_by").references(() => users.id, { onDelete: "set null" }),
  bookmarksCount: integer("bookmarks_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStationSchema = createInsertSchema(stations).omit({
  id: true,
  verified: true,
  bookmarksCount: true,
  createdAt: true,
});

export type InsertStation = z.infer<typeof insertStationSchema>;
export type Station = typeof stations.$inferSelect;

// Bookmarks table
export const bookmarks = pgTable("bookmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(),
  targetId: varchar("target_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({
  id: true,
  createdAt: true,
});

export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;

// Questions table
export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  upvotes: text("upvotes").array().notNull().default(sql`ARRAY[]::text[]`),
  answersCount: integer("answers_count").notNull().default(0),
  solvedAnswerId: varchar("solved_answer_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  upvotes: true,
  answersCount: true,
  createdAt: true,
}).extend({
  solvedAnswerId: z.string().optional().nullable(),
});

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

// Answers table
export const answers = pgTable("answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionId: varchar("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  upvotes: text("upvotes").array().notNull().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAnswerSchema = createInsertSchema(answers).omit({
  id: true,
  upvotes: true,
  createdAt: true,
});

export type InsertAnswer = z.infer<typeof insertAnswerSchema>;
export type Answer = typeof answers.$inferSelect;

// Articles table
export const articles = pgTable("articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  body: text("body").notNull(),
  coverImageUrl: text("cover_image_url"),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  likes: text("likes").array().notNull().default(sql`ARRAY[]::text[]`),
  commentsCount: integer("comments_count").notNull().default(0),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  likes: true,
  commentsCount: true,
  publishedAt: true,
});

export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;

// Reports table
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(),
  targetId: varchar("target_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("OPEN"),
  handledBy: varchar("handled_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  status: true,
  createdAt: true,
});

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(),
  actorId: varchar("actor_id").references(() => users.id, { onDelete: "set null" }),
  targetType: text("target_type"),
  targetId: varchar("target_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Article comments table
export const articleComments = pgTable("article_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertArticleCommentSchema = createInsertSchema(articleComments).omit({
  id: true,
  createdAt: true,
});

export type InsertArticleComment = z.infer<typeof insertArticleCommentSchema>;
export type ArticleComment = typeof articleComments.$inferSelect;

// Knowledge categories table
export const knowledgeCategories = pgTable("knowledge_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("BookOpen"),
  color: text("color").notNull().default("text-blue-500"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertKnowledgeCategorySchema = createInsertSchema(knowledgeCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertKnowledgeCategory = z.infer<typeof insertKnowledgeCategorySchema>;
export type KnowledgeCategory = typeof knowledgeCategories.$inferSelect;
