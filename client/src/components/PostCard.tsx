import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Bookmark, MoreVertical } from "lucide-react";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";

interface PostCardProps {
  id: string;
  author: {
    name: string;
    avatar?: string;
    id?: string;
  };
  timestamp: string;
  community?: string;
  text: string;
  media?: string[];
  likes: number;
  comments: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  onRefresh?: () => void;
}

export function PostCard({
  id,
  author,
  timestamp,
  community,
  text,
  media,
  likes,
  comments,
  isLiked = false,
  isBookmarked = false,
  onRefresh,
}: PostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [liked, setLiked] = useState(isLiked);
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [likeCount, setLikeCount] = useState(likes);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const isAuthor = user?.id === author.id;
  const isAdmin = user?.role === "ADMIN";
  const canDelete = isAuthor || isAdmin;

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
      setLiked(!liked);
      setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to toggle like",
        variant: "destructive",
      });
    },
  });


  const deleteMutation = useMutation({
    mutationFn: async () => {
      const endpoint = isAuthor ? `/api/posts/${id}` : isAdmin ? `/api/admin/posts/${id}` : `/api/posts/${id}`;
      const res = await fetch(endpoint, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete post");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: isAdmin && !isAuthor ? "Post removed by admin." : "Post deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      onRefresh?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete post",
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
      setBookmarked(!bookmarked);
      toast({
        title: "Success",
        description: bookmarked ? "Bookmark removed" : "Post bookmarked",
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

  const handleLike = () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to like posts",
        variant: "destructive",
      });
      return;
    }
    likeMutation.mutate();
  };

  const handleComment = () => {
    setLocation(`/posts/${id}`);
  };

  const authorHref = author.id ? `/profiles/${author.id}` : "/profile";

  const handleBookmark = () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to bookmark posts",
        variant: "destructive",
      });
      return;
    }
    bookmarkMutation.mutate();
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleReport = () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to report posts",
        variant: "destructive",
      });
      return;
    }
    setShowReportDialog(true);
  };

  return (
    <Card 
      className="p-6 hover-elevate transition-shadow cursor-pointer" 
      data-testid={`card-post-${id}`}
      onClick={() => setLocation(`/posts/${id}`)}
    >
      <div className="flex items-start gap-3 mb-4">
        <Link
          href={authorHref}
          onClick={(event) => event.stopPropagation()}
          className="flex-shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={author.avatar} />
            <AvatarFallback>{author.name.split(' ').map((n) => n[0]).join('')}</AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={authorHref}
              onClick={(event) => event.stopPropagation()}
              className="font-semibold text-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              data-testid={`text-author-${id}`}
            >
              {author.name}
            </Link>
            {community && (
              <Badge variant="secondary" className="text-xs">
                {community}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{timestamp}</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              data-testid={`button-menu-${id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {isAuthor && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/posts/${id}`); }}>Edit</DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="text-destructive"
              >
                {isAdmin && !isAuthor ? "Delete as admin" : "Delete"}
              </DropdownMenuItem>
            )}
            {!isAuthor && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReport(); }}>Report</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-base mb-4 whitespace-pre-wrap" data-testid={`text-content-${id}`}>
        {text}
      </p>

      {media && media.length > 0 && (
        <div className={`grid gap-2 mb-4 ${media.length === 1 ? 'grid-cols-1' : media.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {media.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Post media ${i + 1}`}
              className="w-full h-64 object-cover rounded-lg"
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className={`gap-2 ${liked ? 'text-destructive' : ''}`}
          onClick={(e) => { e.stopPropagation(); handleLike(); }}
          data-testid={`button-like-${id}`}
        >
          <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
          <span>{likeCount}</span>
        </Button>
        
        <Button variant="ghost" size="sm" className="gap-2" onClick={(e) => { e.stopPropagation(); handleComment(); }} data-testid={`button-comment-${id}`}>
          <MessageCircle className="h-4 w-4" />
          <span>{comments}</span>
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon"
          className={bookmarked ? 'text-primary' : ''}
          onClick={(e) => { e.stopPropagation(); handleBookmark(); }}
          data-testid={`button-bookmark-${id}`}
        >
          <Bookmark className={`h-4 w-4 ${bookmarked ? 'fill-current' : ''}`} />
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              {isAdmin && !isAuthor
                ? "Are you sure you want to remove this post for all users? This action cannot be undone."
                : "Are you sure you want to delete this post? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteMutation.mutate();
                setShowDeleteDialog(false);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
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
    </Card>
  );
}
