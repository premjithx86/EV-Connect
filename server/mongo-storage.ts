import mongoose, { Schema, Document } from 'mongoose';
import { IStorage, SearchLimits, SearchResults } from "./storage";
import {
  User, Profile, Community, CommunityMember, Post, Comment,
  Station, Bookmark, Question, Answer, Article, ArticleComment, Report, AuditLog, KnowledgeCategory,
  UserFollow, UserBlock, Notification, Conversation, Message
} from "./models";
import {
  type User as UserType, type InsertUser,
  type Profile as ProfileType, type InsertProfile,
  type Community as CommunityType, type InsertCommunity,
  type CommunityMember as CommunityMemberType, type InsertCommunityMember,
  type Post as PostType, type InsertPost,
  type Comment as CommentType, type InsertComment,
  type Station as StationType, type InsertStation,
  type Bookmark as BookmarkType, type InsertBookmark,
  type Question as QuestionType, type InsertQuestion,
  type Answer as AnswerType, type InsertAnswer,
  type Article as ArticleType, type InsertArticle,
  type ArticleComment as ArticleCommentType, type InsertArticleComment,
  type Report as ReportType, type InsertReport,
  type AuditLog as AuditLogType, type InsertAuditLog,
  type KnowledgeCategory as KnowledgeCategoryType, type InsertKnowledgeCategory,
  type UserFollow as UserFollowType, type InsertUserFollow,
  type UserBlock as UserBlockType, type InsertUserBlock,
  type Notification as NotificationType, type InsertNotification,
  type Conversation as ConversationType, type InsertConversation,
  type Message as MessageType, type InsertMessage,
} from "@shared/schema";
import { randomUUID } from "crypto";

// Connection function
export async function connectToMongoDB(uri: string = 'mongodb://localhost:27017/evconnect') {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export class MongoStorage implements IStorage {
  constructor() {
    if (mongoose.connection.readyState === 0) {
      throw new Error("MongoDB not connected. Call connectToMongoDB first.");
    }
  }

  private resolveSearchLimits(limits?: SearchLimits) {
    return {
      communities: limits?.communities ?? 10,
      posts: limits?.posts ?? 10,
      stations: limits?.stations ?? 10,
      users: limits?.users ?? 10,
    };
  }

  async searchEntities(query: string, limits?: SearchLimits): Promise<SearchResults> {
    const trimmed = query.trim();
    if (!trimmed) {
      return { communities: [], posts: [], stations: [], users: [] };
    }

    const { communities: communityLimit, posts: postLimit, stations: stationLimit, users: userLimit } = this.resolveSearchLimits(limits);

    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapeRegExp(trimmed), "i");

    const [communityDocs, postDocs, stationDocs, profileDocs, userDocs] = await Promise.all([
      Community.find({
        $or: [
          { name: regex },
          { description: regex },
        ],
      })
        .limit(communityLimit)
        .select("_id name slug description memberCount")
        .lean<Record<string, any>>(),
      Post.find({
        $or: [
          { title: regex },
          { text: regex },
        ],
      })
        .limit(postLimit)
        .select("_id title text communityId")
        .lean<Record<string, any>>(),
      Station.find({
        $or: [
          { name: regex },
          { "location.address": regex },
          { "location.city": regex },
          { "location.state": regex },
          { "location.country": regex },
          { operator: regex },
        ],
      })
        .limit(stationLimit)
        .select("_id name location.address location.city location.state location.country")
        .lean<Record<string, any>>(),
      Profile.find({ displayName: regex })
        .limit(userLimit)
        .select("userId displayName avatarUrl")
        .lean<Record<string, any>>(),
      User.find({ email: regex })
        .limit(userLimit)
        .select("_id email")
        .lean<Record<string, any>>(),
    ]);

    const communities = (communityDocs as Array<Record<string, any>>).map((community) => ({
      id: community._id as string,
      name: community.name as string,
      slug: (community.slug as string | undefined) ?? null,
      description: (community.description as string | undefined) ?? null,
      membersCount: (community.memberCount as number | undefined) ?? null,
    }));

    const createSnippet = (text?: string | null) => {
      if (!text) return "";
      const lower = text.toLowerCase();
      const index = lower.indexOf(trimmed.toLowerCase());
      if (index === -1) {
        return text.slice(0, 120);
      }
      const start = Math.max(0, index - 40);
      return text.slice(start, start + 160);
    };

    const posts = (postDocs as Array<Record<string, any>>).map((post) => ({
      id: post._id as string,
      title: (post.title as string | undefined) ?? null,
      text: createSnippet(post.text as string | undefined),
      communityId: (post.communityId as string | undefined) ?? null,
    }));

    const stations = (stationDocs as Array<Record<string, any>>).map((station) => ({
      id: station._id as string,
      name: station.name as string,
      address: (station.location?.address as string | undefined) ?? null,
      city: (station.location?.city as string | undefined) ?? null,
      state: (station.location?.state as string | undefined) ?? null,
      country: (station.location?.country as string | undefined) ?? null,
    }));

    const userMap = new Map<string, { id: string; displayName?: string | null; email?: string | null; avatarUrl?: string | null }>();

    for (const profile of profileDocs as Array<Record<string, any>>) {
      userMap.set(profile.userId as string, {
        id: profile.userId as string,
        displayName: (profile.displayName as string | undefined) ?? null,
        email: null,
        avatarUrl: (profile.avatarUrl as string | undefined) ?? null,
      });
      if (userMap.size >= userLimit) break;
    }

    for (const user of userDocs as Array<Record<string, any>>) {
      const existing = userMap.get(user._id as string);
      if (existing) {
        existing.email = (user.email as string | undefined) ?? null;
      } else if (userMap.size < userLimit) {
        userMap.set(user._id as string, {
          id: user._id as string,
          displayName: null,
          email: (user.email as string | undefined) ?? null,
          avatarUrl: null,
        });
      }
      if (userMap.size >= userLimit) break;
    }

    return {
      communities: communities as SearchResults["communities"],
      posts: posts as SearchResults["posts"],
      stations: stations as SearchResults["stations"],
      users: Array.from(userMap.values()).slice(0, userLimit) as SearchResults["users"],
    };
  }

  // Users
  async getUser(id: string): Promise<UserType | undefined> {
    console.log("[MongoStorage] getUser called with ID:", id, "Type:", typeof id);
    const user = await User.findOne({ _id: id });
    console.log("[MongoStorage] Query result:", user ? `Found user: ${user.email}` : "No user found");
    if (user) {
      console.log("[MongoStorage] User _id:", user._id, "Type:", typeof user._id);
    }
    return user ? {
      id: user._id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt
    } : undefined;
  }

  async getUserByEmail(email: string): Promise<UserType | undefined> {
    const user = await User.findOne({ email });
    return user ? {
      id: user._id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt
    } : undefined;
  }

  async createUser(user: InsertUser): Promise<UserType> {
    const id = randomUUID();
    const newUser = new User({
      _id: id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role || 'USER',
      status: user.status || 'ACTIVE'
    });
    await newUser.save();
    return {
      id: newUser._id,
      email: newUser.email,
      passwordHash: newUser.passwordHash,
      role: newUser.role,
      status: newUser.status,
      createdAt: newUser.createdAt
    };
  }

  async updateUser(id: string, updates: Partial<Omit<UserType, 'id' | 'createdAt'>>): Promise<UserType | undefined> {
    const user = await User.findOneAndUpdate({ _id: id }, updates, { new: true });
    return user ? {
      id: user._id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt
    } : undefined;
  }

  async getUsers(): Promise<UserType[]> {
    const users = await User.find();
    return users.map(user => ({
      id: user._id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt
    }));
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await User.deleteOne({ _id: id });
    // Also delete user's profile
    await Profile.deleteOne({ userId: id });
    return result.deletedCount > 0;
  }

  // Profiles
  private async syncUserFollowCounts(userId: string): Promise<void> {
    const [followersCount, followingCount] = await Promise.all([
      UserFollow.countDocuments({ followingId: userId }),
      UserFollow.countDocuments({ followerId: userId }),
    ]);
    await Profile.findOneAndUpdate(
      { userId },
      {
        followersCount,
        followingCount,
      },
      { new: true }
    );
  }

  private mapProfile(profile: any): ProfileType {
    return {
      id: profile._id,
      userId: profile.userId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl ?? null,
      bio: profile.bio ?? null,
      location: profile.location ?? null,
      vehicle: profile.vehicle ?? null,
      interests: profile.interests ?? null,
      followersCount: profile.followersCount ?? 0,
      followingCount: profile.followingCount ?? 0,
      notificationPrefs: profile.notificationPrefs ?? { newPost: true, like: true, comment: true },
      acceptsMessages: profile.acceptsMessages ?? true,
    } as ProfileType;
  }

  async getProfile(userId: string): Promise<ProfileType | undefined> {
    const profile = await Profile.findOne({ userId });
    return profile ? {
      ...this.mapProfile(profile),
    } : undefined;
  }

  async getProfileById(id: string): Promise<ProfileType | undefined> {
    const profile = await Profile.findById(id);
    return profile ? {
      ...this.mapProfile(profile),
    } : undefined;
  }

  async createProfile(profile: InsertProfile): Promise<ProfileType> {
    const id = randomUUID();
    const newProfile = new Profile({
      _id: id,
      userId: profile.userId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      location: profile.location,
      vehicle: profile.vehicle,
      interests: profile.interests,
      followersCount: profile.followersCount ?? 0,
      followingCount: profile.followingCount ?? 0,
      notificationPrefs: profile.notificationPrefs ?? { newPost: true, like: true, comment: true },
      acceptsMessages: profile.acceptsMessages ?? true,
    });
    await newProfile.save();
    return this.mapProfile(newProfile);
  }

  async updateProfile(userId: string, updates: Partial<Omit<ProfileType, 'id' | 'userId'>>): Promise<ProfileType | undefined> {
    const profile = await Profile.findOneAndUpdate({ userId }, updates, { new: true });
    return profile ? this.mapProfile(profile) : undefined;
  }

  private mapUserFollow(doc: any): UserFollowType {
    return {
      id: doc._id,
      followerId: doc.followerId,
      followingId: doc.followingId,
      createdAt: doc.createdAt,
    } as UserFollowType;
  }

  private mapUserBlock(doc: any): UserBlockType {
    return {
      id: doc._id,
      blockerId: doc.blockerId,
      blockedId: doc.blockedId,
      createdAt: doc.createdAt,
    } as UserBlockType;
  }

  private mapNotification(doc: any): NotificationType {
    return {
      id: doc._id,
      userId: doc.userId,
      type: doc.type,
      actorId: doc.actorId ?? null,
      targetType: doc.targetType ?? null,
      targetId: doc.targetId ?? null,
      metadata: doc.metadata ?? null,
      isRead: doc.isRead,
      createdAt: doc.createdAt,
    } as NotificationType;
  }

  private mapConversation(doc: any): ConversationType {
    return {
      id: doc._id,
      participantAId: doc.participantAId,
      participantBId: doc.participantBId,
      createdAt: doc.createdAt,
    } as ConversationType;
  }

  private mapMessage(doc: any): MessageType {
    return {
      id: doc._id,
      conversationId: doc.conversationId,
      senderId: doc.senderId,
      body: doc.body,
      isRead: doc.isRead,
      readAt: doc.readAt ?? null,
      createdAt: doc.createdAt,
    } as MessageType;
  }

  // Social: Follows
  async followUser(followerId: string, followingId: string): Promise<UserFollowType> {
    const existing = await UserFollow.findOne({ followerId, followingId });
    if (existing) {
      return this.mapUserFollow(existing);
    }

    const id = randomUUID();
    const follow = new UserFollow({
      _id: id,
      followerId,
      followingId,
    });
    await follow.save();
    await Promise.all([
      this.syncUserFollowCounts(followerId),
      this.syncUserFollowCounts(followingId),
    ]);
    return this.mapUserFollow(follow);
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const result = await UserFollow.deleteOne({ followerId, followingId });
    if (result.deletedCount && result.deletedCount > 0) {
      await Promise.all([
        this.syncUserFollowCounts(followerId),
        this.syncUserFollowCounts(followingId),
      ]);
      return true;
    }
    return false;
  }

  async getFollowers(userId: string): Promise<UserFollowType[]> {
    const docs = await UserFollow.find({ followingId: userId }).sort({ createdAt: -1 });
    return docs.map((doc) => this.mapUserFollow(doc));
  }

  async getFollowing(userId: string): Promise<UserFollowType[]> {
    const docs = await UserFollow.find({ followerId: userId }).sort({ createdAt: -1 });
    return docs.map((doc) => this.mapUserFollow(doc));
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const count = await UserFollow.countDocuments({ followerId, followingId });
    return count > 0;
  }

  // Social: Blocks
  async blockUser(blockerId: string, blockedId: string): Promise<UserBlockType> {
    const existing = await UserBlock.findOne({ blockerId, blockedId });
    if (existing) {
      return this.mapUserBlock(existing);
    }

    const id = randomUUID();
    const block = new UserBlock({
      _id: id,
      blockerId,
      blockedId,
    });
    await block.save();

    const removedFollows = await UserFollow.deleteMany({
      $or: [
        { followerId: blockerId, followingId: blockedId },
        { followerId: blockedId, followingId: blockerId },
      ],
    });

    if (removedFollows.deletedCount && removedFollows.deletedCount > 0) {
      await Promise.all([
        this.syncUserFollowCounts(blockerId),
        this.syncUserFollowCounts(blockedId),
      ]);
    }

    return this.mapUserBlock(block);
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await UserBlock.deleteOne({ blockerId, blockedId });
    return !!(result.deletedCount && result.deletedCount > 0);
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const count = await UserBlock.countDocuments({ blockerId, blockedId });
    return count > 0;
  }

  async getBlockedUsers(userId: string): Promise<UserBlockType[]> {
    const docs = await UserBlock.find({ blockerId: userId }).sort({ createdAt: -1 });
    return docs.map((doc) => this.mapUserBlock(doc));
  }

  async getBlockedByUsers(userId: string): Promise<UserBlockType[]> {
    const docs = await UserBlock.find({ blockedId: userId }).sort({ createdAt: -1 });
    return docs.map((doc) => this.mapUserBlock(doc));
  }

  // Notifications
  async createNotification(notification: InsertNotification): Promise<NotificationType> {
    const id = randomUUID();
    const entity = new Notification({
      _id: id,
      userId: notification.userId,
      type: notification.type,
      actorId: notification.actorId ?? null,
      targetType: notification.targetType ?? null,
      targetId: notification.targetId ?? null,
      metadata: notification.metadata ?? null,
      isRead: false,
    });
    await entity.save();
    return this.mapNotification(entity);
  }

  async getNotifications(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<NotificationType[]> {
    const query: Record<string, unknown> = { userId };
    if (options?.unreadOnly) {
      query.isRead = false;
    }
    let finder = Notification.find(query).sort({ createdAt: -1 });
    if (options?.limit !== undefined) {
      finder = finder.limit(options.limit);
    }
    const docs = await finder;
    return docs.map((doc) => this.mapNotification(doc));
  }

  async markNotificationRead(userId: string, notificationId: string): Promise<NotificationType | undefined> {
    const doc = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );
    return doc ? this.mapNotification(doc) : undefined;
  }

  async markAllNotificationsRead(userId: string): Promise<number> {
    const result = await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    return result.modifiedCount ?? 0;
  }

  // Conversations & Messages
  async getConversation(conversationId: string): Promise<ConversationType | undefined> {
    const doc = await Conversation.findById(conversationId);
    return doc ? this.mapConversation(doc) : undefined;
  }

  async findConversationBetween(userAId: string, userBId: string): Promise<ConversationType | undefined> {
    const doc = await Conversation.findOne({
      $or: [
        { participantAId: userAId, participantBId: userBId },
        { participantAId: userBId, participantBId: userAId },
      ],
    });
    return doc ? this.mapConversation(doc) : undefined;
  }

  async createConversation(data: InsertConversation): Promise<ConversationType> {
    const existing = await Conversation.findOne({
      $or: [
        { participantAId: data.participantAId, participantBId: data.participantBId },
        { participantAId: data.participantBId, participantBId: data.participantAId },
      ],
    });
    if (existing) {
      return this.mapConversation(existing);
    }

    const id = randomUUID();
    const conversation = new Conversation({
      _id: id,
      participantAId: data.participantAId,
      participantBId: data.participantBId,
    });
    await conversation.save();
    return this.mapConversation(conversation);
  }

  async getConversationsForUser(userId: string): Promise<ConversationType[]> {
    const docs = await Conversation.find({
      $or: [
        { participantAId: userId },
        { participantBId: userId },
      ],
    }).sort({ createdAt: -1 });
    return docs.map((doc) => this.mapConversation(doc));
  }

  async createMessage(message: InsertMessage): Promise<MessageType> {
    const id = randomUUID();
    const entity = new Message({
      _id: id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      body: message.body,
      isRead: false,
      readAt: null,
    });
    await entity.save();
    return this.mapMessage(entity);
  }

  async getMessages(conversationId: string, options?: { limit?: number; before?: Date }): Promise<MessageType[]> {
    const query: Record<string, unknown> = { conversationId };
    if (options?.before) {
      query.createdAt = { $lt: options.before };
    }
    let finder = Message.find(query).sort({ createdAt: -1 });
    if (options?.limit !== undefined) {
      finder = finder.limit(options.limit);
    }
    const docs = await finder.exec();
    return docs.reverse().map((doc) => this.mapMessage(doc));
  }

  async markMessageRead(conversationId: string, messageId: string, userId: string): Promise<MessageType | undefined> {
    const message = await Message.findOne({ _id: messageId, conversationId });
    if (!message) {
      return undefined;
    }
    if (message.senderId === userId) {
      return this.mapMessage(message);
    }
    message.isRead = true;
    message.readAt = new Date();
    await message.save();
    return this.mapMessage(message);
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const conversationIds = await Conversation.find({
      $or: [
        { participantAId: userId },
        { participantBId: userId },
      ],
    }).distinct("_id");

    if (!conversationIds || conversationIds.length === 0) {
      return 0;
    }

    return Message.countDocuments({
      conversationId: { $in: conversationIds },
      senderId: { $ne: userId },
      isRead: false,
    });
  }

  // Communities
  async getCommunities(filters?: { search?: string; type?: string }): Promise<CommunityType[]> {
    let query: any = {};
    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }
    if (filters?.type) query.type = filters.type;

    const communities = await Community.find(query).sort({ createdAt: -1 });
    return communities.map(c => ({
      id: c._id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      type: c.type,
      coverImageUrl: c.coverImageUrl,
      moderators: [c.createdBy],
      membersCount: c.memberCount,
      createdAt: c.createdAt
    } as any));
  }

  async getCommunity(id: string): Promise<CommunityType | undefined> {
    const community = await Community.findById(id);
    return community ? {
      id: community._id,
      name: community.name,
      slug: community.slug,
      description: community.description,
      type: community.type,
      coverImageUrl: community.coverImageUrl,
      moderators: [community.createdBy],
      membersCount: community.memberCount,
      createdAt: community.createdAt
    } as any : undefined;
  }

  async getCommunityBySlug(slug: string): Promise<CommunityType | undefined> {
    const community = await Community.findOne({ slug });
    return community ? {
      id: community._id,
      name: community.name,
      slug: community.slug,
      description: community.description,
      type: community.type,
      coverImageUrl: community.coverImageUrl,
      moderators: [community.createdBy],
      membersCount: community.memberCount,
      createdAt: community.createdAt
    } as any : undefined;
  }

  async createCommunity(community: InsertCommunity): Promise<CommunityType> {
    const id = randomUUID();
    
    // Extract createdBy from moderators array (first moderator is the creator)
    const createdBy = (community as any).moderators?.[0] || (community as any).createdBy;
    
    console.log("[MONGO STORAGE] Creating community with data:", {
      name: community.name,
      slug: community.slug,
      type: community.type,
      createdBy
    });
    
    const newCommunity = new Community({
      _id: id,
      name: community.name,
      slug: community.slug,
      description: community.description,
      type: community.type,
      avatarUrl: (community as any).avatarUrl,
      coverImageUrl: community.coverImageUrl,
      createdBy: createdBy,
      memberCount: 0
    });
    
    await newCommunity.save();
    console.log("[MONGO STORAGE] Community saved successfully:", newCommunity._id);
    
    return {
      id: newCommunity._id,
      name: newCommunity.name,
      slug: newCommunity.slug,
      description: newCommunity.description,
      type: newCommunity.type,
      coverImageUrl: newCommunity.coverImageUrl,
      moderators: [createdBy],
      membersCount: newCommunity.memberCount,
      createdAt: newCommunity.createdAt
    } as any;
  }

  async updateCommunity(id: string, updates: Partial<Omit<CommunityType, 'id' | 'createdAt'>>): Promise<CommunityType | undefined> {
    const community = await Community.findByIdAndUpdate(id, updates, { new: true });
    return community ? {
      id: community._id,
      name: community.name,
      slug: community.slug,
      description: community.description,
      type: community.type,
      coverImageUrl: community.coverImageUrl,
      moderators: [community.createdBy],
      membersCount: community.memberCount,
      createdAt: community.createdAt
    } as any : undefined;
  }

  async deleteCommunity(id: string): Promise<boolean> {
    const result = await Community.deleteOne({ _id: id });
    // Also delete all community members
    await CommunityMember.deleteMany({ communityId: id });
    return result.deletedCount > 0;
  }

  // Community Members
  async joinCommunity(data: InsertCommunityMember): Promise<CommunityMemberType> {
    const existing = await CommunityMember.findOne({ communityId: data.communityId, userId: data.userId });
    if (existing) {
      return {
        id: existing._id,
        communityId: existing.communityId,
        userId: existing.userId,
        joinedAt: existing.joinedAt,
      };
    }

    const id = randomUUID();
    const member = new CommunityMember({
      _id: id,
      communityId: data.communityId,
      userId: data.userId,
    });
    await member.save();
    await Community.findByIdAndUpdate(data.communityId, { $inc: { memberCount: 1 } });
    return {
      id: member._id,
      communityId: member.communityId,
      userId: member.userId,
      joinedAt: member.joinedAt,
    };
  }

  async leaveCommunity(communityId: string, userId: string): Promise<boolean> {
    const result = await CommunityMember.deleteMany({ communityId, userId });
    if (result.deletedCount && result.deletedCount > 0) {
      await Community.findByIdAndUpdate(communityId, { $inc: { memberCount: -result.deletedCount } });
      return true;
    }
    return false;
  }

  async isCommunityMember(communityId: string, userId: string): Promise<boolean> {
    const member = await CommunityMember.findOne({ communityId, userId });
    return !!member;
  }

  async getCommunityMembers(communityId: string): Promise<CommunityMemberType[]> {
    const members = await CommunityMember.find({ communityId });
    return members.map(m => ({
      id: m._id,
      communityId: m.communityId,
      userId: m.userId,
      joinedAt: m.joinedAt
    }));
  }

  // Posts
  async getPosts(filters?: { communityId?: string; authorId?: string; visibility?: string; limit?: number; offset?: number }): Promise<PostType[]> {
    let query: any = {};
    if (filters?.communityId) query.communityId = filters.communityId;
    if (filters?.authorId) query.authorId = filters.authorId;
    if (filters?.visibility) query.visibility = filters.visibility;

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const posts = await Post.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit);
    return posts.map(p => ({
      id: p._id,
      text: p.text,
      authorId: p.authorId,
      communityId: p.communityId,
      media: p.media,
      likes: p.likes || [],
      commentsCount: p.commentsCount || 0,
      visibility: p.visibility,
      createdAt: p.createdAt
    }));
  }

  async getPost(id: string): Promise<PostType | undefined> {
    const post = await Post.findById(id);
    return post ? {
      id: post._id,
      text: post.text,
      authorId: post.authorId,
      communityId: post.communityId,
      media: post.media,
      likes: post.likes || [],
      commentsCount: post.commentsCount || 0,
      visibility: post.visibility,
      createdAt: post.createdAt
    } : undefined;
  }

  async createPost(post: InsertPost): Promise<PostType> {
    const id = randomUUID();
    const newPost = new Post({
      _id: id,
      text: post.text,
      authorId: post.authorId,
      communityId: post.communityId,
      title: post.title,
      media: post.media,
      likes: [],
      commentsCount: 0,
      visibility: post.visibility || 'PUBLIC'
    });
    await newPost.save();
    return {
      id: newPost._id,
      text: newPost.text,
      authorId: newPost.authorId,
      communityId: newPost.communityId,
      title: newPost.title,
      media: newPost.media,
      likes: newPost.likes || [],
      commentsCount: newPost.commentsCount || 0,
      visibility: newPost.visibility,
      createdAt: newPost.createdAt
    };
  }

  async updatePost(id: string, updates: Partial<Omit<PostType, 'id' | 'createdAt' | 'authorId'>>): Promise<PostType | undefined> {
    const post = await Post.findByIdAndUpdate(id, updates, { new: true });
    return post ? {
      id: post._id,
      text: post.text,
      authorId: post.authorId,
      communityId: post.communityId,
      media: post.media,
      likes: post.likes || [],
      commentsCount: post.commentsCount || 0,
      visibility: post.visibility,
      createdAt: post.createdAt
    } : undefined;
  }

  async deletePost(id: string): Promise<boolean> {
    const result = await Post.findByIdAndDelete(id);
    return !!result;
  }

  async togglePostLike(postId: string, userId: string): Promise<PostType | undefined> {
    const post = await Post.findById(postId);
    if (!post) return undefined;
    
    const likes = post.likes || [];
    const index = likes.indexOf(userId);
    
    if (index > -1) {
      likes.splice(index, 1);
    } else {
      likes.push(userId);
    }
    
    post.likes = likes;
    await post.save();
    
    return {
      id: post._id,
      text: post.text,
      authorId: post.authorId,
      communityId: post.communityId,
      media: post.media,
      likes: post.likes,
      commentsCount: post.commentsCount || 0,
      visibility: post.visibility,
      createdAt: post.createdAt
    };
  }

  // Comments
  async getComments(postId: string): Promise<CommentType[]> {
    const comments = await Comment.find({ postId }).sort({ createdAt: 1 });
    return comments.map(c => ({
      id: c._id,
      postId: c.postId,
      authorId: c.authorId,
      text: c.text,
      createdAt: c.createdAt
    }));
  }

  async getComment(id: string): Promise<CommentType | undefined> {
    const comment = await Comment.findById(id);
    return comment ? {
      id: comment._id,
      postId: comment.postId,
      authorId: comment.authorId,
      text: comment.text,
      createdAt: comment.createdAt
    } : undefined;
  }

  async createComment(comment: InsertComment): Promise<CommentType> {
    try {
      console.log("[MONGO] Creating comment with data:", comment);
      const id = randomUUID();
      const newComment = new Comment({
        _id: id,
        postId: comment.postId,
        authorId: comment.authorId,
        text: comment.text
      });
      console.log("[MONGO] Comment document created, saving...");
      await newComment.save();
      console.log("[MONGO] Comment saved successfully, updating post...");
      await Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: 1 } });
      console.log("[MONGO] Post updated, returning comment");
      return {
        id: newComment._id,
        postId: newComment.postId,
        authorId: newComment.authorId,
        text: newComment.text,
        createdAt: newComment.createdAt
      };
    } catch (error) {
      console.error("[MONGO ERROR] Failed to create comment:", error);
      throw error;
    }
  }

  async deleteComment(id: string): Promise<boolean> {
    const comment = await Comment.findById(id);
    if (!comment) return false;
    await Comment.findByIdAndDelete(id);
    await Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } });
    return true;
  }

  // Stations
  async getStations(filters?: { verified?: boolean; limit?: number }): Promise<StationType[]> {
    let query: any = {};
    if (filters?.verified !== undefined) query.verified = filters.verified;
    const limit = filters?.limit || 50;
    const stations = await Station.find(query).sort({ createdAt: -1 }).limit(limit);
    return stations.map(s => ({
      id: s._id,
      name: s.name,
      location: s.location,
      operator: s.operator,
      status: s.status,
      connectors: s.connectors,
      pricing: s.pricing,
      verified: s.verified,
      addedBy: s.addedBy,
      createdAt: s.createdAt
    }));
  }

  async getStation(id: string): Promise<StationType | undefined> {
    const station = await Station.findById(id);
    return station ? {
      id: station._id,
      name: station.name,
      location: station.location,
      operator: station.operator,
      status: station.status,
      connectors: station.connectors,
      pricing: station.pricing,
      verified: station.verified,
      addedBy: station.addedBy,
      createdAt: station.createdAt
    } : undefined;
  }

  async createStation(station: InsertStation): Promise<StationType> {
    const id = randomUUID();
    const newStation = new Station({
      _id: id,
      name: station.name,
      location: station.location,
      operator: station.operator,
      status: station.status,
      connectors: station.connectors,
      pricing: station.pricing,
      verified: station.verified || false,
      addedBy: station.addedBy
    });
    await newStation.save();
    return {
      id: newStation._id,
      name: newStation.name,
      location: newStation.location,
      operator: newStation.operator,
      status: newStation.status,
      connectors: newStation.connectors,
      pricing: newStation.pricing,
      verified: newStation.verified,
      addedBy: newStation.addedBy,
      createdAt: newStation.createdAt
    };
  }

  async updateStation(id: string, updates: Partial<Omit<StationType, 'id' | 'createdAt'>>): Promise<StationType | undefined> {
    const station = await Station.findByIdAndUpdate(id, updates, { new: true });
    return station ? {
      id: station._id,
      name: station.name,
      location: station.location,
      operator: station.operator,
      status: station.status,
      connectors: station.connectors,
      pricing: station.pricing,
      verified: station.verified,
      addedBy: station.addedBy,
      createdAt: station.createdAt
    } : undefined;
  }

  // Bookmarks
  async getBookmarks(userId: string, targetType?: string): Promise<BookmarkType[]> {
    let query: any = { userId };
    if (targetType) query.targetType = targetType;
    const bookmarks = await Bookmark.find(query).sort({ createdAt: -1 });
    return bookmarks.map(b => ({
      id: b._id,
      userId: b.userId,
      targetType: b.targetType,
      targetId: b.targetId,
      createdAt: b.createdAt
    }));
  }

  async createBookmark(bookmark: InsertBookmark): Promise<BookmarkType> {
    const id = randomUUID();
    const newBookmark = new Bookmark({
      _id: id,
      userId: bookmark.userId,
      targetType: bookmark.targetType,
      targetId: bookmark.targetId
    });
    await newBookmark.save();
    return {
      id: newBookmark._id,
      userId: newBookmark.userId,
      targetType: newBookmark.targetType,
      targetId: newBookmark.targetId,
      createdAt: newBookmark.createdAt
    };
  }

  async deleteBookmark(id: string): Promise<boolean> {
    const result = await Bookmark.findByIdAndDelete(id);
    return !!result;
  }

  async getBookmark(userId: string, targetId: string): Promise<BookmarkType | undefined> {
    const bookmark = await Bookmark.findOne({ userId, targetId });
    return bookmark ? {
      id: bookmark._id,
      userId: bookmark.userId,
      targetType: bookmark.targetType,
      targetId: bookmark.targetId,
      createdAt: bookmark.createdAt
    } : undefined;
  }

  // Questions
  async getQuestions(filters?: { tag?: string; sort?: string; limit?: number; offset?: number }): Promise<QuestionType[]> {
    let query: any = {};
    if (filters?.tag) query.tags = filters.tag;
    let sort: any = { createdAt: -1 };
    if (filters?.sort === 'upvotes') sort = { upvoteCount: -1 };
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const questions = await Question.find(query).sort(sort).skip(offset).limit(limit);
    return questions.map(q => ({
      id: q._id,
      title: q.title,
      body: q.content,
      authorId: q.authorId,
      tags: q.tags,
      upvotes: [],
      answersCount: q.answerCount,
      solvedAnswerId: q.solvedAnswerId,
      createdAt: q.createdAt
    }));
  }

  async getQuestion(id: string): Promise<QuestionType | undefined> {
    const question = await Question.findById(id);
    return question ? {
      id: question._id,
      title: question.title,
      body: question.content,
      authorId: question.authorId,
      tags: question.tags,
      upvotes: [],
      answersCount: question.answerCount,
      solvedAnswerId: question.solvedAnswerId,
      createdAt: question.createdAt
    } : undefined;
  }

  async createQuestion(question: InsertQuestion): Promise<QuestionType> {
    const id = randomUUID();
    const newQuestion = new Question({
      _id: id,
      title: question.title,
      content: question.body,
      authorId: question.authorId,
      tags: question.tags || [],
      upvoteCount: 0,
      answerCount: 0,
      solved: false,
      solvedAnswerId: question.solvedAnswerId || null
    });
    await newQuestion.save();
    return {
      id: newQuestion._id,
      title: newQuestion.title,
      body: newQuestion.content,
      authorId: newQuestion.authorId,
      tags: newQuestion.tags,
      upvotes: [],
      answersCount: newQuestion.answerCount,
      solvedAnswerId: newQuestion.solvedAnswerId,
      createdAt: newQuestion.createdAt
    };
  }

  async updateQuestion(id: string, updates: Partial<Omit<QuestionType, 'id' | 'createdAt' | 'authorId'>>): Promise<QuestionType | undefined> {
    const mongoUpdates: any = { ...updates };
    if (updates.body) {
      mongoUpdates.content = updates.body;
      delete mongoUpdates.body;
    }
    const question = await Question.findByIdAndUpdate(id, mongoUpdates, { new: true });
    return question ? {
      id: question._id,
      title: question.title,
      body: question.content,
      authorId: question.authorId,
      tags: question.tags,
      upvotes: [],
      answersCount: question.answerCount,
      solvedAnswerId: question.solvedAnswerId,
      createdAt: question.createdAt
    } : undefined;
  }

  async toggleQuestionUpvote(questionId: string, userId: string): Promise<QuestionType | undefined> {
    const question = await Question.findById(questionId);
    if (!question) return undefined;
    
    // Toggle upvote
    const hasUpvoted = question.upvoteCount > 0; // Simplified - in real app track individual votes
    question.upvoteCount = hasUpvoted ? question.upvoteCount - 1 : question.upvoteCount + 1;
    await question.save();
    
    return {
      id: question._id,
      title: question.title,
      body: question.content,
      authorId: question.authorId,
      tags: question.tags,
      upvotes: [],
      answersCount: question.answerCount,
      solvedAnswerId: question.solvedAnswerId,
      createdAt: question.createdAt
    };
  }

  async deleteQuestion(id: string): Promise<boolean> {
    // Delete all answers for this question
    await Answer.deleteMany({ questionId: id });
    
    // Delete the question
    const result = await Question.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // Answers
  async getAnswers(questionId: string): Promise<AnswerType[]> {
    const answers = await Answer.find({ questionId }).sort({ createdAt: 1 });
    return answers.map(a => ({
      id: a._id,
      questionId: a.questionId,
      authorId: a.authorId,
      body: a.content,
      upvotes: [],
      createdAt: a.createdAt
    }));
  }

  async getAnswer(id: string): Promise<AnswerType | undefined> {
    const answer = await Answer.findById(id);
    return answer ? {
      id: answer._id,
      questionId: answer.questionId,
      authorId: answer.authorId,
      body: answer.content,
      upvotes: [],
      createdAt: answer.createdAt
    } : undefined;
  }

  async createAnswer(answer: InsertAnswer): Promise<AnswerType> {
    const id = randomUUID();
    const newAnswer = new Answer({
      _id: id,
      questionId: answer.questionId,
      authorId: answer.authorId,
      content: answer.body,
      upvoteCount: 0
    });
    await newAnswer.save();
    await Question.findByIdAndUpdate(answer.questionId, { $inc: { answerCount: 1 } });
    return {
      id: newAnswer._id,
      questionId: newAnswer.questionId,
      authorId: newAnswer.authorId,
      body: newAnswer.content,
      upvotes: [],
      createdAt: newAnswer.createdAt
    };
  }

  async toggleAnswerUpvote(answerId: string, userId: string): Promise<AnswerType | undefined> {
    const answer = await Answer.findById(answerId);
    if (!answer) return undefined;
    
    // Toggle upvote
    const hasUpvoted = answer.upvoteCount > 0; // Simplified
    answer.upvoteCount = hasUpvoted ? answer.upvoteCount - 1 : answer.upvoteCount + 1;
    await answer.save();
    
    return {
      id: answer._id,
      questionId: answer.questionId,
      authorId: answer.authorId,
      body: answer.content,
      upvotes: [],
      createdAt: answer.createdAt
    };
  }

  // Articles
  async getArticles(filters?: { kind?: string; tag?: string; limit?: number }): Promise<ArticleType[]> {
    let query: any = {};
    if (filters?.kind) query.kind = filters.kind;
    if (filters?.tag) query.tags = filters.tag;
    const limit = filters?.limit || 50;
    const articles = await Article.find(query).sort({ publishedAt: -1 }).limit(limit);
    return articles.map(a => ({
      id: a._id,
      kind: a.kind,
      title: a.title,
      summary: a.summary,
      body: a.body,
      coverImageUrl: a.coverImageUrl,
      tags: a.tags,
      likes: a.likes || [],
      commentsCount: a.commentsCount || 0,
      authorId: a.authorId,
      publishedAt: a.publishedAt
    }));
  }

  async getArticle(id: string): Promise<ArticleType | undefined> {
    const article = await Article.findById(id);
    return article ? {
      id: article._id,
      kind: article.kind,
      title: article.title,
      summary: article.summary,
      body: article.body,
      coverImageUrl: article.coverImageUrl,
      tags: article.tags,
      likes: article.likes || [],
      commentsCount: article.commentsCount || 0,
      authorId: article.authorId,
      publishedAt: article.publishedAt
    } : undefined;
  }

  async createArticle(article: InsertArticle): Promise<ArticleType> {
    const id = randomUUID();
    const newArticle = new Article({
      _id: id,
      kind: article.kind,
      title: article.title,
      summary: article.summary,
      body: article.body,
      coverImageUrl: article.coverImageUrl,
      tags: article.tags,
      likes: [],
      commentsCount: 0,
      authorId: article.authorId
    });
    await newArticle.save();
    return {
      id: newArticle._id,
      kind: newArticle.kind,
      title: newArticle.title,
      summary: newArticle.summary,
      body: newArticle.body,
      coverImageUrl: newArticle.coverImageUrl,
      tags: newArticle.tags,
      likes: newArticle.likes || [],
      commentsCount: newArticle.commentsCount || 0,
      authorId: newArticle.authorId,
      publishedAt: newArticle.publishedAt
    };
  }

  async toggleArticleLike(articleId: string, userId: string): Promise<ArticleType | undefined> {
    const article = await Article.findById(articleId);
    if (!article) return undefined;
    
    const likes = article.likes || [];
    const index = likes.indexOf(userId);
    
    if (index > -1) {
      likes.splice(index, 1);
    } else {
      likes.push(userId);
    }
    
    article.likes = likes;
    await article.save();
    
    return {
      id: article._id,
      kind: article.kind,
      title: article.title,
      summary: article.summary,
      body: article.body,
      coverImageUrl: article.coverImageUrl,
      tags: article.tags,
      likes: article.likes,
      commentsCount: article.commentsCount || 0,
      authorId: article.authorId,
      publishedAt: article.publishedAt
    };
  }

  async deleteArticle(id: string): Promise<boolean> {
    const result = await Article.deleteOne({ _id: id });
    // Also delete all comments for this article
    await ArticleComment.deleteMany({ articleId: id });
    return result.deletedCount > 0;
  }

  // Article Comments
  async getArticleComments(articleId: string): Promise<ArticleCommentType[]> {
    const comments = await ArticleComment.find({ articleId }).sort({ createdAt: 1 });
    return comments.map(c => ({
      id: c._id,
      articleId: c.articleId,
      authorId: c.authorId,
      text: c.text,
      createdAt: c.createdAt
    }));
  }

  async getArticleComment(id: string): Promise<ArticleCommentType | undefined> {
    const comment = await ArticleComment.findById(id);
    return comment ? {
      id: comment._id,
      articleId: comment.articleId,
      authorId: comment.authorId,
      text: comment.text,
      createdAt: comment.createdAt
    } : undefined;
  }

  async createArticleComment(comment: InsertArticleComment): Promise<ArticleCommentType> {
    const id = randomUUID();
    const newComment = new ArticleComment({
      _id: id,
      articleId: comment.articleId,
      authorId: comment.authorId,
      text: comment.text
    });
    await newComment.save();
    await Article.findByIdAndUpdate(comment.articleId, { $inc: { commentsCount: 1 } });
    return {
      id: newComment._id,
      articleId: newComment.articleId,
      authorId: newComment.authorId,
      text: newComment.text,
      createdAt: newComment.createdAt
    };
  }

  async deleteArticleComment(id: string): Promise<boolean> {
    const comment = await ArticleComment.findById(id);
    if (!comment) return false;
    await ArticleComment.findByIdAndDelete(id);
    await Article.findByIdAndUpdate(comment.articleId, { $inc: { commentsCount: -1 } });
    return true;
  }

  // Reports
  async getReports(filters?: { status?: string; limit?: number }): Promise<ReportType[]> {
    let query: any = {};
    if (filters?.status) query.status = filters.status;
    const limit = filters?.limit || 100;
    const reports = await Report.find(query).sort({ createdAt: -1 }).limit(limit);
    return reports.map(r => ({
      id: r._id,
      reporterId: r.reporterId,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      handledBy: r.handledBy,
      status: r.status,
      createdAt: r.createdAt
    }));
  }

  async getReport(id: string): Promise<ReportType | undefined> {
    const report = await Report.findById(id);
    return report ? {
      id: report._id,
      reporterId: report.reporterId,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      handledBy: report.handledBy,
      status: report.status,
      createdAt: report.createdAt
    } : undefined;
  }

  async createReport(report: InsertReport): Promise<ReportType> {
    const id = randomUUID();
    const newReport = new Report({
      _id: id,
      reporterId: report.reporterId,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      handledBy: report.handledBy,
      status: 'OPEN'
    });
    await newReport.save();
    return {
      id: newReport._id,
      reporterId: newReport.reporterId,
      targetType: newReport.targetType,
      targetId: newReport.targetId,
      reason: newReport.reason,
      handledBy: newReport.handledBy,
      status: newReport.status,
      createdAt: newReport.createdAt
    };
  }

  async updateReport(id: string, updates: Partial<Omit<ReportType, 'id' | 'createdAt' | 'reporterId'>>): Promise<ReportType | undefined> {
    const report = await Report.findByIdAndUpdate(id, updates, { new: true });
    return report ? {
      id: report._id,
      reporterId: report.reporterId,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      handledBy: report.handledBy,
      status: report.status,
      createdAt: report.createdAt
    } : undefined;
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLogType> {
    const id = randomUUID();
    const newLog = new AuditLog({
      _id: id,
      action: log.action,
      actorId: log.actorId,
      targetType: log.targetType,
      targetId: log.targetId,
      metadata: log.metadata
    });
    await newLog.save();
    return {
      id: newLog._id,
      action: newLog.action,
      actorId: newLog.actorId,
      targetType: newLog.targetType,
      targetId: newLog.targetId,
      metadata: newLog.metadata,
      createdAt: newLog.createdAt
    };
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLogType[]> {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(limit);
    return logs.map(l => ({
      id: l._id,
      action: l.action,
      actorId: l.actorId,
      targetType: l.targetType,
      targetId: l.targetId,
      metadata: l.metadata,
      createdAt: l.createdAt
    }));
  }

  // Knowledge Categories
  async getKnowledgeCategories(): Promise<KnowledgeCategoryType[]> {
    const categories = await KnowledgeCategory.find();
    return categories.map(c => ({
      id: c._id,
      name: c.name,
      description: c.description,
      icon: c.icon,
      color: c.color,
      createdBy: c.createdBy,
      createdAt: c.createdAt
    }));
  }

  async getKnowledgeCategory(id: string): Promise<KnowledgeCategoryType | undefined> {
    const category = await KnowledgeCategory.findById(id);
    return category ? {
      id: category._id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      createdBy: category.createdBy,
      createdAt: category.createdAt
    } : undefined;
  }

  async createKnowledgeCategory(insertCategory: InsertKnowledgeCategory): Promise<KnowledgeCategoryType> {
    const newCategory = new KnowledgeCategory({
      _id: randomUUID(),
      name: insertCategory.name,
      description: insertCategory.description,
      icon: insertCategory.icon || "BookOpen",
      color: insertCategory.color || "text-blue-500",
      createdBy: insertCategory.createdBy,
    });
    await newCategory.save();
    return {
      id: newCategory._id,
      name: newCategory.name,
      description: newCategory.description,
      icon: newCategory.icon,
      color: newCategory.color,
      createdBy: newCategory.createdBy,
      createdAt: newCategory.createdAt
    };
  }

  async deleteKnowledgeCategory(id: string): Promise<boolean> {
    const result = await KnowledgeCategory.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }
}
