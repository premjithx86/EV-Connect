import type { Express } from "express";
import { createServer, type Server } from "http";
import jwt from "jsonwebtoken";
import { type IStorage } from "./storage";
import {
  hashPassword,
  comparePassword,
  generateToken,
  createAuthenticateToken,
  createEnsureNotBlocked,
  requireModerator,
  requireAdmin,
  type AuthRequest
} from "./auth";
import {
  insertUserSchema,
  insertProfileSchema,
  insertPostSchema,
  insertCommentSchema,
  insertCommunitySchema,
  insertCommunityMemberSchema,
  insertStationSchema,
  insertBookmarkSchema,
  insertQuestionSchema,
  insertAnswerSchema,
  insertArticleSchema,
  insertArticleCommentSchema,
  insertReportSchema,
  insertMessageSchema,
  insertConversationSchema,
} from "@shared/schema";
import { z } from "zod";
import { searchChargingStations } from "./open-charge-map";

export async function registerRoutes(app: Express, storage: IStorage): Promise<Server> {
  // Create auth middleware with storage instance
  const authenticateToken = createAuthenticateToken(storage);
  const ensureNotBlocked = createEnsureNotBlocked(storage);
  type SearchResultPayload = {
    communities: Array<{ id: string; name: string; slug?: string | null; description?: string | null; membersCount?: number | null }>;
    posts: Array<{ id: string; title: string | null; text: string; communityId: string | null }>;
    stations: Array<{ id: string; name: string; address: string | null; city: string | null; state: string | null; country: string | null }>;
    users: Array<{ id: string; displayName: string | null; email: string | null; avatarUrl: string | null }>;
  };

  const EMPTY_SEARCH_RESULTS: SearchResultPayload = {
    communities: [],
    posts: [],
    stations: [],
    users: [],
  };

  type SearchLimits = {
    communities: number;
    posts: number;
    stations: number;
    users: number;
  };

  const defaultSearchLimits: SearchLimits = {
    communities: 10,
    posts: 10,
    stations: 10,
    users: 10,
  };

  async function performSearch(query: string, limits?: Partial<SearchLimits>): Promise<SearchResultPayload> {
    const trimmed = query.trim();
    if (!trimmed) {
      return EMPTY_SEARCH_RESULTS;
    }

    const normalized = trimmed.toLowerCase();
    const limitConfig = { ...defaultSearchLimits, ...limits };
    const contains = (value?: string | null) => (value ?? "").toLowerCase().includes(normalized);

    const [communitiesSource, postsSource, stationsSource] = await Promise.all([
      storage.getCommunities({ search: trimmed }),
      storage.getPosts({ limit: 200, visibility: "PUBLIC" }),
      storage.getStations({ limit: 200 }),
    ]);

    const communityResults = communitiesSource
      .slice(0, limitConfig.communities)
      .map((community) => ({
        id: community.id,
        name: community.name,
        slug: (community as any).slug ?? null,
        description: community.description ?? null,
        membersCount: (community as any).membersCount ?? null,
      }));

    const createSnippet = (text: string) => {
      const lower = text.toLowerCase();
      const index = lower.indexOf(normalized);
      if (index === -1) {
        return text.slice(0, 160);
      }
      const start = Math.max(0, index - 40);
      return text.slice(start, start + 160);
    };

    const postResults = postsSource
      .filter((post) => contains(post.title ?? undefined) || contains(post.text))
      .slice(0, limitConfig.posts)
      .map((post) => ({
        id: post.id,
        title: post.title ?? null,
        text: createSnippet(post.text),
        communityId: post.communityId ?? null,
      }));

    const stationResults = stationsSource
      .filter((station) =>
        contains((station as any).name ?? station.name) ||
        contains((station as any).address ?? (station as any).location?.address) ||
        contains((station as any).location?.city) ||
        contains((station as any).location?.state) ||
        contains((station as any).location?.country) ||
        contains((station as any).provider) ||
        contains((station as any).operator)
      )
      .slice(0, limitConfig.stations)
      .map((station) => {
        const loc = (station as any).location ?? {};
        return {
          id: station.id,
          name: (station as any).name ?? station.name,
          address: ((station as any).address ?? loc.address) ?? null,
          city: loc.city ?? null,
          state: loc.state ?? null,
          country: loc.country ?? null,
        };
      });

    const usersList = typeof storage.getUsers === "function" ? await storage.getUsers() : [];
    const matchedUsers: SearchResultPayload["users"] = [];
    for (const user of usersList) {
      const emailMatches = contains(user.email);
      const profile = await storage.getProfile(user.id);
      const displayName = profile?.displayName ?? null;
      if (!emailMatches && !contains(displayName)) {
        continue;
      }
      matchedUsers.push({
        id: user.id,
        displayName,
        email: user.email ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
      });
      if (matchedUsers.length >= limitConfig.users) {
        break;
      }
    }

    return {
      communities: communityResults,
      posts: postResults,
      stations: stationResults,
      users: matchedUsers,
    };
  }

  
  // Auth routes

  // Debug endpoint to check if users exist
  app.get("/api/debug/users", async (req, res) => {
    try {
      const adminUser = await storage.getUserByEmail("admin@evconnect.com");
      const allUsers = await storage.getUser(""); // This won't work but let's see
      return res.json({ 
        adminExists: !!adminUser,
        adminUser: adminUser ? { id: adminUser.id, email: adminUser.email, role: adminUser.role } : null
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to check users", message: error instanceof Error ? error.message : String(error) });
    }
  });

// In routes.ts
// In routes.ts (add inside registerRoutes)

// GET /api/auth/me - Fetch current user/profile from session
app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const profile = await storage.getProfile(req.user!.id); // Optional: Fetch profile
    return res.json({ 
      user: { id: user.id, email: user.email, role: user.role },
      profile // Include if your frontend expects it
    });
  } catch (error) {
    console.error("[Auth] Error in /api/auth/me:", error);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

// POST /api/auth/logout - Clear session
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("[Auth] Logout error:", err);
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("connect.sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    return res.json({ message: "Logged out successfully" });
  });
});

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

      const profile = await storage.createProfile({
        userId: user.id,
        displayName,
      });

      // Store user ID in session
      req.session.userId = user.id;
      console.log("[Register] Session created for user:", user.id, user.email);
      console.log("[Register] Session ID:", req.sessionID);
      
      // Force session save and wait for it
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("[Register] Session save error:", err);
            reject(err);
          } else {
            console.log("[Register] Session saved successfully, ID:", req.sessionID);
            resolve();
          }
        });
      });
      
      return res.json({ 
        user: { id: user.id, email: user.email, role: user.role },
        profile
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("[Register] Error:", error);
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = z.object({
        email: z.string().email(),
        password: z.string(),
      }).parse(req.body);

      console.log("[Login] Attempting login for email:", email);
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log("[Login] User not found for email:", email);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      console.log("[Login] User found:", user.id, user.email, user.role);
      console.log("[Login] Password hash:", user.passwordHash);
      console.log("[Login] Provided password:", password);
      
      const isValid = await comparePassword(password, user.passwordHash);
      console.log("[Login] Password valid:", isValid);
      
      if (!isValid) {
        console.log("[Login] Invalid password for user:", email);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.status !== "ACTIVE") {
        return res.status(403).json({ error: "Account is not active" });
      }

      // Store user ID in session
      req.session.userId = user.id;
      console.log("[Login] Session created for user:", user.id, user.email);
      console.log("[Login] Session ID:", req.sessionID);
      
      // Force session save and wait for it
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("[Login] Session save error:", err);
            reject(err);
          } else {
            console.log("[Login] Session saved successfully, ID:", req.sessionID);
            resolve();
          }
        });
      });

      return res.json({ 
        user: { id: user.id, email: user.email, role: user.role }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input" });
      }
      console.error("[Login] Error:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ success: true });
    });
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

  // Search routes
  app.get("/api/search/suggestions", async (req, res) => {
    try {
      const rawQuery = (req.query.q as string | undefined) ?? "";
      const query = rawQuery.trim();

      if (!query) {
        return res.json({ communities: [], posts: [], stations: [], users: [] });
      }

      const results = await performSearch(query, {
        communities: 5,
        posts: 5,
        stations: 5,
        users: 5,
      });

      return res.json(results);
    } catch (error) {
      console.error("[Search] Suggestions error:", error);
      return res.status(500).json({ error: "Failed to load suggestions" });
    }
  });

  app.get("/api/search", async (req, res) => {
    try {
      const rawQuery = req.query.q as string | undefined;
      const query = rawQuery?.trim();

      if (!query) {
        return res.status(400).json({ error: "Missing search query" });
      }

      const results = await performSearch(query, {
        communities: 20,
        posts: 20,
        stations: 20,
        users: 20,
      });

      return res.json(results);
    } catch (error) {
      console.error("[Search] Full search error:", error);
      return res.status(500).json({ error: "Failed to perform search" });
    }
  });

  // Social: Follow & Block routes
  app.get("/api/users/:id/followers", authenticateToken, async (req: AuthRequest, res) => {
    const followers = await storage.getFollowers(req.params.id);
    return res.json(followers);
  });

  app.get("/api/users/:id/following", authenticateToken, async (req: AuthRequest, res) => {
    const following = await storage.getFollowing(req.params.id);
    return res.json(following);
  });

  app.post("/api/users/:id/follow", authenticateToken, async (req: AuthRequest, res) => {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    const isBlocked = await storage.isBlocked(req.params.id, req.user!.id);
    if (isBlocked) {
      return res.status(403).json({ error: "You are blocked by this user" });
    }

    const follow = await storage.followUser(req.user!.id, req.params.id);
    return res.json(follow);
  });

  app.post("/api/users/:id/unfollow", authenticateToken, async (req: AuthRequest, res) => {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: "Cannot unfollow yourself" });
    }

    const success = await storage.unfollowUser(req.user!.id, req.params.id);
    return res.json({ success });
  });

  app.get("/api/users/:id/blocked", authenticateToken, async (req: AuthRequest, res) => {
    const blocked = await storage.getBlockedUsers(req.params.id);
    return res.json(blocked);
  });

  app.post("/api/users/:id/block", authenticateToken, async (req: AuthRequest, res) => {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: "Cannot block yourself" });
    }

    const block = await storage.blockUser(req.user!.id, req.params.id);
    return res.json(block);
  });

  app.post("/api/users/:id/unblock", authenticateToken, async (req: AuthRequest, res) => {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: "Cannot unblock yourself" });
    }

    const success = await storage.unblockUser(req.user!.id, req.params.id);
    return res.json({ success });
  });

  app.get("/api/users/:id/is-following", authenticateToken, async (req: AuthRequest, res) => {
    const isFollowing = await storage.isFollowing(req.user!.id, req.params.id);
    return res.json({ isFollowing });
  });

  app.get("/api/users/:id/is-blocked", authenticateToken, async (req: AuthRequest, res) => {
    const isBlocked = await storage.isBlocked(req.user!.id, req.params.id);
    return res.json({ isBlocked });
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
      console.log("[POST] Request body:", JSON.stringify(req.body, null, 2));
      console.log("[POST] User ID:", req.user!.id);

      const data = insertPostSchema.parse({
        ...req.body,
        authorId: req.user!.id,
      });
      console.log("[POST] Parsed data:", JSON.stringify(data, null, 2));

      if (data.communityId) {
        const community = await storage.getCommunity(data.communityId);
        if (!community) {
          return res.status(404).json({ error: "Community not found" });
        }

        const isMember = await storage.isCommunityMember(data.communityId, req.user!.id);
        if (!isMember) {
          return res.status(403).json({ error: "You must join this community to post" });
        }

        data.visibility = "COMMUNITY";
      }

      console.log("[POST] Creating post...");
      const post = await storage.createPost(data);
      console.log("[POST] Post created:", post.id);

      console.log("[POST] Getting profile...");
      const profile = await storage.getProfile(post.authorId);
      console.log("[POST] Profile found:", profile?.displayName);

      // Notify followers of the author if they allow new post notifications
      const followers = await storage.getFollowers(post.authorId);
      await Promise.all(
        followers.map(async (follow) => {
          if (follow.followerId === post.authorId) {
            return;
          }
          const followerProfile = await storage.getProfile(follow.followerId);
          if (followerProfile?.notificationPrefs?.newPost === false) {
            return;
          }
          await storage.createNotification({
            userId: follow.followerId,
            type: "NEW_POST",
            actorId: req.user!.id,
            targetType: "POST",
            targetId: post.id,
            metadata: {
              postId: post.id,
              authorId: post.authorId,
              title: post.title,
            },
          });
        })
      );

      console.log("[POST] Creating audit log...");
      await storage.createAuditLog({
        action: "POST_CREATED",
        actorId: req.user!.id,
        targetType: "POST",
        targetId: post.id,
      });
      console.log("[POST] Audit log created");

      return res.json({ ...post, author: profile });
    } catch (error) {
      console.error("[POST ERROR] Post creation error:", error);
      console.error("[POST ERROR] Error stack:", error instanceof Error ? error.stack : "No stack");
      if (error instanceof z.ZodError) {
        console.error("[POST ERROR] Zod validation errors:", error.errors);
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      return res.status(500).json({
        error: "Failed to create post",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/posts/:id/like", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const post = await storage.togglePostLike(req.params.id, req.user!.id);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      const hasLike = post.likes.includes(req.user!.id);
      if (hasLike && post.authorId !== req.user!.id) {
        const authorProfile = await storage.getProfile(post.authorId);
        if (authorProfile?.notificationPrefs?.like !== false) {
          await storage.createNotification({
            userId: post.authorId,
            type: "POST_LIKED",
            actorId: req.user!.id,
            targetType: "POST",
            targetId: post.id,
            metadata: {
              postId: post.id,
              likerId: req.user!.id,
            },
          });
        }
      }

      return res.json(post);
    } catch (error) {
      console.error("[POST LIKE] Error toggling like:", error);
      return res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  app.post("/api/posts/:postId/comments", authenticateToken, async (req: AuthRequest, res) => {
    try {
      console.log("[COMMENT] Request body:", req.body);
      console.log("[COMMENT] Post ID:", req.params.postId);
      console.log("[COMMENT] User ID:", req.user!.id);

      const data = insertCommentSchema.parse({
        postId: req.params.postId,
        authorId: req.user!.id,
        text: req.body.text,
      });
      console.log("[COMMENT] Parsed data:", data);

      const comment = await storage.createComment(data);
      console.log("[COMMENT] Comment created:", comment);

      const profile = await storage.getProfile(comment.authorId);
      console.log("[COMMENT] Profile found:", profile?.displayName);

      const post = await storage.getPost(req.params.postId);
      if (post && post.authorId !== req.user!.id) {
        const authorProfile = await storage.getProfile(post.authorId);
        if (authorProfile?.notificationPrefs?.comment !== false) {
          await storage.createNotification({
            userId: post.authorId,
            type: "POST_COMMENTED",
            actorId: req.user!.id,
            targetType: "POST",
            targetId: post.id,
            metadata: {
              postId: post.id,
              commentId: comment.id,
              commenterId: req.user!.id,
            },
          });
        }
      }

      return res.json({ ...comment, author: profile });
    } catch (error) {
      console.error("[COMMENT ERROR]", error);
      console.error("[COMMENT ERROR] Stack:", error instanceof Error ? error.stack : "No stack");
      if (error instanceof z.ZodError) {
        console.error("[COMMENT ERROR] Zod errors:", error.errors);
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      return res.status(500).json({
        error: "Failed to create comment",
        details: error instanceof Error ? error.message : String(error),
      });
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

  // Social: Follow & Block routes
  app.get("/api/users/:id/followers", authenticateToken, async (req: AuthRequest, res) => {
    const followers = await storage.getFollowers(req.params.id);
    return res.json(followers);
  });

  app.get("/api/users/:id/following", authenticateToken, async (req: AuthRequest, res) => {
    const following = await storage.getFollowing(req.params.id);
    return res.json(following);
  });

  app.get("/api/users/:id/blocked", authenticateToken, async (req: AuthRequest, res) => {
    const blocked = await storage.getBlockedUsers(req.params.id);
    return res.json(blocked);
  });

  app.get("/api/users/:id/blocked-by", authenticateToken, async (req: AuthRequest, res) => {
    const blockedBy = await storage.getBlockedByUsers(req.params.id);
    return res.json(blockedBy);
  });

  app.post("/api/users/:id/follow", authenticateToken, async (req: AuthRequest, res) => {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    const isBlocked = await storage.isBlocked(req.params.id, req.user!.id);
    if (isBlocked) {
      return res.status(403).json({ error: "You are blocked by this user" });
    }

    const follow = await storage.followUser(req.user!.id, req.params.id);
    return res.json(follow);
  });

  app.post("/api/users/:id/unfollow", authenticateToken, async (req: AuthRequest, res) => {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: "Cannot unfollow yourself" });
    }

    const success = await storage.unfollowUser(req.user!.id, req.params.id);
    return res.json({ success });
  });

  app.post("/api/users/:id/block", authenticateToken, async (req: AuthRequest, res) => {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: "Cannot block yourself" });
    }

    const block = await storage.blockUser(req.user!.id, req.params.id);
    return res.json(block);
  });

  app.post("/api/users/:id/unblock", authenticateToken, async (req: AuthRequest, res) => {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: "Cannot unblock yourself" });
    }

    const success = await storage.unblockUser(req.user!.id, req.params.id);
    return res.json({ success });
  });

  app.get("/api/users/:id/is-following", authenticateToken, async (req: AuthRequest, res) => {
    const isFollowing = await storage.isFollowing(req.user!.id, req.params.id);
    return res.json({ isFollowing });
  });

  app.get("/api/users/:id/is-blocked", authenticateToken, async (req: AuthRequest, res) => {
    const isBlocked = await storage.isBlocked(req.user!.id, req.params.id);
    return res.json({ isBlocked });
  });

  // Messaging routes (non real-time)
  app.get("/api/conversations", authenticateToken, async (req: AuthRequest, res) => {
    const conversations = await storage.getConversationsForUser(req.user!.id);
    return res.json(conversations);
  });

  app.post(
    "/api/conversations",
    authenticateToken,
    ensureNotBlocked((req) => req.body.participantId),
    async (req: AuthRequest, res) => {
      try {
        const parsed = z
          .object({ participantId: z.string().min(1, "participantId is required") })
          .parse(req.body);

        if (parsed.participantId === req.user!.id) {
          return res.status(400).json({ error: "Cannot create conversation with yourself" });
        }

        const payload = insertConversationSchema.parse({
          participantAId: req.user!.id,
          participantBId: parsed.participantId,
        });

        const conversation = await storage.createConversation(payload);
        return res.json(conversation);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Invalid input", details: error.errors });
        }
        return res.status(500).json({ error: "Failed to create conversation" });
      }
    }
  );

  app.get("/api/conversations/:conversationId/messages", authenticateToken, async (req: AuthRequest, res) => {
    const conversation = await storage.getConversation(req.params.conversationId);
    if (!conversation || (conversation.participantAId !== req.user!.id && conversation.participantBId !== req.user!.id)) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const messages = await storage.getMessages(req.params.conversationId, {
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      before: req.query.before ? new Date(req.query.before as string) : undefined,
    });
    return res.json(messages);
  });

  app.post(
    "/api/conversations/:conversationId/messages",
    authenticateToken,
    ensureNotBlocked(async (req) => {
      const conversation = await storage.getConversation(req.params.conversationId);
      if (!conversation) {
        return undefined;
      }
      return conversation.participantAId === req.user!.id ? conversation.participantBId : conversation.participantAId;
    }),
    async (req: AuthRequest, res) => {
      try {
        const conversation = await storage.getConversation(req.params.conversationId);
        if (!conversation || (conversation.participantAId !== req.user!.id && conversation.participantBId !== req.user!.id)) {
          return res.status(404).json({ error: "Conversation not found" });
        }

        const payload = insertMessageSchema.parse({
          conversationId: req.params.conversationId,
          senderId: req.user!.id,
          body: req.body.body,
        });

        const message = await storage.createMessage(payload);
        return res.json(message);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Invalid input", details: error.errors });
        }
        return res.status(500).json({ error: "Failed to send message" });
      }
    }
  );

  app.post(
    "/api/messages",
    authenticateToken,
    ensureNotBlocked((req) => req.body.recipientId),
    async (req: AuthRequest, res) => {
      try {
        const parsed = z
          .object({ recipientId: z.string().min(1, "recipientId is required"), body: z.string().min(1) })
          .parse(req.body);

        if (parsed.recipientId === req.user!.id) {
          return res.status(400).json({ error: "Invalid recipient" });
        }

        let conversation = await storage.findConversationBetween?.(req.user!.id, parsed.recipientId);
        if (!conversation) {
          conversation = await storage.createConversation({
            participantAId: req.user!.id,
            participantBId: parsed.recipientId,
          });
        }

        const payload = insertMessageSchema.parse({
          conversationId: conversation.id,
          senderId: req.user!.id,
          body: parsed.body,
        });
        const message = await storage.createMessage(payload);

        return res.json({ conversation, message });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Invalid input", details: error.errors });
        }
        return res.status(500).json({ error: "Failed to send message" });
      }
    }
  );

  app.post(
    "/api/messages/:id/read",
    authenticateToken,
    async (req: AuthRequest, res) => {
      const parsed = z
        .object({ conversationId: z.string().min(1, "conversationId is required") })
        .safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: "conversationId is required", details: parsed.error.errors });
      }

      const conversation = await storage.getConversation(parsed.data.conversationId);
      if (!conversation || (conversation.participantAId !== req.user!.id && conversation.participantBId !== req.user!.id)) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const message = await storage.markMessageRead(parsed.data.conversationId, req.params.id, req.user!.id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      return res.json(message);
    }
  );

  app.get("/api/messages/unread-count", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const count = await storage.getUnreadMessageCount(req.user!.id);
      return res.json({ count });
    } catch (error) {
      console.error("[Messages] Failed to load unread count", error);
      return res.status(500).json({ error: "Failed to load unread message count" });
    }
  });

  // Notification routes
  app.get("/api/notifications", authenticateToken, async (req: AuthRequest, res) => {
    const notifications = await storage.getNotifications(req.user!.id, {
      unreadOnly: req.query.unread === "true",
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });
    return res.json(notifications);
  });

  app.post("/api/notifications/:id/read", authenticateToken, async (req: AuthRequest, res) => {
    const notification = await storage.markNotificationRead(req.user!.id, req.params.id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    return res.json(notification);
  });

  app.post("/api/notifications/read-all", authenticateToken, async (req: AuthRequest, res) => {
    const count = await storage.markAllNotificationsRead(req.user!.id);
    return res.json({ count });
  });

  // Communities routes
  app.get("/api/communities", async (req, res) => {
    const { search, type } = req.query;
    const communities = await storage.getCommunities({
      search: search as string,
      type: type as string,
    });

    const communitiesWithCounts = await Promise.all(
      communities.map(async (community) => {
        try {
          const members = await storage.getCommunityMembers(community.id);
          return { ...community, membersCount: members.length };
        } catch (error) {
          console.error("[Community] Failed members count lookup:", error);
          return community;
        }
      })
    );

    let requesterId = req.session?.userId;

    if (!requesterId) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as { id?: string; userId?: string };
          requesterId = decoded.id ?? decoded.userId ?? undefined;
        } catch (error) {
          console.warn("[Community] Invalid auth token for membership lookup:", error);
        }
      }
    }

    if (!requesterId) {
      return res.json(communitiesWithCounts);
    }

    try {
      const communitiesWithMembership = await Promise.all(
        communitiesWithCounts.map(async (community) => {
          try {
            const isMember = await storage.isCommunityMember(community.id, requesterId!);
            return { ...community, isMember };
          } catch (error) {
            console.error("[Community] Failed membership check:", error);
            return { ...community, isMember: false };
          }
        })
      );
      return res.json(communitiesWithMembership);
    } catch (error) {
      console.error("[Community] Failed bulk membership check:", error);
      return res.json(communitiesWithCounts);
    }
  });

  app.get("/api/communities/:id", async (req, res) => {
    const community = await storage.getCommunity(req.params.id);
    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }
    return res.json(community);
  });

  app.get("/api/communities/slug/:slug", async (req, res) => {
    const community = await storage.getCommunityBySlug?.(req.params.slug);
    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }

    const members = await storage.getCommunityMembers(community.id);
    const communityWithCount = { ...community, membersCount: members.length };

    let isMember = false;
    const sessionUserId = req.session?.userId;
    if (sessionUserId) {
      try {
        isMember = await storage.isCommunityMember(community.id, sessionUserId);
      } catch (error) {
        console.error("[Community] Failed membership check:", error);
      }
    }

    return res.json({ ...communityWithCount, isMember });
  });

  app.get("/api/communities/:id/posts", async (req, res) => {
    const posts = await storage.getPosts({ communityId: req.params.id });
    const postsWithAuthors = await Promise.all(
      posts.map(async (post) => {
        const profile = await storage.getProfile(post.authorId);
        return { ...post, author: profile };
      })
    );
    return res.json(postsWithAuthors);
  });

  app.post("/api/communities", authenticateToken, async (req: AuthRequest, res) => {
    try {
      console.log("[CREATE COMMUNITY] Request body:", req.body);
      console.log("[CREATE COMMUNITY] User ID:", req.user!.id);
      
      // Validate the data
      const data = insertCommunitySchema.parse(req.body);
      console.log("[CREATE COMMUNITY] Validated data:", data);
      
      // Create the community
      const community = await storage.createCommunity(data);
      console.log("[CREATE COMMUNITY] Community created:", community.id);
      
      // Create audit log
      await storage.createAuditLog({
        action: "COMMUNITY_CREATED",
        actorId: req.user!.id,
        targetType: "COMMUNITY",
        targetId: community.id,
      });
      
      return res.json(community);
    } catch (error) {
      console.error("[CREATE COMMUNITY ERROR]", error);
      if (error instanceof z.ZodError) {
        console.error("[CREATE COMMUNITY] Validation errors:", error.errors);
        return res.status(400).json({ 
          error: "Invalid input", 
          details: error.errors 
        });
      }
      return res.status(500).json({ 
        error: "Failed to create community",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/communities/:id/join", authenticateToken, async (req: AuthRequest, res) => {
    const community = await storage.getCommunity(req.params.id);
    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }

    await storage.joinCommunity({
      communityId: req.params.id,
      userId: req.user!.id,
    });

    const members = await storage.getCommunityMembers(req.params.id);
    return res.json({
      communityId: req.params.id,
      isMember: true,
      membersCount: members.length,
    });
  });

  app.post("/api/communities/:id/leave", authenticateToken, async (req: AuthRequest, res) => {
    const community = await storage.getCommunity(req.params.id);
    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }

    const success = await storage.leaveCommunity(req.params.id, req.user!.id);
    if (!success) {
      return res.status(400).json({ error: "You are not a member of this community" });
    }

    const members = await storage.getCommunityMembers(req.params.id);
    return res.json({
      communityId: req.params.id,
      isMember: false,
      membersCount: members.length,
    });
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

  app.get("/api/bookmarks/check", authenticateToken, async (req: AuthRequest, res) => {
    const { targetId } = req.query;
    if (!targetId) {
      return res.status(400).json({ error: "targetId is required" });
    }
    const bookmark = await storage.getBookmark(req.user!.id, targetId as string);
    if (!bookmark) {
      return res.json(null);
    }
    return res.json(bookmark);
  });

  // Charging Stations test endpoint
  app.get("/api/charging-stations/test", async (req, res) => {
    console.log("[Charging Stations Test] Endpoint hit!");
    return res.json({ 
      status: "ok", 
      message: "Charging stations endpoint is working",
      timestamp: new Date().toISOString()
    });
  });

  // Charging Stations routes (proxy to Open Charge Map API)
  app.get("/api/charging-stations", async (req, res) => {
    console.log("[Charging Stations] ===== ROUTE HIT =====");
    try {
      const { latitude, longitude, distance, maxResults } = req.query;
      
      console.log("[Charging Stations] Request params:", { latitude, longitude, distance, maxResults });
      
      if (!latitude || !longitude) {
        console.error("[Charging Stations] Missing latitude or longitude");
        return res.status(400).json({ error: "latitude and longitude are required" });
      }

      console.log("[Charging Stations] Calling searchChargingStations...");
      
      const stations = await searchChargingStations({
        latitude: parseFloat(latitude as string),
        longitude: parseFloat(longitude as string),
        distance: distance ? parseFloat(distance as string) : 25,
        maxResults: maxResults ? parseInt(maxResults as string) : 50,
      });

      console.log(`[Charging Stations] Found ${stations.length} stations`);
      
      // Convert back to OCM format for frontend compatibility
      const ocmFormat = stations.map(station => {
        const addressParts = station.address.split(',').map(p => p.trim());
        return {
          ID: parseInt(station.externalId.replace('ocm-', '') || '0'),
          AddressInfo: {
            Title: station.name,
            AddressLine1: addressParts[0] || '',
            Town: addressParts[1] || '',
            StateOrProvince: addressParts[2] || '',
            Postcode: '',
            Country: { Title: addressParts[addressParts.length - 1] || '' },
            Latitude: station.coords.lat,
            Longitude: station.coords.lng,
          },
          Connections: station.connectors.map(conn => ({
            ConnectionType: { Title: conn.type },
            PowerKW: conn.powerKW,
          })),
          OperatorInfo: station.provider ? { Title: station.provider } : undefined,
          UsageCost: station.pricing,
          StatusType: { 
            IsOperational: station.availability === 'AVAILABLE',
            Title: station.availability || 'UNKNOWN'
          },
        };
      });

      console.log("[Charging Stations] Returning", ocmFormat.length, "stations in OCM format");
      return res.json(ocmFormat);
    } catch (error: any) {
      console.error("[Charging Stations] Error:", error);
      console.error("[Charging Stations] Error stack:", error?.stack);
      return res.status(500).json({ 
        error: "Failed to fetch charging stations",
        details: error?.message 
      });
    }
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
      console.log("[Create Question] Request body:", req.body);
      console.log("[Create Question] User ID:", req.user!.id);
      
      const data = insertQuestionSchema.parse({
        ...req.body,
        authorId: req.user!.id,
      });
      
      console.log("[Create Question] Parsed data:", data);
      const question = await storage.createQuestion(data);
      console.log("[Create Question] Question created:", question.id);
      
      const profile = await storage.getProfile(question.authorId);
      return res.json({ ...question, author: profile });
    } catch (error) {
      console.error("[Create Question] Error:", error);
      if (error instanceof z.ZodError) {
        console.error("[Create Question] Validation errors:", error.errors);
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      return res.status(500).json({ error: "Failed to create question", details: error instanceof Error ? error.message : String(error) });
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

  app.delete("/api/questions/:id", authenticateToken, async (req: AuthRequest, res) => {
    const question = await storage.getQuestion(req.params.id);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Only author or admin can delete
    if (question.authorId !== req.user!.id && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to delete this question" });
    }

    const deleted = await storage.deleteQuestion?.(req.params.id);
    if (!deleted) {
      return res.status(500).json({ error: "Failed to delete question" });
    }

    await storage.createAuditLog({
      action: "QUESTION_DELETED",
      actorId: req.user!.id,
      targetType: "QUESTION",
      targetId: req.params.id,
      metadata: { title: question.title },
    });

    return res.json({ success: true, message: "Question deleted successfully" });
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

  app.post("/api/articles", authenticateToken, async (req: AuthRequest, res) => {
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

  app.post("/api/articles/:id/like", authenticateToken, async (req: AuthRequest, res) => {
    const article = await storage.toggleArticleLike(req.params.id, req.user!.id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }
    return res.json(article);
  });

  app.delete("/api/articles/:id", authenticateToken, async (req: AuthRequest, res) => {
    const article = await storage.getArticle(req.params.id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    // Only author or admin can delete
    if (article.authorId !== req.user!.id && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to delete this article" });
    }

    await storage.deleteArticle(req.params.id);
    
    await storage.createAuditLog({
      action: "ARTICLE_DELETED",
      actorId: req.user!.id,
      targetType: "ARTICLE",
      targetId: req.params.id,
      metadata: { title: article.title },
    });

    return res.json({ success: true, message: "Article deleted successfully" });
  });

  // Article Comments routes
  app.get("/api/articles/:articleId/comments", async (req, res) => {
    const comments = await storage.getArticleComments(req.params.articleId);
    const commentsWithAuthors = await Promise.all(
      comments.map(async (comment) => {
        const profile = await storage.getProfile(comment.authorId);
        return { ...comment, author: profile };
      })
    );
    return res.json(commentsWithAuthors);
  });

  app.post("/api/articles/:articleId/comments", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const data = insertArticleCommentSchema.parse({
        articleId: req.params.articleId,
        authorId: req.user!.id,
        text: req.body.text,
      });
      const comment = await storage.createArticleComment(data);
      const profile = await storage.getProfile(comment.authorId);
      return res.json({ ...comment, author: profile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input" });
      }
      return res.status(500).json({ error: "Failed to create comment" });
    }
  });

  app.delete("/api/article-comments/:id", authenticateToken, async (req: AuthRequest, res) => {
    const comment = await storage.getArticleComment(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.authorId !== req.user!.id && req.user!.role !== "ADMIN" && req.user!.role !== "MODERATOR") {
      return res.status(403).json({ error: "Not authorized" });
    }

    await storage.deleteArticleComment(req.params.id);
    return res.json({ success: true });
  });

  // Knowledge Categories routes
  app.get("/api/knowledge-categories", async (req, res) => {
    const categories = await storage.getKnowledgeCategories?.() || [];
    return res.json(categories);
  });

  app.post("/api/knowledge-categories", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!storage.createKnowledgeCategory) {
        console.error("createKnowledgeCategory method not available on storage");
        return res.status(500).json({ error: "Category creation not supported" });
      }
      
      const data = {
        name: req.body.name,
        description: req.body.description,
        icon: req.body.icon || "BookOpen",
        color: req.body.color || "text-blue-500",
        createdBy: req.user!.id,
      };
      
      console.log("Creating category with data:", data);
      const category = await storage.createKnowledgeCategory(data);
      
      if (!category) {
        console.error("Category creation returned null/undefined");
        return res.status(500).json({ error: "Failed to create category" });
      }
      
      await storage.createAuditLog({
        action: "CATEGORY_CREATED",
        actorId: req.user!.id,
        targetType: "CATEGORY",
        targetId: category.id,
      });
      
      console.log("Category created successfully:", category.id);
      return res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      return res.status(500).json({ error: "Failed to create category", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/knowledge-categories/:id", authenticateToken, async (req: AuthRequest, res) => {
    const category = await storage.getKnowledgeCategory?.(req.params.id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Only creator or admin can delete
    if (category.createdBy !== req.user!.id && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to delete this category" });
    }

    // Prevent deletion of system categories
    if (category.createdBy === "system") {
      return res.status(403).json({ error: "Cannot delete system categories" });
    }

    const deleted = await storage.deleteKnowledgeCategory?.(req.params.id);
    if (!deleted) {
      return res.status(500).json({ error: "Failed to delete category" });
    }

    await storage.createAuditLog({
      action: "CATEGORY_DELETED",
      actorId: req.user!.id,
      targetType: "CATEGORY",
      targetId: req.params.id,
      metadata: { name: category.name },
    });

    return res.json({ success: true, message: "Category deleted successfully" });
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
  
  // Get all users with search and filtering
  app.get("/api/admin/users", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { search, role, status, limit, offset } = req.query;
      
      // Get all users (we'll implement filtering in storage later if needed)
      const allUsers = await storage.getUsers?.() || [];
      
      let filteredUsers = allUsers;
      
      // Filter by search (email or display name)
      if (search) {
        const searchLower = (search as string).toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
          user.email.toLowerCase().includes(searchLower)
        );
      }
      
      // Filter by role
      if (role) {
        filteredUsers = filteredUsers.filter(user => user.role === role);
      }
      
      // Filter by status
      if (status) {
        filteredUsers = filteredUsers.filter(user => user.status === status);
      }
      
      // Pagination
      const startIndex = offset ? parseInt(offset as string) : 0;
      const endIndex = limit ? startIndex + parseInt(limit as string) : filteredUsers.length;
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
      
      // Get profiles for users
      const usersWithProfiles = await Promise.all(
        paginatedUsers.map(async (user) => {
          const profile = await storage.getProfile(user.id);
          return {
            ...user,
            profile,
            passwordHash: undefined // Don't send password hash to client
          };
        })
      );
      
      return res.json({
        users: usersWithProfiles,
        total: filteredUsers.length
      });
    } catch (error) {
      console.error("[Admin] Error fetching users:", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  
  // Get single user details
  app.get("/api/admin/users/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const profile = await storage.getProfile(user.id);
      
      return res.json({
        ...user,
        profile,
        passwordHash: undefined
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  
  // Update user (role, status, email, password)
  app.put("/api/admin/users/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const updates = z.object({
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
        role: z.enum(["USER", "MODERATOR", "ADMIN"]).optional(),
        status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]).optional(),
      }).parse(req.body);

      // Check if user exists
      const existingUser = await storage.getUser(req.params.id);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Prepare updates
      const userUpdates: any = {};
      if (updates.email) userUpdates.email = updates.email;
      if (updates.role) userUpdates.role = updates.role;
      if (updates.status) userUpdates.status = updates.status;
      if (updates.password) {
        userUpdates.passwordHash = await hashPassword(updates.password);
      }

      const user = await storage.updateUser(req.params.id, userUpdates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.createAuditLog({
        action: "USER_UPDATED",
        actorId: req.user!.id,
        targetType: "USER",
        targetId: req.params.id,
        metadata: { ...updates, password: updates.password ? "[REDACTED]" : undefined },
      });

      return res.json({
        ...user,
        passwordHash: undefined
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      return res.status(500).json({ error: "Failed to update user" });
    }
  });
  
  // Update user profile
  app.put("/api/admin/users/:id/profile", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const updates = z.object({
        displayName: z.string().optional(),
        bio: z.string().optional(),
        avatarUrl: z.string().optional(),
        location: z.any().optional(),
        vehicle: z.any().optional(),
      }).parse(req.body);

      const profile = await storage.updateProfile(req.params.id, updates);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      await storage.createAuditLog({
        action: "PROFILE_UPDATED",
        actorId: req.user!.id,
        targetType: "PROFILE",
        targetId: profile.id,
        metadata: updates,
      });

      return res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input" });
      }
      return res.status(500).json({ error: "Failed to update profile" });
    }
  });
  
  // Block/Suspend user
  app.post("/api/admin/users/:id/block", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const user = await storage.updateUser(req.params.id, { status: "SUSPENDED" });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.createAuditLog({
        action: "USER_BLOCKED",
        actorId: req.user!.id,
        targetType: "USER",
        targetId: req.params.id,
      });

      return res.json(user);
    } catch (error) {
      return res.status(500).json({ error: "Failed to block user" });
    }
  });
  
  // Unblock user
  app.post("/api/admin/users/:id/unblock", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const user = await storage.updateUser(req.params.id, { status: "ACTIVE" });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.createAuditLog({
        action: "USER_UNBLOCKED",
        actorId: req.user!.id,
        targetType: "USER",
        targetId: req.params.id,
      });

      return res.json(user);
    } catch (error) {
      return res.status(500).json({ error: "Failed to unblock user" });
    }
  });
  
  // Delete user account
  app.delete("/api/admin/users/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      // Prevent admin from deleting themselves
      if (req.params.id === req.user!.id) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Delete user (implement in storage)
      const deleted = await storage.deleteUser?.(req.params.id);
      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete user" });
      }

      await storage.createAuditLog({
        action: "USER_DELETED",
        actorId: req.user!.id,
        targetType: "USER",
        targetId: req.params.id,
        metadata: { email: user.email },
      });

      return res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete user" });
    }
  });
  
  // Admin delete community
  app.delete("/api/admin/communities/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const community = await storage.getCommunity(req.params.id);
      if (!community) {
        return res.status(404).json({ error: "Community not found" });
      }

      const deleted = await storage.deleteCommunity?.(req.params.id);
      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete community" });
      }

      await storage.createAuditLog({
        action: "COMMUNITY_DELETED",
        actorId: req.user!.id,
        targetType: "COMMUNITY",
        targetId: req.params.id,
        metadata: { name: community.name },
      });

      return res.json({ success: true, message: "Community deleted successfully" });
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete community" });
    }
  });
  
  // Admin delete post (already exists but let's ensure it works)
  app.delete("/api/admin/posts/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      await storage.deletePost(req.params.id);
      
      await storage.createAuditLog({
        action: "POST_DELETED_BY_ADMIN",
        actorId: req.user!.id,
        targetType: "POST",
        targetId: req.params.id,
      });

      return res.json({ success: true, message: "Post deleted successfully" });
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete post" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
