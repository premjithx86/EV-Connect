import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { UserProfileCard } from "@/components/UserProfileCard";
import { PostCard } from "@/components/PostCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Bookmark, MapPin, Zap, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface ApiPost {
  id: string;
  text: string;
  media?: Array<{ url?: string; type?: string }> | string[];
  authorId: string;
  communityId?: string | null;
  likes?: string[];
  commentsCount?: number;
  createdAt: string;
  author?: {
    displayName?: string;
    avatarUrl?: string;
  } | null;
}

type ExtendedProfile = {
  id?: string;
  userId?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  location?: { city?: string | null } | null;
  vehicle?: {
    brand?: string;
    model?: string;
    year?: number;
  } | null;
  interests?: string[] | null;
  followersCount?: number | null;
  followingCount?: number | null;
  acceptsMessages?: boolean | null;
};

interface BookmarkItem {
  id: string;
  userId: string;
  targetType: string;
  targetId: string;
  createdAt: string;
}

function BookmarkCard({ bookmark }: { bookmark: BookmarkItem }) {
  const isStation = bookmark.targetType === "STATION";
  const handleClick = () => {
    if (isStation) {
      window.open(`https://openchargemap.org/site/poi/details/${bookmark.targetId}`, "_blank");
    } else {
      window.open(`/posts/${bookmark.targetId}`, "_blank");
    }
  };

  return (
    <Card className="p-4 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isStation ? <Zap className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          <span>{isStation ? "Station" : bookmark.targetType}</span>
        </div>
        <p className="font-medium text-sm mt-1">{bookmark.targetId}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Saved {formatDistanceToNow(new Date(bookmark.createdAt), { addSuffix: true })}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={handleClick} className="gap-1">
        {isStation ? <MapPin className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
        View
      </Button>
    </Card>
  );
}

export default function UserProfile() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/profiles/:userId");
  const viewingUserId = params?.userId || user?.id;
  const isOwnProfile = !!user && viewingUserId === user.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeList, setActiveList] = useState<"followers" | "following" | null>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageBody, setMessageBody] = useState("");

  const postsQuery = useQuery<ApiPost[]>({
    queryKey: ["profile-posts", viewingUserId],
    queryFn: async () => {
      const res = await fetch(`/api/posts?authorId=${viewingUserId}`);
      if (!res.ok) throw new Error("Failed to load posts");
      return res.json();
    },
    enabled: !!viewingUserId,
    staleTime: 60_000,
  });

  const bookmarksQuery = useQuery<BookmarkItem[]>({
    queryKey: ["profile-bookmarks", viewingUserId],
    queryFn: async () => {
      const res = await fetch(`/api/bookmarks?userId=${viewingUserId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load bookmarks");
      return res.json();
    },
    enabled: !!viewingUserId && isOwnProfile,
  });

  const posts = postsQuery.data ?? [];
  const postsCount = posts.length;
  const stationBookmarks = useMemo(
    () => (bookmarksQuery.data || []).filter((bookmark) => bookmark.targetType === "STATION"),
    [bookmarksQuery.data]
  );
  const postBookmarks = useMemo(
    () => (bookmarksQuery.data || []).filter((bookmark) => bookmark.targetType === "POST"),
    [bookmarksQuery.data]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-20 w-64" />
          <Skeleton className="h-40 w-80" />
        </div>
      </div>
    );
  }

  if (!viewingUserId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center space-y-4">
          <h2 className="text-xl font-semibold">You need to be logged in to view profiles.</h2>
          <Button onClick={() => navigate("/login")}>Go to login</Button>
        </Card>
      </div>
    );
  }

  const profileQuery = useQuery<ExtendedProfile | null>({
    queryKey: ["profile", viewingUserId],
    queryFn: async () => {
      const res = await fetch(`/api/profiles/${viewingUserId}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
    enabled: !!viewingUserId && !isOwnProfile,
  });

  const targetProfile: ExtendedProfile | null = isOwnProfile
    ? (profile ? { ...(profile as ExtendedProfile) } : null)
    : profileQuery.data ?? null;

  const followStateQuery = useQuery<{ isFollowing: boolean; hasBlocked: boolean; blockedByTarget: boolean }>({
    queryKey: ["follow-state", viewingUserId],
    queryFn: async () => {
      if (!user || isOwnProfile) {
        return { isFollowing: false, hasBlocked: false, blockedByTarget: false };
      }

      const [isFollowingRes, hasBlockedRes, targetBlockedRes] = await Promise.all([
        fetch(`/api/users/${viewingUserId}/is-following`, { credentials: "include" }),
        fetch(`/api/users/${viewingUserId}/is-blocked`, { credentials: "include" }),
        fetch(`/api/users/${viewingUserId}/blocked`, { credentials: "include" }),
      ]);

      if (!isFollowingRes.ok || !hasBlockedRes.ok || !targetBlockedRes.ok) {
        throw new Error("Failed to load follow state");
      }

      const [isFollowingData, hasBlockedData, targetBlockedList] = await Promise.all([
        isFollowingRes.json(),
        hasBlockedRes.json(),
        targetBlockedRes.json() as Promise<Array<{ blockedId: string }>>,
      ]);

      const blockedByTarget = targetBlockedList.some((entry) => entry.blockedId === user.id);

      return {
        isFollowing: !!isFollowingData.isFollowing,
        hasBlocked: extractBlockedFlag(hasBlockedData),
        blockedByTarget,
      };
    },
    enabled: !!user && !!viewingUserId && !isOwnProfile,
  });

  const followState = followStateQuery.data;

  function extractBlockedFlag(data: unknown): boolean {
    if (typeof data === "boolean") return data;
    if (data && typeof data === "object" && "isBlocked" in data) {
      return Boolean((data as { isBlocked?: boolean }).isBlocked);
    }
    return false;
  }

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!followState) return;
      const endpoint = followState.isFollowing ? "unfollow" : "follow";
      const res = await fetch(`/api/users/${viewingUserId}/${endpoint}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(followState.isFollowing ? "Failed to unfollow user" : "Failed to follow user");
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["follow-state", viewingUserId] }),
        queryClient.invalidateQueries({ queryKey: ["profile", viewingUserId] }),
      ]);
      toast({
        title: followState?.isFollowing ? "Unfollowed" : "Followed",
        description: followState?.isFollowing ? "You are no longer following this user" : "You are now following this user",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update follow state",
        variant: "destructive",
      });
    },
  });

  const followersListQuery = useQuery<UserPreview[]>({
    queryKey: ["followers-list", viewingUserId],
    queryFn: () => fetchFollowList(viewingUserId!, "followers"),
    enabled: !!viewingUserId && activeList === "followers",
  });

  const followingListQuery = useQuery<UserPreview[]>({
    queryKey: ["following-list", viewingUserId],
    queryFn: () => fetchFollowList(viewingUserId!, "following"),
    enabled: !!viewingUserId && activeList === "following",
  });

  const messageMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientId: viewingUserId, body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Message sent", description: "The user will see it in Messages." });
      setMessageBody("");
      setShowMessageDialog(false);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    },
  });

  if (profileQuery.isLoading && !targetProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-40 w-80" />
      </div>
    );
  }

  if (!targetProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center space-y-4">
          <h2 className="text-xl font-semibold">Profile not found</h2>
          <Button onClick={() => navigate("/")}>Return home</Button>
        </Card>
      </div>
    );
  }

  const vehicle = targetProfile?.vehicle?.brand && targetProfile.vehicle.model && targetProfile.vehicle.year
    ? {
        brand: targetProfile.vehicle.brand,
        model: targetProfile.vehicle.model,
        year: targetProfile.vehicle.year,
      }
    : undefined;
  const followersCount = getSocialCount(targetProfile, "followersCount");
  const followingCount = getSocialCount(targetProfile, "followingCount");
  const interests = targetProfile?.interests;
  const interestCount = Array.isArray(interests) ? interests.length : 0;
  const acceptsMessages = isOwnProfile ? true : targetProfile?.acceptsMessages !== false;

  const followButtonGroup = !isOwnProfile && followState ? (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={followMutation.isPending || followStateQuery.isLoading}
        onClick={() => followMutation.mutate()}
      >
        {followState.isFollowing ? "Unfollow" : "Follow"}
      </Button>
      <Button
        size="sm"
        disabled={followState.blockedByTarget || followState.hasBlocked || !acceptsMessages}
        onClick={() => {
          if (!user) {
            toast({
              title: "Log in required",
              description: "Sign in to send messages.",
              variant: "destructive",
            });
            return;
          }

          if (followState.blockedByTarget) {
            toast({
              title: "Cannot message",
              description: "This user has blocked you.",
              variant: "destructive",
            });
            return;
          }

          if (followState.hasBlocked) {
            toast({
              title: "Cannot message",
              description: "Unblock this user to send messages.",
              variant: "destructive",
            });
            return;
          }

          setShowMessageDialog(true);
        }}
      >
        Message
      </Button>
    </div>
  ) : undefined;

  return (
    <div className="max-w-3xl mx-auto p-8">
      <UserProfileCard
        name={targetProfile?.displayName || (isOwnProfile ? user?.email || "You" : "EV Connect User")}
        bio={targetProfile?.bio || (isOwnProfile ? "Add a short bio in Settings to let others know more about you." : "")}
        location={targetProfile?.location?.city || undefined}
        vehicle={vehicle}
        stats={{
          posts: posts.length,
          communities: interestCount,
          followers: followersCount,
          following: followingCount,
        }}
        isOwnProfile={isOwnProfile}
        actions={followButtonGroup}
        onFollowersClick={followersCount ? () => setActiveList("followers") : undefined}
        onFollowingClick={followingCount ? () => setActiveList("following") : undefined}
      />

      <Tabs defaultValue="posts" className="w-full">
        <TabsList>
          <TabsTrigger value="posts" className="gap-2" data-testid="tab-posts">
            <FileText className="h-4 w-4" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="bookmarks" className="gap-2" data-testid="tab-bookmarks">
            <Bookmark className="h-4 w-4" />
            Bookmarks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-6 space-y-4">
          {postsQuery.isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, idx) => (
                <Skeleton key={idx} className="h-32 w-full" />
              ))}
            </div>
          ) : postsQuery.isError ? (
            <Card className="p-6 text-center text-destructive">
              Failed to load posts. Please try again later.
            </Card>
          ) : posts.length > 0 ? (
            posts.map((post) => {
              const mediaArray = Array.isArray(post.media)
                ? post.media.map((item) => (typeof item === "string" ? item : item?.url || ""))
                : [];

              return (
                <PostCard
                  key={post.id}
                  id={post.id}
                  author={{
                    name: post.author?.displayName || targetProfile.displayName || user?.email || "User",
                    avatar: targetProfile?.avatarUrl || undefined,
                    id: post.authorId,
                  }}
                  timestamp={formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  community={post.communityId || undefined}
                  text={post.text}
                  media={mediaArray.filter(Boolean)}
                  likes={post.likes?.length || 0}
                  isLiked={!!user && !!post.likes && post.likes.includes(user.id)}
                  comments={post.commentsCount || 0}
                />
              );
            })
          ) : (
            <Card className="p-6 text-center text-muted-foreground">
              {isOwnProfile
                ? "You haven't posted anything yet. Share your first update from the communities page!"
                : "No posts from this user yet."}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bookmarks" className="mt-6 space-y-4">
          {isOwnProfile ? (
            bookmarksQuery.isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, idx) => (
                  <Skeleton key={idx} className="h-20 w-full" />
                ))}
              </div>
            ) : bookmarksQuery.isError ? (
              <Card className="p-6 text-center text-destructive">
                Failed to load bookmarks. Please try again later.
              </Card>
            ) : bookmarksQuery.data && bookmarksQuery.data.length > 0 ? (
              <div className="space-y-6">
                {stationBookmarks.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground">Stations</h3>
                    <div className="space-y-3">
                      {stationBookmarks.map((bookmark) => (
                        <BookmarkCard key={bookmark.id} bookmark={bookmark} />
                      ))}
                    </div>
                  </div>
                )}
                {postBookmarks.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground">Posts</h3>
                    <div className="space-y-3">
                      {postBookmarks.map((bookmark) => (
                        <BookmarkCard key={bookmark.id} bookmark={bookmark} />
                      ))}
                    </div>
                  </div>
                )}
                {stationBookmarks.length === 0 && postBookmarks.length === 0 && (
                  <Card className="p-6 text-center text-muted-foreground">
                    Your bookmarks will appear here once you start saving stations or posts.
                  </Card>
                )}
              </div>
            ) : (
              <Card className="p-6 text-center text-muted-foreground">
                You haven't bookmarked anything yet.
              </Card>
            )
          ) : (
            <Card className="p-6 text-center text-muted-foreground">
              Bookmarks are private.
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showMessageDialog} onOpenChange={(open) => {
        setShowMessageDialog(open);
        if (!open) setMessageBody("");
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send a message</DialogTitle>
            <DialogDescription>
              Start a conversation with {targetProfile.displayName || "this user"}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={targetProfile.avatarUrl ?? undefined} />
              <AvatarFallback>{(targetProfile.displayName || "?").charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{targetProfile.displayName || viewingUserId}</p>
              {targetProfile.location?.city && (
                <p className="text-xs text-muted-foreground">{targetProfile.location.city}</p>
              )}
            </div>
          </div>
          <Input
            placeholder="Say hi..."
            value={messageBody}
            onChange={(event) => setMessageBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (messageBody.trim()) {
                  messageMutation.mutate(messageBody.trim());
                }
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => messageMutation.mutate(messageBody.trim())}
              disabled={!messageBody.trim() || messageMutation.isPending}
            >
              {messageMutation.isPending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeList !== null} onOpenChange={(open) => setActiveList(open ? activeList : null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{activeList === "followers" ? "Followers" : "Following"}</DialogTitle>
            <DialogDescription>
              {activeList === "followers"
                ? "People who follow this profile."
                : "Profiles this user follows."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-80 pr-2">
            {activeList === "followers" ? (
              <FollowListContent
                state={{
                  data: followersListQuery.data,
                  isLoading: followersListQuery.isLoading,
                  isError: followersListQuery.isError,
                }}
                emptyMessage="No followers yet."
              />
            ) : (
              <FollowListContent
                state={{
                  data: followingListQuery.data,
                  isLoading: followingListQuery.isLoading,
                  isError: followingListQuery.isError,
                }}
                emptyMessage="Not following anyone yet."
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface UserPreview {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

function FollowListContent({
  state,
  emptyMessage,
}: {
  state: { data?: UserPreview[]; isLoading: boolean; isError: boolean };
  emptyMessage: string;
}) {
  if (state.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (state.isError) {
    return <p className="text-sm text-destructive">Unable to load list. Please try again later.</p>;
  }

  const data = state.data ?? [];
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <Link
          key={item.userId}
          href={`/profiles/${item.userId}`}
          className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={item.avatarUrl ?? undefined} />
            <AvatarFallback>{item.displayName?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">{item.displayName}</p>
            <p className="text-xs text-muted-foreground">{item.userId}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

async function fetchFollowList(userId: string, type: "followers" | "following"): Promise<UserPreview[]> {
  const endpoint = type === "followers" ? "followers" : "following";
  const res = await fetch(`/api/users/${userId}/${endpoint}`, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Failed to load list");
  }

  type RawEntry = { followerId?: string; followingId?: string };
  const entries: RawEntry[] = await res.json();

  const ids = entries
    .map((entry) => (type === "followers" ? entry.followerId : entry.followingId))
    .filter((id): id is string => !!id);

  const uniqueIds = Array.from(new Set(ids));
  const profiles = await Promise.all(
    uniqueIds.map(async (id) => {
      const profileRes = await fetch(`/api/profiles/${id}`);
      if (!profileRes.ok) {
        return { userId: id, displayName: id, avatarUrl: null };
      }
      const data = await profileRes.json();
      return {
        userId: id,
        displayName: data.displayName || id,
        avatarUrl: data.avatarUrl ?? null,
      };
    })
  );

  return profiles;
}
function getSocialCount(
  entity: ExtendedProfile | null | undefined,
  key: "followersCount" | "followingCount"
): number | undefined {
  if (!entity) return undefined;
  const value = entity[key];
  return typeof value === "number" ? value : undefined;
}
