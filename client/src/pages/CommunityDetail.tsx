import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PostComposer } from "@/components/PostComposer";
import { PostCard } from "@/components/PostCard";
import { ArrowLeft, Users, Settings, LogOut, Flag } from "lucide-react";

interface Community {
  id: string;
  name: string;
  slug: string;
  type: string;
  description?: string;
  coverImageUrl?: string;
  membersCount: number;
  isMember?: boolean;
  createdAt: string;
}

interface Post {
  id: string;
  text: string;
  media?: Array<{ type: string; url: string }>;
  authorId: string;
  communityId?: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  likes: string[];
  commentsCount: number;
  createdAt: string;
}

export default function CommunityDetail() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const communityQueryKey = [`/api/communities/slug/${slug}`];

  const { data: community, isLoading: communityLoading } = useQuery<Community>({
    queryKey: communityQueryKey,
    queryFn: async () => {
      const res = await fetch(`/api/communities/slug/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch community");
      return res.json();
    },
  });

  const { data: posts, isLoading: postsLoading, refetch: refetchPosts } = useQuery<Post[]>({
    queryKey: [`/api/communities/${community?.id}/posts`],
    queryFn: async () => {
      if (!community?.id) return [];
      const res = await fetch(`/api/communities/${community.id}/posts`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
    enabled: !!community?.id,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!community) return;
      const res = await fetch(`/api/communities/${community.id}/join`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to join community");
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: communityQueryKey });
      const previous = queryClient.getQueryData<Community>(communityQueryKey);
      if (previous) {
        queryClient.setQueryData<Community>(communityQueryKey, {
          ...previous,
          isMember: true,
          membersCount: previous.membersCount + 1,
        });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(communityQueryKey, context.previous);
      }
      toast({ title: "Failed to join community", variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Joined community successfully!" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: communityQueryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
      refetchPosts();
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!community) return;
      const res = await fetch(`/api/communities/${community.id}/leave`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to leave community");
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: communityQueryKey });
      const previous = queryClient.getQueryData<Community>(communityQueryKey);
      if (previous) {
        queryClient.setQueryData<Community>(communityQueryKey, {
          ...previous,
          isMember: false,
          membersCount: Math.max(0, previous.membersCount - 1),
        });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(communityQueryKey, context.previous);
      }
      toast({ title: "Failed to leave community", variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Left community successfully!" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: communityQueryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
      refetchPosts();
    },
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!community) return;
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetType: "COMMUNITY",
          targetId: community.id,
          reason: reportReason,
        }),
      });
      if (!res.ok) throw new Error("Failed to report community");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Community reported to the admins" });
      setReportDialogOpen(false);
      setReportReason("");
    },
    onError: () => {
      toast({ title: "Failed to report community", variant: "destructive" });
    },
  });

  if (communityLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="animate-pulse">
          <div className="h-64 bg-muted" />
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="h-8 bg-muted rounded w-1/3 mb-4" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Community not found</p>
          <Button onClick={() => setLocation("/communities")}>
            Back to Communities
          </Button>
        </Card>
      </div>
    );
  }

  const getCommunityTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      GENERAL: "bg-blue-500",
      BRAND: "bg-purple-500",
      REGIONAL: "bg-green-500",
      INTEREST: "bg-orange-500",
    };
    return colors[type] || "bg-gray-500";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Cover Image */}
      <div className="relative h-64 bg-gradient-to-br from-primary/20 to-primary/5">
        {community.coverImageUrl && (
          <img
            src={community.coverImageUrl}
            alt={community.name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      {/* Community Info */}
      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10">
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/communities")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex gap-2">
              {user && (
                <>
                  {community.isMember ? (
                    <Button
                      variant="destructive"
                      onClick={() => leaveMutation.mutate()}
                      disabled={leaveMutation.isPending}
                      className="gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Exit
                    </Button>
                  ) : (
                    <Button
                      onClick={() => joinMutation.mutate()}
                      disabled={joinMutation.isPending}
                    >
                      Join Community
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setReportDialogOpen(true)}
                    disabled={reportMutation.isPending}
                    className="gap-2"
                  >
                    <Flag className="h-4 w-4" />
                    Report
                  </Button>
                  {user.role === "ADMIN" && (
                    <Button variant="ghost" size="icon">
                      <Settings className="h-5 w-5" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{community.name}</h1>
                <Badge className={getCommunityTypeColor(community.type)}>
                  {community.type}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-4">
                {community.description || "Welcome to this community!"}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{community.membersCount} members</span>
                </div>
                <span>•</span>
                <span>Created {new Date(community.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6 space-y-6">
            {/* Post Composer - Only for members */}
            {user && community.isMember && (
              <PostComposer 
                communityId={community.id}
                onPostCreated={refetchPosts}
              />
            )}

            {/* Posts Feed */}
            {postsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse h-48 bg-muted rounded-lg" />
                ))}
              </div>
            ) : posts && posts.length > 0 ? (
              <div className="space-y-6">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    id={post.id}
                    author={{
                      id: post.authorId,
                      name: post.author.displayName || post.authorId,
                      avatar: post.author.avatarUrl,
                    }}
                    timestamp={new Date(post.createdAt).toLocaleString()}
                    community={community.name}
                    text={post.text}
                    media={post.media?.map(m => m.url)}
                    likes={post.likes.length}
                    comments={post.commentsCount}
                    isLiked={user ? post.likes.includes(user.id) : false}
                    onRefresh={refetchPosts}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  {community.isMember
                    ? "No posts yet. Be the first to post in this community!"
                    : "Join this community to see and create posts"}
                </p>
                {!community.isMember && user && (
                  <Button onClick={() => joinMutation.mutate()}>
                    Join Community
                  </Button>
                )}
              </Card>
            )}
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">About this community</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-muted-foreground">
                    {community.description || "No description available"}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Community Type</h3>
                  <Badge className={getCommunityTypeColor(community.type)}>
                    {community.type}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Stats</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold">{community.membersCount}</p>
                      <p className="text-sm text-muted-foreground">Members</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{posts?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Posts</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Community</DialogTitle>
            <DialogDescription>
              Tell us why this community should be reviewed by the admins.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Describe the issue..."
            rows={4}
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => reportMutation.mutate()}
              disabled={!reportReason.trim() || reportMutation.isPending}
            >
              {reportMutation.isPending ? "Reporting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
