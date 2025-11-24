import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Heart, MessageCircle, Bookmark, MoreVertical, ArrowLeft, Trash2 } from "lucide-react";
import { useState } from "react";

interface Post {
  id: string;
  text: string;
  media?: Array<{ type: string; url: string }>;
  authorId: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  likes: string[];
  commentsCount: number;
  visibility: string;
  createdAt: string;
}

interface Comment {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export default function PostDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editText, setEditText] = useState("");
  const [reportReason, setReportReason] = useState("");

  const { data: post, isLoading: postLoading } = useQuery<Post>({
    queryKey: [`/api/posts/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${id}`);
      if (!res.ok) throw new Error("Failed to fetch post");
      return res.json();
    },
  });

  const { data: comments, isLoading: commentsLoading, refetch: refetchComments } = useQuery<Comment[]>({
    queryKey: [`/api/posts/${id}/comments`],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${id}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/posts/${id}/like`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle like");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${id}`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to toggle like",
        variant: "destructive",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/posts/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      return res.json();
    },
    onSuccess: () => {
      setCommentText("");
      refetchComments();
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${id}`] });
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete comment");
    },
    onSuccess: () => {
      refetchComments();
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${id}`] });
      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete post");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    },
  });

  const editPostMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to update post");
      return res.json();
    },
    onSuccess: () => {
      setShowEditDialog(false);
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${id}`] });
      toast({
        title: "Success",
        description: "Post updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive",
      });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetType: "POST",
          targetId: id,
          reason,
        }),
      });
      if (!res.ok) throw new Error("Failed to report post");
      return res.json();
    },
    onSuccess: () => {
      setReportReason("");
      setShowReportDialog(false);
      toast({
        title: "Success",
        description: "Post reported successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to report post",
        variant: "destructive",
      });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetType: "POST",
          targetId: id,
        }),
      });
      if (!res.ok) throw new Error("Failed to toggle bookmark");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bookmark toggled",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to toggle bookmark",
        variant: "destructive",
      });
    },
  });

  const handleComment = () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to comment",
        variant: "destructive",
      });
      return;
    }
    if (!commentText.trim()) return;
    commentMutation.mutate(commentText);
  };

  const handleEdit = () => {
    if (!post) return;
    setEditText(post.text);
    setShowEditDialog(true);
  };

  if (postLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Post not found</p>
          <Button onClick={() => setLocation("/")} className="mt-4">
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  const isAuthor = user?.id === post.authorId;
  const isLiked = user ? post.likes.includes(user.id) : false;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center gap-4 p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Post</h1>
          </div>
        </div>

        {/* Post */}
        <Card className="border-x-0 border-t-0 rounded-none">
          <div className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <Link
                href={post.author?.id ? `/profiles/${post.author.id}` : `/profiles/${post.authorId}`}
                onClick={(event) => event.stopPropagation()}
                className="flex-shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={post.author.avatarUrl} />
                  <AvatarFallback>
                    {post.author.displayName.split(' ').map((n) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <Link
                      href={post.author?.id ? `/profiles/${post.author.id}` : `/profiles/${post.authorId}`}
                      onClick={(event) => event.stopPropagation()}
                      className="font-semibold hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {post.author.displayName}
                    </Link>
                    {post.visibility === "COMMUNITY" && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Community
                      </Badge>
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isAuthor && (
                        <>
                          <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setShowDeleteDialog(true)}
                            className="text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                      {!isAuthor && (
                        <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                          Report
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            <p className="text-lg mb-4 whitespace-pre-wrap">{post.text}</p>

            {post.media && post.media.length > 0 && (
              <div className={`grid gap-2 mb-4 ${post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {post.media.map((m, i) => (
                  <img
                    key={i}
                    src={m.url}
                    alt={`Post media ${i + 1}`}
                    className="w-full rounded-lg border"
                  />
                ))}
              </div>
            )}

            <div className="text-sm text-muted-foreground mb-4">
              {new Date(post.createdAt).toLocaleString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </div>

            <div className="flex items-center gap-4 py-3 border-y">
              <div className="flex items-center gap-1">
                <span className="font-semibold">{post.likes.length}</span>
                <span className="text-muted-foreground text-sm">Likes</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold">{post.commentsCount}</span>
                <span className="text-muted-foreground text-sm">Comments</span>
              </div>
            </div>

            <div className="flex items-center justify-around py-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                className={`gap-2 ${isLiked ? 'text-destructive' : ''}`}
                onClick={() => user ? likeMutation.mutate() : toast({ title: "Please log in", variant: "destructive" })}
              >
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
              
              <Button variant="ghost" size="sm" className="gap-2">
                <MessageCircle className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => user ? bookmarkMutation.mutate() : toast({ title: "Please log in", variant: "destructive" })}
              >
                <Bookmark className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Comment Input */}
        {user && (
          <Card className="border-x-0 border-t-0 rounded-none p-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {user.email.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="Post your reply"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[80px] resize-none border-0 focus-visible:ring-0 p-0"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    onClick={handleComment}
                    disabled={!commentText.trim() || commentMutation.isPending}
                    size="sm"
                  >
                    {commentMutation.isPending ? "Replying..." : "Reply"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Comments */}
        <div>
          {commentsLoading ? (
            <div className="space-y-4 p-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse h-24 bg-muted rounded-lg" />
              ))}
            </div>
          ) : comments && comments.length > 0 ? (
            comments.map((comment) => {
              const displayName = comment.author?.displayName || "EV Connect User";
              const profileHref = comment.authorId ? `/profiles/${comment.authorId}` : "/profile";
              return (
                <Card
                  key={comment.id}
                  className="border-x-0 border-t-0 rounded-none p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex gap-3">
                    <Link
                      href={profileHref}
                      onClick={(event) => event.stopPropagation()}
                      className="flex-shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={comment.author?.avatarUrl} />
                        <AvatarFallback>
                          {displayName.split(' ').map((n) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Link
                            href={profileHref}
                            onClick={(event) => event.stopPropagation()}
                            className="font-semibold text-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            {displayName}
                          </Link>
                          <span className="text-sm text-muted-foreground">
                            · {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {(user?.id === comment.authorId || user?.role === "ADMIN" || user?.role === "MODERATOR") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteCommentMutation.mutate(comment.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <p className="text-sm mt-1 whitespace-pre-wrap">{comment.text}</p>
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="border-x-0 border-t-0 rounded-none p-8 text-center">
              <p className="text-muted-foreground">No comments yet. Be the first to reply!</p>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>
              Make changes to your post
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="min-h-[150px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => editPostMutation.mutate(editText)}
              disabled={!editText.trim() || editPostMutation.isPending}
            >
              {editPostMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deletePostMutation.mutate();
                setShowDeleteDialog(false);
              }}
              disabled={deletePostMutation.isPending}
            >
              {deletePostMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Post</DialogTitle>
            <DialogDescription>
              Please describe why you're reporting this post
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for reporting..."
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => reportMutation.mutate(reportReason)}
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
