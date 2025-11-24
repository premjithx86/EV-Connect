import mongoose, { Schema, Document } from 'mongoose';

// User interface
export interface IUser extends Document {
  _id: string;
  email: string;
  passwordHash: string;
  role: string;
  status: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  _id: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, default: 'USER' },
  status: { type: String, required: true, default: 'ACTIVE' },
  createdAt: { type: Date, default: Date.now }
});

// Profile interface
export interface IProfile extends Document {
  _id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  location?: {
    lat?: number;
    lng?: number;
    city?: string;
    state?: string;
    country?: string;
  };
  vehicle?: {
    brand?: string;
    model?: string;
    year?: number;
    batteryCapacity?: number;
  };
  interests?: string[];
  followersCount: number;
  followingCount: number;
  notificationPrefs?: {
    newPost?: boolean;
    like?: boolean;
    comment?: boolean;
  };
  acceptsMessages: boolean;
}

const ProfileSchema = new Schema<IProfile>({
  _id: { type: String, required: true },
  userId: { type: String, required: true, unique: true, ref: 'User' },
  displayName: { type: String, required: true },
  avatarUrl: String,
  bio: String,
  location: {
    lat: Number,
    lng: Number,
    city: String,
    state: String,
    country: String
  },
  vehicle: {
    brand: String,
    model: String,
    year: Number,
    batteryCapacity: Number
  },
  interests: [String],
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  notificationPrefs: {
    newPost: { type: Boolean, default: true },
    like: { type: Boolean, default: true },
    comment: { type: Boolean, default: true },
  },
  acceptsMessages: { type: Boolean, default: true }
});

// Community interface
export interface ICommunity extends Document {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  type: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  createdBy: string;
  memberCount: number;
  createdAt: Date;
}

const CommunitySchema = new Schema<ICommunity>({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  type: { type: String, required: true },
  avatarUrl: String,
  coverImageUrl: String,
  createdBy: { type: String, required: true, ref: 'User' },
  memberCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Community Member interface
export interface ICommunityMember extends Document {
  _id: string;
  communityId: string;
  userId: string;
  joinedAt: Date;
}

const CommunityMemberSchema = new Schema<ICommunityMember>({
  _id: { type: String, required: true },
  communityId: { type: String, required: true, ref: 'Community' },
  userId: { type: String, required: true, ref: 'User' },
  joinedAt: { type: Date, default: Date.now }
});

// Post interface
export interface IPost extends Document {
  _id: string;
  title?: string;
  text: string;
  authorId: string;
  communityId: string | null;
  media: Array<{ type: string; url: string }> | null;
  likes: string[];
  commentsCount: number;
  visibility: string;
  createdAt: Date;
}

const PostSchema = new Schema<IPost>({
  _id: { type: String, required: true },
  title: { type: String },
  text: { type: String, required: true },
  authorId: { type: String, required: true, ref: 'User' },
  communityId: String,
  media: [new Schema({ 
    type: { type: String },
    url: { type: String }
  }, { _id: false })],
  likes: [String],
  commentsCount: { type: Number, default: 0 },
  visibility: { type: String, default: 'PUBLIC' },
  createdAt: { type: Date, default: Date.now }
});

// Comment interface
export interface IComment extends Document {
  _id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: Date;
}

const CommentSchema = new Schema<IComment>({
  _id: { type: String, required: true },
  postId: { type: String, required: true, ref: 'Post' },
  authorId: { type: String, required: true, ref: 'User' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { strict: false }); // Allow flexible schema during migration

// Station interface
export interface IStation extends Document {
  _id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  operator?: string;
  status: string;
  connectors: Array<{
    type: string;
    power?: number;
    status?: string;
  }>;
  pricing?: string;
  verified: boolean;
  addedBy?: string;
  createdAt: Date;
}

const StationSchema = new Schema<IStation>({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: String,
    city: String,
    state: String,
    country: String
  },
  operator: String,
  status: { type: String, required: true },
  connectors: [{
    type: { type: String, required: true },
    power: Number,
    status: String
  }],
  pricing: String,
  verified: { type: Boolean, default: false },
  addedBy: String,
  createdAt: { type: Date, default: Date.now }
});

// Bookmark interface
export interface IBookmark extends Document {
  _id: string;
  userId: string;
  targetType: string;
  targetId: string;
  createdAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>({
  _id: { type: String, required: true },
  userId: { type: String, required: true, ref: 'User' },
  targetType: { type: String, required: true },
  targetId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Question interface
export interface IQuestion extends Document {
  _id: string;
  title: string;
  content: string;
  authorId: string;
  tags?: string[];
  upvoteCount: number;
  answerCount: number;
  solved: boolean;
  solvedAnswerId?: string;
  createdAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  authorId: { type: String, required: true, ref: 'User' },
  tags: [String],
  upvoteCount: { type: Number, default: 0 },
  answerCount: { type: Number, default: 0 },
  solved: { type: Boolean, default: false },
  solvedAnswerId: String,
  createdAt: { type: Date, default: Date.now }
});

// Answer interface
export interface IAnswer extends Document {
  _id: string;
  questionId: string;
  authorId: string;
  content: string;
  upvoteCount: number;
  createdAt: Date;
}

const AnswerSchema = new Schema<IAnswer>({
  _id: { type: String, required: true },
  questionId: { type: String, required: true, ref: 'Question' },
  authorId: { type: String, required: true, ref: 'User' },
  content: { type: String, required: true },
  upvoteCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Article interface
export interface IArticle extends Document {
  _id: string;
  kind: string;
  title: string;
  summary: string;
  body: string;
  coverImageUrl?: string;
  tags?: string[];
  likes?: string[];
  commentsCount: number;
  authorId: string;
  publishedAt: Date;
}

const ArticleSchema = new Schema<IArticle>({
  _id: { type: String, required: true },
  kind: { type: String, required: true },
  title: { type: String, required: true },
  summary: { type: String, required: true },
  body: { type: String, required: true },
  coverImageUrl: String,
  tags: [String],
  likes: [String],
  commentsCount: { type: Number, default: 0 },
  authorId: { type: String, required: true, ref: 'User' },
  publishedAt: { type: Date, default: Date.now }
});

// Report interface
export interface IReport extends Document {
  _id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  handledBy?: string;
  status: string;
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>({
  _id: { type: String, required: true },
  reporterId: { type: String, required: true, ref: 'User' },
  targetType: { type: String, required: true },
  targetId: { type: String, required: true },
  reason: { type: String, required: true },
  handledBy: String,
  status: { type: String, default: 'OPEN' },
  createdAt: { type: Date, default: Date.now }
});

// Audit Log interface
export interface IAuditLog extends Document {
  _id: string;
  action: string;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  metadata?: any;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  _id: { type: String, required: true },
  action: { type: String, required: true },
  actorId: String,
  targetType: String,
  targetId: String,
  metadata: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

// Article Comment interface
export interface IArticleComment extends Document {
  _id: string;
  articleId: string;
  authorId: string;
  text: string;
  createdAt: Date;
}

const ArticleCommentSchema = new Schema<IArticleComment>({
  _id: { type: String, required: true },
  articleId: { type: String, required: true, ref: 'Article' },
  authorId: { type: String, required: true, ref: 'User' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Knowledge Category interface
export interface IKnowledgeCategory extends Document {
  _id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  createdBy: string;
  createdAt: Date;
}

const KnowledgeCategorySchema = new Schema<IKnowledgeCategory>({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true, default: 'BookOpen' },
  color: { type: String, required: true, default: 'text-blue-500' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// User follow interface
export interface IUserFollow extends Document {
  _id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

const UserFollowSchema = new Schema<IUserFollow>({
  _id: { type: String, required: true },
  followerId: { type: String, required: true, ref: 'User', index: true },
  followingId: { type: String, required: true, ref: 'User', index: true },
  createdAt: { type: Date, default: Date.now }
});
UserFollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

// User block interface
export interface IUserBlock extends Document {
  _id: string;
  blockerId: string;
  blockedId: string;
  createdAt: Date;
}

const UserBlockSchema = new Schema<IUserBlock>({
  _id: { type: String, required: true },
  blockerId: { type: String, required: true, ref: 'User', index: true },
  blockedId: { type: String, required: true, ref: 'User', index: true },
  createdAt: { type: Date, default: Date.now }
});
UserBlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

// Notification interface
export interface INotification extends Document {
  _id: string;
  userId: string;
  type: string;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  _id: { type: String, required: true },
  userId: { type: String, required: true, ref: 'User', index: true },
  type: { type: String, required: true },
  actorId: { type: String, ref: 'User' },
  targetType: { type: String },
  targetId: { type: String },
  metadata: { type: Schema.Types.Mixed },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Conversation interface
export interface IConversation extends Document {
  _id: string;
  participantAId: string;
  participantBId: string;
  createdAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
  _id: { type: String, required: true },
  participantAId: { type: String, required: true, ref: 'User', index: true },
  participantBId: { type: String, required: true, ref: 'User', index: true },
  createdAt: { type: Date, default: Date.now }
});
ConversationSchema.index({ participantAId: 1, participantBId: 1 }, { unique: true });

// Message interface
export interface IMessage extends Document {
  _id: string;
  conversationId: string;
  senderId: string;
  body: string;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  _id: { type: String, required: true },
  conversationId: { type: String, required: true, ref: 'Conversation', index: true },
  senderId: { type: String, required: true, ref: 'User' },
  body: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});
MessageSchema.index({ conversationId: 1, createdAt: 1 });

// Models
export const User = mongoose.model<IUser>('User', UserSchema);
export const Profile = mongoose.model<IProfile>('Profile', ProfileSchema);
export const Community = mongoose.model<ICommunity>('Community', CommunitySchema);
export const CommunityMember = mongoose.model<ICommunityMember>('CommunityMember', CommunityMemberSchema);
export const Post = mongoose.model<IPost>('Post', PostSchema);
export const Comment = mongoose.model<IComment>('Comment', CommentSchema);
export const Station = mongoose.model<IStation>('Station', StationSchema);
export const Bookmark = mongoose.model<IBookmark>('Bookmark', BookmarkSchema);
export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);
export const Answer = mongoose.model<IAnswer>('Answer', AnswerSchema);
export const Article = mongoose.model<IArticle>('Article', ArticleSchema);
export const ArticleComment = mongoose.model<IArticleComment>('ArticleComment', ArticleCommentSchema);
export const Report = mongoose.model<IReport>('Report', ReportSchema);
export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export const KnowledgeCategory = mongoose.model<IKnowledgeCategory>('KnowledgeCategory', KnowledgeCategorySchema);
export const UserFollow = mongoose.model<IUserFollow>('UserFollow', UserFollowSchema);
export const UserBlock = mongoose.model<IUserBlock>('UserBlock', UserBlockSchema);
export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
export const Message = mongoose.model<IMessage>('Message', MessageSchema);
