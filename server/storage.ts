import {
  type User, type InsertUser,
  type Profile, type InsertProfile,
  type Community, type InsertCommunity,
  type CommunityMember, type InsertCommunityMember,
  type Post, type InsertPost,
  type Comment, type InsertComment,
  type Station, type InsertStation,
  type Bookmark, type InsertBookmark,
  type Question, type InsertQuestion,
  type Answer, type InsertAnswer,
  type Article, type InsertArticle,
  type ArticleComment, type InsertArticleComment,
  type Report, type InsertReport,
  type AuditLog, type InsertAuditLog,
  type KnowledgeCategory, type InsertKnowledgeCategory,
  type UserFollow, type InsertUserFollow,
  type UserBlock, type InsertUserBlock,
  type Notification, type InsertNotification,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers?(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | undefined>;
  deleteUser?(id: string): Promise<boolean>;
  
  // Profiles
  getProfile(userId: string): Promise<Profile | undefined>;
  getProfileById(id: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, updates: Partial<Omit<Profile, 'id' | 'userId'>>): Promise<Profile | undefined>;
  
  // Communities
  getCommunities(filters?: { search?: string; type?: string }): Promise<Community[]>;
  getCommunity(id: string): Promise<Community | undefined>;
  getCommunityBySlug(slug: string): Promise<Community | undefined>;
  createCommunity(community: InsertCommunity): Promise<Community>;
  updateCommunity(id: string, updates: Partial<Omit<Community, 'id' | 'createdAt'>>): Promise<Community | undefined>;
  deleteCommunity?(id: string): Promise<boolean>;
  
  // Community Members
  joinCommunity(data: InsertCommunityMember): Promise<CommunityMember>;
  leaveCommunity(communityId: string, userId: string): Promise<boolean>;
  isCommunityMember(communityId: string, userId: string): Promise<boolean>;
  getCommunityMembers(communityId: string): Promise<CommunityMember[]>;
  
  // Posts
  getPosts(filters?: { communityId?: string; authorId?: string; visibility?: string; limit?: number; offset?: number }): Promise<Post[]>;
  getPost(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: string, updates: Partial<Omit<Post, 'id' | 'createdAt' | 'authorId'>>): Promise<Post | undefined>;
  deletePost(id: string): Promise<boolean>;
  togglePostLike(postId: string, userId: string): Promise<Post | undefined>;
  
  // Comments
  getComments(postId: string): Promise<Comment[]>;
  getComment(id: string): Promise<Comment | undefined>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: string): Promise<boolean>;
  
  // Stations
  getStations(filters?: { verified?: boolean; limit?: number }): Promise<Station[]>;
  getStation(id: string): Promise<Station | undefined>;
  createStation(station: InsertStation): Promise<Station>;
  updateStation(id: string, updates: Partial<Omit<Station, 'id' | 'createdAt'>>): Promise<Station | undefined>;
  
  // Bookmarks
  getBookmarks(userId: string, targetType?: string): Promise<Bookmark[]>;
  createBookmark(bookmark: InsertBookmark): Promise<Bookmark>;
  deleteBookmark(id: string): Promise<boolean>;
  getBookmark(userId: string, targetId: string): Promise<Bookmark | undefined>;
  
  // Questions
  getQuestions(filters?: { tag?: string; sort?: string; limit?: number; offset?: number }): Promise<Question[]>;
  getQuestion(id: string): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: string, updates: Partial<Omit<Question, 'id' | 'createdAt' | 'authorId'>>): Promise<Question | undefined>;
  toggleQuestionUpvote(questionId: string, userId: string): Promise<Question | undefined>;
  deleteQuestion?(id: string): Promise<boolean>;
  
  // Answers
  getAnswers(questionId: string): Promise<Answer[]>;
  getAnswer(id: string): Promise<Answer | undefined>;
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  toggleAnswerUpvote(answerId: string, userId: string): Promise<Answer | undefined>;
  
  // Articles
  getArticles(filters?: { kind?: string; tag?: string; limit?: number }): Promise<Article[]>;
  getArticle(id: string): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  toggleArticleLike(articleId: string, userId: string): Promise<Article | undefined>;
  deleteArticle(id: string): Promise<boolean>;
  
  // Article Comments
  getArticleComments(articleId: string): Promise<ArticleComment[]>;
  getArticleComment(id: string): Promise<ArticleComment | undefined>;
  createArticleComment(comment: InsertArticleComment): Promise<ArticleComment>;
  deleteArticleComment(id: string): Promise<boolean>;
  
  // Reports
  getReports(filters?: { status?: string; limit?: number }): Promise<Report[]>;
  getReport(id: string): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: string, updates: Partial<Omit<Report, 'id' | 'createdAt' | 'reporterId'>>): Promise<Report | undefined>;
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  
  // Knowledge Categories
  getKnowledgeCategories?(): Promise<KnowledgeCategory[]>;
  getKnowledgeCategory?(id: string): Promise<KnowledgeCategory | undefined>;
  createKnowledgeCategory?(category: InsertKnowledgeCategory): Promise<KnowledgeCategory>;
  deleteKnowledgeCategory?(id: string): Promise<boolean>;

  // Social: Follows
  followUser(followerId: string, followingId: string): Promise<UserFollow>;
  unfollowUser(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<UserFollow[]>;
  getFollowing(userId: string): Promise<UserFollow[]>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;

  // Social: Blocks
  blockUser(blockerId: string, blockedId: string): Promise<UserBlock>;
  unblockUser(blockerId: string, blockedId: string): Promise<boolean>;
  isBlocked(blockerId: string, blockedId: string): Promise<boolean>;
  getBlockedUsers(userId: string): Promise<UserBlock[]>;
  getBlockedByUsers(userId: string): Promise<UserBlock[]>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]>;
  markNotificationRead(userId: string, notificationId: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<number>;

  // Conversations & Messages
  getConversation(conversationId: string): Promise<Conversation | undefined>;
  findConversationBetween(userAId: string, userBId: string): Promise<Conversation | undefined>;
  createConversation(data: InsertConversation): Promise<Conversation>;
  getConversationsForUser(userId: string): Promise<Conversation[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(conversationId: string, options?: { limit?: number; before?: Date }): Promise<Message[]>;
  markMessageRead(conversationId: string, messageId: string, userId: string): Promise<Message | undefined>;
  getUnreadMessageCount(userId: string): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private profiles: Map<string, Profile>;
  private communities: Map<string, Community>;
  private communityMembers: Map<string, CommunityMember>;
  private posts: Map<string, Post>;
  private comments: Map<string, Comment>;
  private stations: Map<string, Station>;
  private bookmarks: Map<string, Bookmark>;
  private questions: Map<string, Question>;
  private answers: Map<string, Answer>;
  private articles: Map<string, Article>;
  private articleComments: Map<string, ArticleComment>;
  private reports: Map<string, Report>;
  private auditLogs: Map<string, AuditLog>;
  private knowledgeCategories: Map<string, KnowledgeCategory>;
  private userFollows: Map<string, UserFollow>;
  private userBlocks: Map<string, UserBlock>;
  private notifications: Map<string, Notification>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;

  constructor() {
    this.users = new Map();
    this.profiles = new Map();
    this.communities = new Map();
    this.communityMembers = new Map();
    this.posts = new Map();
    this.comments = new Map();
    this.stations = new Map();
    this.bookmarks = new Map();
    this.questions = new Map();
    this.answers = new Map();
    this.articles = new Map();
    this.articleComments = new Map();
    this.reports = new Map();
    this.auditLogs = new Map();
    this.knowledgeCategories = new Map();
    this.userFollows = new Map();
    this.userBlocks = new Map();
    this.notifications = new Map();
    this.conversations = new Map();
    this.messages = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      email: insertUser.email,
      passwordHash: insertUser.passwordHash,
      role: insertUser.role || "USER",
      status: insertUser.status || "ACTIVE",
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async deleteUser(id: string): Promise<boolean> {
    const deleted = this.users.delete(id);
    // Also delete user's profile
    const profile = await this.getProfile(id);
    if (profile) {
      this.profiles.delete(profile.id);
    }
    return deleted;
  }

  // Profiles
  async getProfile(userId: string): Promise<Profile | undefined> {
    return Array.from(this.profiles.values()).find(p => p.userId === userId);
  }

  async getProfileById(id: string): Promise<Profile | undefined> {
    return this.profiles.get(id);
  }

  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const id = randomUUID();
    const notificationPrefs = insertProfile.notificationPrefs
      ? insertProfile.notificationPrefs as Profile['notificationPrefs']
      : { newPost: true, like: true, comment: true } as Profile['notificationPrefs'];

    const profile: Profile = {
      id,
      userId: insertProfile.userId,
      displayName: insertProfile.displayName,
      avatarUrl: insertProfile.avatarUrl ?? null,
      bio: insertProfile.bio ?? null,
      location: insertProfile.location as Profile['location'] ?? null,
      vehicle: insertProfile.vehicle as Profile['vehicle'] ?? null,
      interests: insertProfile.interests ?? null,
      followersCount: insertProfile.followersCount ?? 0,
      followingCount: insertProfile.followingCount ?? 0,
      notificationPrefs,
      acceptsMessages: insertProfile.acceptsMessages ?? true,
    };
    this.profiles.set(id, profile);
    return profile;
  }

  async updateProfile(userId: string, updates: Partial<Omit<Profile, 'id' | 'userId'>>): Promise<Profile | undefined> {
    const profile = await this.getProfile(userId);
    if (!profile) return undefined;
    const updated = { ...profile, ...updates };
    this.profiles.set(profile.id, updated);
    return updated;
  }

  private getProfileByUserId(userId: string): Profile | undefined {
    return Array.from(this.profiles.values()).find((profile) => profile.userId === userId);
  }

  private adjustFollowerCounts(followerId: string, followingId: string, delta: number) {
    const followerProfile = this.getProfileByUserId(followerId);
    if (followerProfile) {
      followerProfile.followingCount = Math.max(0, (followerProfile.followingCount ?? 0) + delta);
      this.profiles.set(followerProfile.id, { ...followerProfile });
    }
    const followingProfile = this.getProfileByUserId(followingId);
    if (followingProfile) {
      followingProfile.followersCount = Math.max(0, (followingProfile.followersCount ?? 0) + delta);
      this.profiles.set(followingProfile.id, { ...followingProfile });
    }
  }

  // Social: Follows
  async followUser(followerId: string, followingId: string): Promise<UserFollow> {
    const existing = Array.from(this.userFollows.values()).find(
      (follow) => follow.followerId === followerId && follow.followingId === followingId
    );
    if (existing) {
      return existing;
    }

    const id = randomUUID();
    const follow: UserFollow = {
      id,
      followerId,
      followingId,
      createdAt: new Date(),
    };
    this.userFollows.set(id, follow);
    this.adjustFollowerCounts(followerId, followingId, 1);
    return follow;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const entry = Array.from(this.userFollows.values()).find(
      (follow) => follow.followerId === followerId && follow.followingId === followingId
    );
    if (!entry) {
      return false;
    }
    this.userFollows.delete(entry.id);
    this.adjustFollowerCounts(followerId, followingId, -1);
    return true;
  }

  async getFollowers(userId: string): Promise<UserFollow[]> {
    return Array.from(this.userFollows.values()).filter((follow) => follow.followingId === userId);
  }

  async getFollowing(userId: string): Promise<UserFollow[]> {
    return Array.from(this.userFollows.values()).filter((follow) => follow.followerId === userId);
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    return Array.from(this.userFollows.values()).some(
      (follow) => follow.followerId === followerId && follow.followingId === followingId
    );
  }

  // Social: Blocks
  async blockUser(blockerId: string, blockedId: string): Promise<UserBlock> {
    const existing = Array.from(this.userBlocks.values()).find(
      (block) => block.blockerId === blockerId && block.blockedId === blockedId
    );
    if (existing) {
      return existing;
    }

    const id = randomUUID();
    const block: UserBlock = {
      id,
      blockerId,
      blockedId,
      createdAt: new Date(),
    };
    this.userBlocks.set(id, block);

    // Remove any follow relationships between the users
    for (const follow of Array.from(this.userFollows.values())) {
      if (
        (follow.followerId === blockerId && follow.followingId === blockedId) ||
        (follow.followerId === blockedId && follow.followingId === blockerId)
      ) {
        this.userFollows.delete(follow.id);
        const delta = -1;
        this.adjustFollowerCounts(follow.followerId, follow.followingId, delta);
      }
    }

    return block;
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    const entry = Array.from(this.userBlocks.values()).find(
      (block) => block.blockerId === blockerId && block.blockedId === blockedId
    );
    if (!entry) {
      return false;
    }
    this.userBlocks.delete(entry.id);
    return true;
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    return Array.from(this.userBlocks.values()).some(
      (block) => block.blockerId === blockerId && block.blockedId === blockedId
    );
  }

  async getBlockedUsers(userId: string): Promise<UserBlock[]> {
    return Array.from(this.userBlocks.values()).filter((block) => block.blockerId === userId);
  }

  async getBlockedByUsers(userId: string): Promise<UserBlock[]> {
    return Array.from(this.userBlocks.values()).filter((block) => block.blockedId === userId);
  }

  // Notifications
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const entity: Notification = {
      id,
      userId: notification.userId,
      type: notification.type,
      actorId: notification.actorId ?? null,
      targetType: notification.targetType ?? null,
      targetId: notification.targetId ?? null,
      metadata: notification.metadata ?? null,
      isRead: false,
      createdAt: new Date(),
    };
    this.notifications.set(id, entity);
    return entity;
  }

  async getNotifications(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]> {
    let results = Array.from(this.notifications.values()).filter((n) => n.userId === userId);
    if (options?.unreadOnly) {
      results = results.filter((n) => !n.isRead);
    }
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (options?.limit !== undefined) {
      results = results.slice(0, options.limit);
    }
    return results;
  }

  async markNotificationRead(userId: string, notificationId: string): Promise<Notification | undefined> {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.userId !== userId) {
      return undefined;
    }
    const updated = { ...notification, isRead: true };
    this.notifications.set(notificationId, updated);
    return updated;
  }

  async markAllNotificationsRead(userId: string): Promise<number> {
    let count = 0;
    for (const [id, notification] of Array.from(this.notifications.entries())) {
      if (notification.userId === userId && !notification.isRead) {
        count += 1;
        this.notifications.set(id, { ...notification, isRead: true });
      }
    }
    return count;
  }

  // Conversations & Messages
  async getConversation(conversationId: string): Promise<Conversation | undefined> {
    return this.conversations.get(conversationId);
  }

  async findConversationBetween(userAId: string, userBId: string): Promise<Conversation | undefined> {
    return Array.from(this.conversations.values()).find((conversation) => {
      const pair = [conversation.participantAId, conversation.participantBId];
      return pair.includes(userAId) && pair.includes(userBId);
    });
  }

  async createConversation(data: InsertConversation): Promise<Conversation> {
    const existing = await this.findConversationBetween(data.participantAId, data.participantBId);
    if (existing) {
      return existing;
    }

    const id = randomUUID();
    const conversation: Conversation = {
      id,
      participantAId: data.participantAId,
      participantBId: data.participantBId,
      createdAt: new Date(),
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getConversationsForUser(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(
      (conversation) => conversation.participantAId === userId || conversation.participantBId === userId
    );
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const entity: Message = {
      id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      body: message.body,
      isRead: false,
      readAt: null,
      createdAt: new Date(),
    };
    this.messages.set(id, entity);
    return entity;
  }

  async getMessages(conversationId: string, options?: { limit?: number; before?: Date }): Promise<Message[]> {
    let msgs = Array.from(this.messages.values()).filter((message) => message.conversationId === conversationId);
    const before = options?.before;
    if (before) {
      msgs = msgs.filter((message) => message.createdAt < before);
    }
    msgs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (options?.limit !== undefined) {
      msgs = msgs.slice(-options.limit);
    }
    return msgs;
  }

  async markMessageRead(conversationId: string, messageId: string, userId: string): Promise<Message | undefined> {
    const message = this.messages.get(messageId);
    if (!message || message.conversationId !== conversationId) {
      return undefined;
    }
    if (message.senderId === userId) {
      return message;
    }
    const updated: Message = { ...message, isRead: true, readAt: new Date() };
    this.messages.set(messageId, updated);
    return updated;
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const conversations = await this.getConversationsForUser(userId);
    if (conversations.length === 0) {
      return 0;
    }

    const conversationIds = new Set(conversations.map((conversation) => conversation.id));
    let count = 0;
    this.messages.forEach((message) => {
      if (conversationIds.has(message.conversationId) && message.senderId !== userId && !message.isRead) {
        count += 1;
      }
    });

    return count;
  }

  // Communities
  async getCommunities(filters?: { search?: string; type?: string }): Promise<Community[]> {
    let communities = Array.from(this.communities.values());
    if (filters?.type) {
      communities = communities.filter(c => c.type === filters.type);
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      communities = communities.filter(c => 
        c.name.toLowerCase().includes(search) || 
        c.description?.toLowerCase().includes(search)
      );
    }
    return communities.sort((a, b) => b.membersCount - a.membersCount);
  }

  async getCommunity(id: string): Promise<Community | undefined> {
    return this.communities.get(id);
  }

  async getCommunityBySlug(slug: string): Promise<Community | undefined> {
    return Array.from(this.communities.values()).find(c => c.slug === slug);
  }

  async createCommunity(insertCommunity: InsertCommunity): Promise<Community> {
    const id = randomUUID();
    const community: Community = {
      id,
      name: insertCommunity.name,
      slug: insertCommunity.slug,
      type: insertCommunity.type,
      coverImageUrl: insertCommunity.coverImageUrl ?? null,
      description: insertCommunity.description ?? null,
      moderators: insertCommunity.moderators ?? null,
      membersCount: 0,
      createdAt: new Date(),
    };
    this.communities.set(id, community);
    return community;
  }

  async updateCommunity(id: string, updates: Partial<Omit<Community, 'id' | 'createdAt'>>): Promise<Community | undefined> {
    const community = this.communities.get(id);
    if (!community) return undefined;
    const updated = { ...community, ...updates };
    this.communities.set(id, updated);
    return updated;
  }

  async deleteCommunity(id: string): Promise<boolean> {
    const deleted = this.communities.delete(id);
    // Also delete all community members
    const members = Array.from(this.communityMembers.values()).filter(m => m.communityId === id);
    members.forEach(m => this.communityMembers.delete(m.id));
    return deleted;
  }

  // Community Members
  async joinCommunity(data: InsertCommunityMember): Promise<CommunityMember> {
    // Check if already a member to prevent duplicates
    const existing = await this.isCommunityMember(data.communityId, data.userId);
    if (existing) {
      // Return existing membership without incrementing count
      const existingMember = Array.from(this.communityMembers.values()).find(
        m => m.communityId === data.communityId && m.userId === data.userId
      );
      return existingMember!;
    }
    
    const id = randomUUID();
    const member: CommunityMember = { id, ...data, joinedAt: new Date() };
    this.communityMembers.set(id, member);
    
    // Only increment count for new memberships
    const community = await this.getCommunity(data.communityId);
    if (community) {
      await this.updateCommunity(data.communityId, { membersCount: community.membersCount + 1 });
    }
    
    return member;
  }

  async leaveCommunity(communityId: string, userId: string): Promise<boolean> {
    const member = Array.from(this.communityMembers.values()).find(
      m => m.communityId === communityId && m.userId === userId
    );
    if (!member) return false;
    
    this.communityMembers.delete(member.id);
    
    const community = await this.getCommunity(communityId);
    if (community) {
      await this.updateCommunity(communityId, { membersCount: Math.max(0, community.membersCount - 1) });
    }
    
    return true;
  }

  async isCommunityMember(communityId: string, userId: string): Promise<boolean> {
    return Array.from(this.communityMembers.values()).some(
      m => m.communityId === communityId && m.userId === userId
    );
  }

  async getCommunityMembers(communityId: string): Promise<CommunityMember[]> {
    return Array.from(this.communityMembers.values()).filter(m => m.communityId === communityId);
  }

  // Posts
  async getPosts(filters?: { communityId?: string; authorId?: string; visibility?: string; limit?: number; offset?: number }): Promise<Post[]> {
    let posts = Array.from(this.posts.values());
    
    if (filters?.communityId) {
      posts = posts.filter(p => p.communityId === filters.communityId);
    }
    if (filters?.authorId) {
      posts = posts.filter(p => p.authorId === filters.authorId);
    }
    if (filters?.visibility) {
      posts = posts.filter(p => p.visibility === filters.visibility);
    }
    
    posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    return posts.slice(offset, offset + limit);
  }

  async getPost(id: string): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = randomUUID();
    const post: Post = {
      id,
      authorId: insertPost.authorId,
      communityId: insertPost.communityId ?? null,
      title: insertPost.title ?? null,
      text: insertPost.text,
      media: insertPost.media as Post['media'] ?? null,
      visibility: insertPost.visibility ?? "PUBLIC",
      likes: [],
      commentsCount: 0,
      createdAt: new Date(),
    };
    this.posts.set(id, post);
    return post;
  }

  async updatePost(id: string, updates: Partial<Omit<Post, 'id' | 'createdAt' | 'authorId'>>): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;
    const updated = { ...post, ...updates };
    this.posts.set(id, updated);
    return updated;
  }

  async deletePost(id: string): Promise<boolean> {
    return this.posts.delete(id);
  }

  async togglePostLike(postId: string, userId: string): Promise<Post | undefined> {
    const post = this.posts.get(postId);
    if (!post) return undefined;
    
    const likes = post.likes || [];
    const index = likes.indexOf(userId);
    
    if (index > -1) {
      likes.splice(index, 1);
    } else {
      likes.push(userId);
    }
    
    const updated = { ...post, likes };
    this.posts.set(postId, updated);
    return updated;
  }

  // Comments
  async getComments(postId: string): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(c => c.postId === postId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getComment(id: string): Promise<Comment | undefined> {
    return this.comments.get(id);
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = randomUUID();
    const comment: Comment = { id, ...insertComment, createdAt: new Date() };
    this.comments.set(id, comment);
    
    const post = await this.getPost(insertComment.postId);
    if (post) {
      await this.updatePost(insertComment.postId, { commentsCount: post.commentsCount + 1 });
    }
    
    return comment;
  }

  async deleteComment(id: string): Promise<boolean> {
    const comment = this.comments.get(id);
    if (!comment) return false;
    
    this.comments.delete(id);
    
    const post = await this.getPost(comment.postId);
    if (post) {
      await this.updatePost(comment.postId, { commentsCount: Math.max(0, post.commentsCount - 1) });
    }
    
    return true;
  }

  // Stations
  async getStations(filters?: { verified?: boolean; limit?: number }): Promise<Station[]> {
    let stations = Array.from(this.stations.values());
    
    if (filters?.verified !== undefined) {
      stations = stations.filter(s => s.verified === filters.verified);
    }
    
    const limit = filters?.limit || 100;
    return stations.slice(0, limit);
  }

  async getStation(id: string): Promise<Station | undefined> {
    return this.stations.get(id);
  }

  async createStation(insertStation: InsertStation): Promise<Station> {
    const id = randomUUID();
    const station: Station = {
      id,
      externalId: insertStation.externalId ?? null,
      name: insertStation.name,
      coords: insertStation.coords,
      address: insertStation.address,
      connectors: insertStation.connectors as Station['connectors'],
      provider: insertStation.provider ?? null,
      pricing: insertStation.pricing ?? null,
      availability: insertStation.availability ?? null,
      addedBy: insertStation.addedBy ?? null,
      verified: false,
      bookmarksCount: 0,
      createdAt: new Date(),
    };
    this.stations.set(id, station);
    return station;
  }

  async updateStation(id: string, updates: Partial<Omit<Station, 'id' | 'createdAt'>>): Promise<Station | undefined> {
    const station = this.stations.get(id);
    if (!station) return undefined;
    const updated = { ...station, ...updates };
    this.stations.set(id, updated);
    return updated;
  }

  // Bookmarks
  async getBookmarks(userId: string, targetType?: string): Promise<Bookmark[]> {
    let bookmarks = Array.from(this.bookmarks.values()).filter(b => b.userId === userId);
    
    if (targetType) {
      bookmarks = bookmarks.filter(b => b.targetType === targetType);
    }
    
    return bookmarks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createBookmark(insertBookmark: InsertBookmark): Promise<Bookmark> {
    const id = randomUUID();
    const bookmark: Bookmark = { id, ...insertBookmark, createdAt: new Date() };
    this.bookmarks.set(id, bookmark);
    
    // Update bookmarksCount for stations
    if (insertBookmark.targetType === "STATION") {
      const station = await this.getStation(insertBookmark.targetId);
      if (station) {
        await this.updateStation(insertBookmark.targetId, { 
          bookmarksCount: station.bookmarksCount + 1 
        });
      }
    }
    
    return bookmark;
  }

  async deleteBookmark(id: string): Promise<boolean> {
    const bookmark = this.bookmarks.get(id);
    if (!bookmark) return false;
    
    const deleted = this.bookmarks.delete(id);
    
    // Update bookmarksCount for stations
    if (deleted && bookmark.targetType === "STATION") {
      const station = await this.getStation(bookmark.targetId);
      if (station) {
        await this.updateStation(bookmark.targetId, { 
          bookmarksCount: Math.max(0, station.bookmarksCount - 1)
        });
      }
    }
    
    return deleted;
  }

  async getBookmark(userId: string, targetId: string): Promise<Bookmark | undefined> {
    return Array.from(this.bookmarks.values()).find(
      b => b.userId === userId && b.targetId === targetId
    );
  }

  // Questions
  async getQuestions(filters?: { tag?: string; sort?: string; limit?: number; offset?: number }): Promise<Question[]> {
    let questions = Array.from(this.questions.values());
    
    if (filters?.tag) {
      questions = questions.filter(q => q.tags?.includes(filters.tag!));
    }
    
    if (filters?.sort === 'upvotes') {
      questions.sort((a, b) => (b.upvotes?.length || 0) - (a.upvotes?.length || 0));
    } else {
      questions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    return questions.slice(offset, offset + limit);
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = randomUUID();
    const question: Question = {
      id,
      authorId: insertQuestion.authorId,
      title: insertQuestion.title,
      body: insertQuestion.body,
      tags: insertQuestion.tags ?? [],
      solvedAnswerId: insertQuestion.solvedAnswerId ?? null,
      upvotes: [],
      answersCount: 0,
      createdAt: new Date(),
    };
    this.questions.set(id, question);
    return question;
  }

  async updateQuestion(id: string, updates: Partial<Omit<Question, 'id' | 'createdAt' | 'authorId'>>): Promise<Question | undefined> {
    const question = this.questions.get(id);
    if (!question) return undefined;
    const updated = { ...question, ...updates };
    this.questions.set(id, updated);
    return updated;
  }

  async toggleQuestionUpvote(questionId: string, userId: string): Promise<Question | undefined> {
    const question = this.questions.get(questionId);
    if (!question) return undefined;
    
    const upvotes = question.upvotes || [];
    const index = upvotes.indexOf(userId);
    
    if (index > -1) {
      upvotes.splice(index, 1);
    } else {
      upvotes.push(userId);
    }
    
    const updated = { ...question, upvotes };
    this.questions.set(questionId, updated);
    return updated;
  }

  async deleteQuestion(id: string): Promise<boolean> {
    // Delete all answers for this question
    const answers = Array.from(this.answers.values()).filter(a => a.questionId === id);
    answers.forEach(answer => this.answers.delete(answer.id));
    
    // Delete the question
    return this.questions.delete(id);
  }

  // Answers
  async getAnswers(questionId: string): Promise<Answer[]> {
    return Array.from(this.answers.values())
      .filter(a => a.questionId === questionId)
      .sort((a, b) => (b.upvotes?.length || 0) - (a.upvotes?.length || 0));
  }

  async getAnswer(id: string): Promise<Answer | undefined> {
    return this.answers.get(id);
  }

  async createAnswer(insertAnswer: InsertAnswer): Promise<Answer> {
    const id = randomUUID();
    const answer: Answer = { id, ...insertAnswer, upvotes: [], createdAt: new Date() };
    this.answers.set(id, answer);
    
    const question = await this.getQuestion(insertAnswer.questionId);
    if (question) {
      await this.updateQuestion(insertAnswer.questionId, { answersCount: question.answersCount + 1 });
    }
    
    return answer;
  }

  async toggleAnswerUpvote(answerId: string, userId: string): Promise<Answer | undefined> {
    const answer = this.answers.get(answerId);
    if (!answer) return undefined;
    
    const upvotes = answer.upvotes || [];
    const index = upvotes.indexOf(userId);
    
    if (index > -1) {
      upvotes.splice(index, 1);
    } else {
      upvotes.push(userId);
    }
    
    const updated = { ...answer, upvotes };
    this.answers.set(answerId, updated);
    return updated;
  }

  // Articles
  async getArticles(filters?: { kind?: string; tag?: string; limit?: number }): Promise<Article[]> {
    let articles = Array.from(this.articles.values());
    
    if (filters?.kind) {
      articles = articles.filter(a => a.kind === filters.kind);
    }
    if (filters?.tag) {
      articles = articles.filter(a => a.tags?.includes(filters.tag!));
    }
    
    articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    
    const limit = filters?.limit || 50;
    return articles.slice(0, limit);
  }

  async getArticle(id: string): Promise<Article | undefined> {
    return this.articles.get(id);
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const id = randomUUID();
    const article: Article = {
      id,
      kind: insertArticle.kind,
      title: insertArticle.title,
      summary: insertArticle.summary,
      body: insertArticle.body,
      coverImageUrl: insertArticle.coverImageUrl ?? null,
      tags: insertArticle.tags ?? [],
      likes: [],
      commentsCount: 0,
      authorId: insertArticle.authorId,
      publishedAt: new Date(),
    };
    this.articles.set(id, article);
    return article;
  }

  async toggleArticleLike(articleId: string, userId: string): Promise<Article | undefined> {
    const article = this.articles.get(articleId);
    if (!article) return undefined;
    
    const likes = article.likes || [];
    const index = likes.indexOf(userId);
    
    if (index > -1) {
      likes.splice(index, 1);
    } else {
      likes.push(userId);
    }
    
    const updated = { ...article, likes };
    this.articles.set(articleId, updated);
    return updated;
  }

  async deleteArticle(id: string): Promise<boolean> {
    const deleted = this.articles.delete(id);
    // Also delete all comments for this article
    const comments = Array.from(this.articleComments.values()).filter(c => c.articleId === id);
    comments.forEach(c => this.articleComments.delete(c.id));
    return deleted;
  }

  // Article Comments
  async getArticleComments(articleId: string): Promise<ArticleComment[]> {
    return Array.from(this.articleComments.values())
      .filter(c => c.articleId === articleId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getArticleComment(id: string): Promise<ArticleComment | undefined> {
    return this.articleComments.get(id);
  }

  async createArticleComment(insertComment: InsertArticleComment): Promise<ArticleComment> {
    const id = randomUUID();
    const comment: ArticleComment = { id, ...insertComment, createdAt: new Date() };
    this.articleComments.set(id, comment);
    
    const article = await this.getArticle(insertComment.articleId);
    if (article) {
      const updated = { ...article, commentsCount: article.commentsCount + 1 };
      this.articles.set(insertComment.articleId, updated);
    }
    
    return comment;
  }

  async deleteArticleComment(id: string): Promise<boolean> {
    const comment = this.articleComments.get(id);
    if (!comment) return false;
    
    this.articleComments.delete(id);
    
    const article = await this.getArticle(comment.articleId);
    if (article) {
      const updated = { ...article, commentsCount: Math.max(0, article.commentsCount - 1) };
      this.articles.set(comment.articleId, updated);
    }
    
    return true;
  }

  // Reports
  async getReports(filters?: { status?: string; limit?: number }): Promise<Report[]> {
    let reports = Array.from(this.reports.values());
    
    if (filters?.status) {
      reports = reports.filter(r => r.status === filters.status);
    }
    
    reports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    const limit = filters?.limit || 100;
    return reports.slice(0, limit);
  }

  async getReport(id: string): Promise<Report | undefined> {
    return this.reports.get(id);
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const id = randomUUID();
    const report: Report = {
      id,
      reporterId: insertReport.reporterId,
      targetType: insertReport.targetType,
      targetId: insertReport.targetId,
      reason: insertReport.reason,
      handledBy: insertReport.handledBy ?? null,
      status: "OPEN",
      createdAt: new Date(),
    };
    this.reports.set(id, report);
    return report;
  }

  async updateReport(id: string, updates: Partial<Omit<Report, 'id' | 'createdAt' | 'reporterId'>>): Promise<Report | undefined> {
    const report = this.reports.get(id);
    if (!report) return undefined;
    const updated = { ...report, ...updates };
    this.reports.set(id, updated);
    return updated;
  }

  // Audit Logs
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const log: AuditLog = {
      id,
      action: insertLog.action,
      actorId: insertLog.actorId ?? null,
      targetType: insertLog.targetType ?? null,
      targetId: insertLog.targetId ?? null,
      metadata: insertLog.metadata ?? null,
      createdAt: new Date(),
    };
    this.auditLogs.set(id, log);
    return log;
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Knowledge Categories
  async getKnowledgeCategories(): Promise<KnowledgeCategory[]> {
    return Array.from(this.knowledgeCategories.values());
  }

  async getKnowledgeCategory(id: string): Promise<KnowledgeCategory | undefined> {
    return this.knowledgeCategories.get(id);
  }

  async createKnowledgeCategory(insertCategory: InsertKnowledgeCategory): Promise<KnowledgeCategory> {
    const id = randomUUID();
    const category: KnowledgeCategory = {
      id,
      name: insertCategory.name,
      description: insertCategory.description,
      icon: insertCategory.icon || "BookOpen",
      color: insertCategory.color || "text-blue-500",
      createdBy: insertCategory.createdBy,
      createdAt: new Date(),
    };
    this.knowledgeCategories.set(id, category);
    return category;
  }

  async deleteKnowledgeCategory(id: string): Promise<boolean> {
    return this.knowledgeCategories.delete(id);
  }
}

export async function createStorage(): Promise<IStorage> {
  const useMongoDB = process.env.USE_MONGODB === 'true';

  if (useMongoDB) {
    const { connectToMongoDB } = await import("./mongo-storage");
    await connectToMongoDB(process.env.MONGODB_URI);
    const { MongoStorage } = await import("./mongo-storage");
    return new MongoStorage();
  } else {
    return new MemStorage();
  }
}

// Default export for backward compatibility
export const storage = new MemStorage();
