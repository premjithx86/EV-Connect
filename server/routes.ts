import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  hashPassword, 
  comparePassword, 
  generateToken, 
  authenticateToken, 
  requireModerator, 
  requireAdmin,
  type AuthRequest 
} from "./auth";
import { insertUserSchema, insertProfileSchema, insertPostSchema, insertCommentSchema, insertCommunitySchema, insertCommunityMemberSchema, insertStationSchema, insertBookmarkSchema, insertQuestionSchema, insertAnswerSchema, insertArticleSchema, insertReportSchema } from "@shared/schema";
import { z } from "zod";
import { searchChargingStations } from "./open-charge-map";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, displayName } = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        displayName: z.string().min(1),
      }).parse(req.body);

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        email,
        passwordHash,
        role: "USER",
        status: "ACTIVE",
      });

      await storage.createProfile({
        userId: user.id,
        displayName,
      });

      const token = generateToken(user.id);
      res.cookie("token", token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000 
      });
      
      return res.json({ 
        user: { id: user.id, email: user.email, role: user.role },
        token 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = z.object({
        email: z.string().email(),
        password: z.string(),
      }).parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.status !== "ACTIVE") {
        return res.status(403).json({ error: "Account is not active" });
      }

      const token = generateToken(user.id);
      res.cookie("token", token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000 
      });
      
      return res.json({ 
        user: { id: user.id, email: user.email, role: user.role },
        token 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input" });
      }
      return res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    return res.json({ success: true });
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
    const profile = await storage.getProfile(req.user!.id);
    return res.json({
      user: { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      profile,
    });
  });

  // Profile routes
  app.get("/api/profiles/:userId", async (req, res) => {
    const profile = await storage.getProfile(req.params.userId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    return res.json(profile);
  });

  app.put("/api/profiles", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const updates = z.object({
        displayName: z.string().optional(),
        avatarUrl: z.string().optional(),
        bio: z.string().optional(),
        location: z.any().optional(),
        vehicle: z.any().optional(),
        interests: z.array(z.string()).optional(),
      }).parse(req.body);

      const profile = await storage.updateProfile(req.user!.id, updates);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      return res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input" });
      }
      return res.status(500).json({ error: "Update failed" });
    }
  });

  // Posts routes
  app.get("/api/posts", async (req, res) => {
    const { communityId, authorId, limit, offset } = req.query;
    const posts = await storage.getPosts({
      communityId: communityId as string,
      authorId: authorId as string,
      visibility: "PUBLIC",
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    const postsWithAuthors = await Promise.all(
      posts.map(async (post) => {
        const profile = await storage.getProfile(post.authorId);
        return { ...post, author: profile };
      })
    );

    return res.json(postsWithAuthors);
  });

  app.get("/api/posts/:id", async (req, res) => {
    const post = await storage.getPost(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    const profile = await storage.getProfile(post.authorId);
    return res.json({ ...post, author: profile });
  });

  app.post("/api/posts", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const data = insertPostSchema.parse({
        ...req.body,
        authorId: req.user!.id,
      });
      const post = await storage.createPost(data);
      const profile = await storage.getProfile(post.authorId);
      
      await storage.createAuditLog({
        action: "POST_CREATED",
        actorId: req.user!.id,
        targetType: "POST",
        targetId: post.id,
      });
      
      return res.json({ ...post, author: profile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input" });
      }
      return res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.post("/api/posts/:id/like", authenticateToken, async (req: AuthRequest, res) => {
    const post = await storage.togglePostLike(req.params.id, req.user!.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    return res.json(post);
  });

  app.delete("/api/posts/:id", authenticateToken, async (req: AuthRequest, res) => {
    const post = await storage.getPost(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.authorId !== req.user!.id && req.user!.role !== "ADMIN" && req.user!.role !== "MODERATOR") {
      return res.status(403).json({ error: "Not authorized" });
    }

    await storage.deletePost(req.params.id);
    await storage.createAuditLog({
      action: "POST_DELETED",
      actorId: req.user!.id,
      targetType: "POST",
      targetId: req.params.id,
    });
    
    return res.json({ success: true });
  });

  // Comments routes
  app.get("/api/posts/:postId/comments", async (req, res) => {
    const comments = await storage.getComments(req.params.postId);
    const commentsWithAuthors = await Promise.all(
      comments.map(async (comment) => {
        const profile = await storage.getProfile(comment.authorId);
        return { ...comment, author: profile };
      })
    );
    return res.json(commentsWithAuthors);
  });

  app.post("/api/posts/:postId/comments", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const data = insertCommentSchema.parse({
        postId: req.params.postId,
        authorId: req.user!.id,
        text: req.body.text,
      });
      const comment = await storage.createComment(data);
      const profile = await storage.getProfile(comment.authorId);
      return res.json({ ...comment, author: profile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input" });
      }
      return res.status(500).json({ error: "Failed to create comment" });
    }
  });

  app.delete("/api/comments/:id", authenticateToken, async (req: AuthRequest, res) => {
    const comment = await storage.getComment(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.authorId !== req.user!.id && req.user!.role !== "ADMIN" && req.user!.role !== "MODERATOR") {
      return res.status(403).json({ error: "Not authorized" });
    }

    await storage.deleteComment(req.params.id);
    return res.json({ success: true });
  });

  // Communities routes
  app.get("/api/communities", async (req, res) => {
    const { search, type } = req.query;
    const communities = await storage.getCommunities({
      search: search as string,
      type: type as string,
    });
    return res.json(communities);
  });

  app.get("/api/communities/:id", async (req, res) => {
    const community = await storage.getCommunity(req.params.id);
    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }
    return res.json(community);
  });

  app.post("/api/communities", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const data = insertCommunitySchema.parse(req.body);
      const community = await storage.createCommunity(data);
      await storage.createAuditLog({
        action: "COMMUNITY_CREATED",
        actorId: req.user!.id,
        targetType: "COMMUNITY",
        targetId: community.id,
      });
      return res.json(community);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input" });
      }
      return res.status(500).json({ error: "Failed to create community" });
    }
  });

  app.post("/api/communities/:id/join", authenticateToken, async (req: AuthRequest, res) => {
    const member = await storage.joinCommunity({
      communityId: req.params.id,
      userId: req.user!.id,
    });
    return res.json(member);
  });

  app.post("/api/communities/:id/leave", authenticateToken, async (req: AuthRequest, res) => {
    const success = await storage.leaveCommunity(req.params.id, req.user!.id);
    return res.json({ success });
  });

  app.get("/api/communities/:id/is-member", authenticateToken, async (req: AuthRequest, res) => {
    const isMember = await storage.isCommunityMember(req.params.id, req.user!.id);
    return res.json({ isMember });
  });

  // Stations routes
  app.get("/api/stations", async (req, res) => {
    const { verified, limit } = req.query;
    const stations = await storage.getStations({
      verified: verified === "true",
      limit: limit ? parseInt(limit as string) : undefined,
    });
    return res.json(stations);
  });

  app.get("/api/stations/search", async (req, res) => {
    try {
      const { lat, lng, distance, countryCode, maxResults } = req.query;
      
      const stations = await searchChargingStations({
        latitude: lat ? parseFloat(lat as string) : undefined,
        longitude: lng ? parseFloat(lng as string) : undefined,
        distance: distance ? parseFloat(distance as string) : undefined,
        countryCode: countryCode as string,
        maxResults: maxResults ? parseInt(maxResults as string) : undefined,
      });
      
      return res.json(stations);
    } catch (error) {
      return res.status(500).json({ error: "Failed to search charging stations" });
    }
  });

  app.get("/api/stations/:id", async (req, res) => {
    const station = await storage.getStation(req.params.id);
    if (!station) {
      return res.status(404).json({ error: "Station not found" });
    }
    return res.json(station);
  });

  app.post("/api/stations", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const data = insertStationSchema.parse({
        ...req.body,
        addedBy: req.user!.id,
      });
      const station = await storage.createStation(data);
      await storage.createAuditLog({
        action: "STATION_ADDED",
        actorId: req.user!.id,
        targetType: "STATION",
        targetId: station.id,
      });
      return res.json(station);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input" });
      }
      return res.status(500).json({ error: "Failed to create station" });
    }
  });

  // Bookmarks routes
  app.get("/api/bookmarks", authenticateToken, async (req: AuthRequest, res) => {
    const { targetType } = req.query;
    const bookmarks = await storage.getBookmarks(req.user!.id, targetType as string);
    return res.json(bookmarks);
  });

  app.post("/api/bookmarks", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const data = insertBookmarkSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      const bookmark = await storage.createBookmark(data);
      return res.json(bookmark);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input" });
      }
      return res.status(500).json({ error: "Failed to create bookmark" });
    }
  });

  app.delete("/api/bookmarks/:id", authenticateToken, async (req: AuthRequest, res) => {
    const success = await storage.deleteBookmark(req.params.id);
    return res.json({ success });
  });

  app.get("/api/bookmarks/check/:targetId", authenticateToken, async (req: AuthRequest, res) => {
    const bookmark = await storage.getBookmark(req.user!.id, req.params.targetId);
    return res.json({ bookmarked: !!bookmark, bookmarkId: bookmark?.id });
  });

  // Questions routes
  app.get("/api/questions", async (req, res) => {
    const { tag, sort, limit, offset } = req.query;
    const questions = await storage.getQuestions({
      tag: tag as string,
      sort: sort as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    const questionsWithAuthors = await Promise.all(
      questions.map(async (q) => {
        const profile = await storage.getProfile(q.authorId);
        return { ...q, author: profile };
      })
    );

    return res.json(questionsWithAuthors);
  });

  app.get("/api/questions/:id", async (req, res) => {
    const question = await storage.getQuestion(req.params.id);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }
    const profile = await storage.getProfile(question.authorId);
    return res.json({ ...question, author: profile });
  });

  app.post("/api/questions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const data = insertQuestionSchema.parse({
        ...req.body,
        authorId: req.user!.id,
      });
      const question = await storage.createQuestion(data);
      const profile = await storage.getProfile(question.authorId);
      return res.json({ ...question, author: profile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input" });
      }
      return res.status(500).json({ error: "Failed to create question" });
    }
  });

  app.post("/api/questions/:id/upvote", authenticateToken, async (req: AuthRequest, res) => {
    const question = await storage.toggleQuestionUpvote(req.params.id, req.user!.id);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }
    return res.json(question);
  });

  app.post("/api/questions/:id/solve", authenticateToken, async (req: AuthRequest, res) => {
    const question = await storage.getQuestion(req.params.id);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    if (question.authorId !== req.user!.id) {
      return res.status(403).json({ error: "Only the question author can mark it as solved" });
    }

    const updated = await storage.updateQuestion(req.params.id, {
      solvedAnswerId: req.body.answerId,
    });
    return res.json(updated);
  });

  // Answers routes
  app.get("/api/questions/:questionId/answers", async (req, res) => {
    const answers = await storage.getAnswers(req.params.questionId);
    const answersWithAuthors = await Promise.all(
      answers.map(async (a) => {
        const profile = await storage.getProfile(a.authorId);
        return { ...a, author: profile };
      })
    );
    return res.json(answersWithAuthors);
  });

  app.post("/api/questions/:questionId/answers", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const data = insertAnswerSchema.parse({
        questionId: req.params.questionId,
        authorId: req.user!.id,
        body: req.body.body,
      });
      const answer = await storage.createAnswer(data);
      const profile = await storage.getProfile(answer.authorId);
      return res.json({ ...answer, author: profile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input" });
      }
      return res.status(500).json({ error: "Failed to create answer" });
    }
  });

  app.post("/api/answers/:id/upvote", authenticateToken, async (req: AuthRequest, res) => {
    const answer = await storage.toggleAnswerUpvote(req.params.id, req.user!.id);
    if (!answer) {
      return res.status(404).json({ error: "Answer not found" });
    }
    return res.json(answer);
  });

  // Articles routes
  app.get("/api/articles", async (req, res) => {
    const { kind, tag, limit } = req.query;
    const articles = await storage.getArticles({
      kind: kind as string,
      tag: tag as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    return res.json(articles);
  });

  app.get("/api/articles/:id", async (req, res) => {
    const article = await storage.getArticle(req.params.id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }
    return res.json(article);
  });

  app.post("/api/articles", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const data = insertArticleSchema.parse({
        ...req.body,
        authorId: req.user!.id,
      });
      const article = await storage.createArticle(data);
      await storage.createAuditLog({
        action: "ARTICLE_CREATED",
        actorId: req.user!.id,
        targetType: "ARTICLE",
        targetId: article.id,
      });
      return res.json(article);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input" });
      }
      return res.status(500).json({ error: "Failed to create article" });
    }
  });

  // Reports routes
  app.get("/api/reports", authenticateToken, requireModerator, async (req: AuthRequest, res) => {
    const { status, limit } = req.query;
    const reports = await storage.getReports({
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    return res.json(reports);
  });

  app.post("/api/reports", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const data = insertReportSchema.parse({
        ...req.body,
        reporterId: req.user!.id,
      });
      const report = await storage.createReport(data);
      return res.json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input" });
      }
      return res.status(500).json({ error: "Failed to create report" });
    }
  });

  app.put("/api/reports/:id", authenticateToken, requireModerator, async (req: AuthRequest, res) => {
    try {
      const updates = z.object({
        status: z.string().optional(),
        handledBy: z.string().optional(),
      }).parse(req.body);

      const report = await storage.updateReport(req.params.id, {
        ...updates,
        handledBy: req.user!.id,
      });

      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      await storage.createAuditLog({
        action: "REPORT_HANDLED",
        actorId: req.user!.id,
        targetType: "REPORT",
        targetId: req.params.id,
        metadata: { status: updates.status },
      });

      return res.json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input" });
      }
      return res.status(500).json({ error: "Failed to update report" });
    }
  });

  // Audit logs routes
  app.get("/api/audit-logs", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const { limit } = req.query;
    const logs = await storage.getAuditLogs(limit ? parseInt(limit as string) : 100);
    return res.json(logs);
  });

  // Admin routes for user management
  app.put("/api/admin/users/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const updates = z.object({
        role: z.string().optional(),
        status: z.string().optional(),
      }).parse(req.body);

      const user = await storage.updateUser(req.params.id, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.createAuditLog({
        action: "USER_UPDATED",
        actorId: req.user!.id,
        targetType: "USER",
        targetId: req.params.id,
        metadata: updates,
      });

      return res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input" });
      }
      return res.status(500).json({ error: "Failed to update user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
