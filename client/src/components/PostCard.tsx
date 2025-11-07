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

interface PostCardProps {
  id: string;
  author: {
    name: string;
    avatar?: string;
  };
  timestamp: string;
  community?: string;
  text: string;
  media?: string[];
  likes: number;
  comments: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
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
}: PostCardProps) {
  const [liked, setLiked] = useState(isLiked);
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [likeCount, setLikeCount] = useState(likes);

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    console.log(`Post ${id} like toggled`);
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    console.log(`Post ${id} bookmark toggled`);
  };

  return (
    <Card className="p-6 hover-elevate transition-shadow" data-testid={`card-post-${id}`}>
      <div className="flex items-start gap-3 mb-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={author.avatar} />
          <AvatarFallback>{author.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm" data-testid={`text-author-${id}`}>
              {author.name}
            </span>
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
            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-menu-${id}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Delete</DropdownMenuItem>
            <DropdownMenuItem>Report</DropdownMenuItem>
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
          onClick={handleLike}
          data-testid={`button-like-${id}`}
        >
          <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
          <span>{likeCount}</span>
        </Button>
        
        <Button variant="ghost" size="sm" className="gap-2" data-testid={`button-comment-${id}`}>
          <MessageCircle className="h-4 w-4" />
          <span>{comments}</span>
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon"
          className={bookmarked ? 'text-primary' : ''}
          onClick={handleBookmark}
          data-testid={`button-bookmark-${id}`}
        >
          <Bookmark className={`h-4 w-4 ${bookmarked ? 'fill-current' : ''}`} />
        </Button>
      </div>
    </Card>
  );
}
