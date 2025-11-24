import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUp, MessageSquare, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface QuestionCardProps {
  id: string;
  title: string;
  body: string;
  tags: string[];
  author: string;
  timestamp: string;
  upvotes: number;
  answers: number;
  isSolved?: boolean;
  isUpvoted?: boolean;
}

export function QuestionCard({
  id,
  title,
  body,
  tags,
  author,
  timestamp,
  upvotes,
  answers,
  isSolved = false,
  isUpvoted = false,
}: QuestionCardProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [upvoted, setUpvoted] = useState(isUpvoted);
  const [upvoteCount, setUpvoteCount] = useState(upvotes);

  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({ title: "Please login to vote", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch(`/api/questions/${id}/upvote`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to vote");
      setUpvoted(!upvoted);
      setUpvoteCount(upvoted ? upvoteCount - 1 : upvoteCount + 1);
    } catch (error) {
      toast({ title: "Failed to vote", variant: "destructive" });
    }
  };

  const handleCardClick = () => {
    setLocation(`/questions/${id}`);
  };

  return (
    <Card 
      className="p-4 border-l-4 hover-elevate transition-shadow cursor-pointer" 
      data-testid={`card-question-${id}`}
      onClick={handleCardClick}
    >
      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-1">
          <Button
            variant={upvoted ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={handleUpvote}
            data-testid={`button-upvote-${id}`}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{upvoteCount}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <h3 className="font-semibold text-lg flex-1 hover:text-primary transition-colors" data-testid={`text-title-${id}`}>
              {title}
            </h3>
            {isSolved && (
              <Badge variant="default" className="gap-1 bg-status-online">
                <CheckCircle className="h-3 w-3" />
                Solved
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {body}
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{author}</span>
            <span>·</span>
            <span>{timestamp}</span>
            <div className="flex items-center gap-1 ml-auto">
              <MessageSquare className="h-4 w-4" />
              <span>{answers} answers</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
