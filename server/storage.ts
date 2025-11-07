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
  type Report, type InsertReport,
  type AuditLog, type InsertAuditLog,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | undefined>;
  
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
  
  // Answers
  getAnswers(questionId: string): Promise<Answer[]>;
  getAnswer(id: string): Promise<Answer | undefined>;
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  toggleAnswerUpvote(answerId: string, userId: string): Promise<Answer | undefined>;
  
  // Articles
  getArticles(filters?: { kind?: string; tag?: string; limit?: number }): Promise<Article[]>;
  getArticle(id: string): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  
  // Reports
  getReports(filters?: { status?: string; limit?: number }): Promise<Report[]>;
  getReport(id: string): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: string, updates: Partial<Omit<Report, 'id' | 'createdAt' | 'reporterId'>>): Promise<Report | undefined>;
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
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
  private reports: Map<string, Report>;
  private auditLogs: Map<string, AuditLog>;

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
    this.reports = new Map();
    this.auditLogs = new Map();
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

  // Profiles
  async getProfile(userId: string): Promise<Profile | undefined> {
    return Array.from(this.profiles.values()).find(p => p.userId === userId);
  }

  async getProfileById(id: string): Promise<Profile | undefined> {
    return this.profiles.get(id);
  }

  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const id = randomUUID();
    const profile: Profile = {
      id,
      userId: insertProfile.userId,
      displayName: insertProfile.displayName,
      avatarUrl: insertProfile.avatarUrl ?? null,
      bio: insertProfile.bio ?? null,
      location: insertProfile.location as Profile['location'] ?? null,
      vehicle: insertProfile.vehicle as Profile['vehicle'] ?? null,
      interests: insertProfile.interests ?? null,
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
      authorId: insertArticle.authorId,
      publishedAt: new Date(),
    };
    this.articles.set(id, article);
    return article;
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
}

export const storage = new MemStorage();
