import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Heart, MessageCircle, Share2, ArrowLeft, Bookmark, Trash2, Flag, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Article {
  id: string;
  kind: string;
  title: string;
  summary: string;
  body: string;
  coverImageUrl?: string;
  tags?: string[];
  likes?: string[];
  commentsCount: number;
  authorId: string;
  publishedAt: string;
}

interface Comment {
  id: string;
  articleId: string;
  authorId: string;
  text: string;
  createdAt: string;
  author?: {
    displayName: string;
    avatarUrl?: string;
  };
}

export default function ArticleDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const { data: article, isLoading: articleLoading } = useQuery<Article>({
    queryKey: [`/api/articles/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/articles/${id}`);
      if (!res.ok) throw new Error("Failed to fetch article");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: comments, isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: [`/api/articles/${id}/comments`],
    queryFn: async () => {
      const res = await fetch(`/api/articles/${id}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
    enabled: !!id,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/articles/${id}/like`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to like article");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/articles/${id}`] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/articles/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to post comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/articles/${id}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/articles/${id}`] });
      setCommentText("");
      toast({ title: "Comment posted successfully!" });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "ARTICLE", targetId: id }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to bookmark article");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Article bookmarked!" });
    },
  });

  const deleteArticleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/articles/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete article");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Article deleted successfully" });
      setLocation("/articles");
    },
    onError: () => {
      toast({ title: "Failed to delete article", variant: "destructive" });
    },
  });

  const reportArticleMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "ARTICLE",
          targetId: id,
          reason,
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to report article");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Article reported successfully" });
      setReportDialogOpen(false);
      setReportReason("");
    },
    onError: () => {
      toast({ title: "Failed to report article", variant: "destructive" });
    },
  });

  const handleComment = () => {
    if (!commentText.trim()) return;
    commentMutation.mutate(commentText);
  };

  const handleDeleteArticle = () => {
    deleteArticleMutation.mutate();
  };

  const handleReportArticle = () => {
    if (!reportReason.trim()) return;
    reportArticleMutation.mutate(reportReason);
  };

  const isLiked = article?.likes?.includes(user?.id || "");
  const canDelete = user && (user.id === article?.authorId || user.role === "ADMIN");

  if (articleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-64 bg-muted rounded" />
            <div className="h-6 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Article not found</h2>
          <Button onClick={() => setLocation("/articles")}>Back to Articles</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button and Actions */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => setLocation("/articles")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Articles
          </Button>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canDelete && (
                  <DropdownMenuItem
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Article
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setReportDialogOpen(true)}>
                  <Flag className="h-4 w-4 mr-2" />
                  Report Article
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Article Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Badge>{article.kind}</Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(article.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <h1 className="text-4xl font-bold font-display mb-4">{article.title}</h1>
          <p className="text-xl text-muted-foreground mb-6">{article.summary}</p>
          
          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-6">
              {article.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Cover Image */}
        {article.coverImageUrl && (
          <img
            src={article.coverImageUrl}
            alt={article.title}
            className="w-full h-96 object-cover rounded-lg mb-8"
          />
        )}

        {/* Article Body */}
        <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
          <div dangerouslySetInnerHTML={{ __html: article.body.replace(/\n/g, "<br />") }} />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant={isLiked ? "default" : "outline"}
            onClick={() => likeMutation.mutate()}
            disabled={!user || likeMutation.isPending}
          >
            <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
            {article.likes?.length || 0}
          </Button>
          <Button variant="outline">
            <MessageCircle className="h-4 w-4 mr-2" />
            {article.commentsCount}
          </Button>
          <Button
            variant="outline"
            onClick={() => bookmarkMutation.mutate()}
            disabled={!user || bookmarkMutation.isPending}
          >
            <Bookmark className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        <Separator className="my-8" />

        {/* Comments Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">
            Comments ({comments?.length || 0})
          </h2>

          {/* Comment Form */}
          {user ? (
            <Card className="mb-6">
              <CardContent className="p-4">
                <Textarea
                  placeholder="Share your thoughts..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  className="mb-3"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleComment}
                    disabled={!commentText.trim() || commentMutation.isPending}
                  >
                    {commentMutation.isPending ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-6">
              <CardContent className="p-4 text-center">
                <p className="text-muted-foreground mb-3">Sign in to leave a comment</p>
                <Button onClick={() => setLocation("/login")}>Sign In</Button>
              </CardContent>
            </Card>
          )}

          {/* Comments List */}
          {commentsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 bg-muted rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/4" />
                        <div className="h-3 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded w-5/6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Link
                        href={comment.authorId ? `/profiles/${comment.authorId}` : "/profile"}
                        onClick={(event) => event.stopPropagation()}
                        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Avatar>
                          <AvatarImage src={comment.author?.avatarUrl} />
                          <AvatarFallback>
                            {comment.author?.displayName?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <Link
                              href={comment.authorId ? `/profiles/${comment.authorId}` : "/profile"}
                              onClick={(event) => event.stopPropagation()}
                              className="font-semibold hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              {comment.author?.displayName || "Anonymous"}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {user && user.id === comment.authorId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => deleteCommentMutation.mutate(comment.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No comments yet. Be the first to comment!
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Article</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this article? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteArticle}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Report Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Article</DialogTitle>
              <DialogDescription>
                Please provide a reason for reporting this article.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Describe why you're reporting this article..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={4}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReportArticle}
                disabled={!reportReason.trim() || reportArticleMutation.isPending}
              >
                {reportArticleMutation.isPending ? "Reporting..." : "Submit Report"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
