import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowUp, MessageSquare, Bookmark, Share2, MoreVertical, ArrowLeft, CheckCircle, Flag, Trash2 } from "lucide-react";

interface Question {
  id: string;
  title: string;
  body: string;
  tags: string[];
  authorId: string;
  upvotes: string[];
  answersCount: number;
  solvedAnswerId: string | null;
  createdAt: string;
  author?: {
    displayName: string;
    avatarUrl?: string;
  };
}

interface Answer {
  id: string;
  questionId: string;
  authorId: string;
  body: string;
  upvotes: string[];
  createdAt: string;
  author?: {
    displayName: string;
    avatarUrl?: string;
  };
}

export default function QuestionDetail() {
  const [, params] = useRoute("/questions/:id");
  const [, setLocation] = useLocation();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [answerText, setAnswerText] = useState("");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const questionId = params?.id;

  const { data: question, isLoading: questionLoading } = useQuery<Question>({
    queryKey: [`/api/questions/${questionId}`],
    enabled: !!questionId,
  });

  const { data: answers = [], isLoading: answersLoading } = useQuery<Answer[]>({
    queryKey: [`/api/questions/${questionId}/answers`],
    enabled: !!questionId,
  });

  const upvoteQuestionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/questions/${questionId}/upvote`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to vote");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/questions/${questionId}`] });
    },
    onError: () => {
      toast({ title: "Failed to vote", variant: "destructive" });
    },
  });

  const upvoteAnswerMutation = useMutation({
    mutationFn: async (answerId: string) => {
      const res = await fetch(`/api/answers/${answerId}/upvote`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to vote");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/questions/${questionId}/answers`] });
    },
    onError: () => {
      toast({ title: "Failed to vote", variant: "destructive" });
    },
  });

  const postAnswerMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/questions/${questionId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error("Failed to post answer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/questions/${questionId}/answers`] });
      queryClient.invalidateQueries({ queryKey: [`/api/questions/${questionId}`] });
      setAnswerText("");
      toast({ title: "Answer posted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to post answer", variant: "destructive" });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetType: "QUESTION",
          targetId: questionId,
          reason: reportReason,
        }),
      });
      if (!res.ok) throw new Error("Failed to report");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Question reported successfully" });
      setReportDialogOpen(false);
      setReportReason("");
    },
    onError: () => {
      toast({ title: "Failed to report question", variant: "destructive" });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/questions/${questionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Question deleted successfully" });
      setLocation("/qa");
    },
    onError: () => {
      toast({ title: "Failed to delete question", variant: "destructive" });
    },
  });

  const handlePostAnswer = () => {
    if (!user) {
      toast({ title: "Please login to answer", variant: "destructive" });
      return;
    }
    if (!answerText.trim()) return;
    postAnswerMutation.mutate(answerText);
  };

  const handleUpvoteQuestion = () => {
    if (!user) {
      toast({ title: "Please login to vote", variant: "destructive" });
      return;
    }
    upvoteQuestionMutation.mutate();
  };

  const handleUpvoteAnswer = (answerId: string) => {
    if (!user) {
      toast({ title: "Please login to vote", variant: "destructive" });
      return;
    }
    upvoteAnswerMutation.mutate(answerId);
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const canDelete = user && (user.role === "ADMIN" || user.id === question?.authorId);

  if (questionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading question...</div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Question not found</h2>
          <Button onClick={() => setLocation("/qa")}>Back to Q&A Forum</Button>
        </div>
      </div>
    );
  }

  const isUpvoted = user ? question.upvotes.includes(user.id) : false;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation("/qa")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Q&A Forum
        </Button>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={question.author?.avatarUrl} />
                    <AvatarFallback>{question.author?.displayName?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{question.author?.displayName || "Unknown"}</div>
                    <div className="text-sm text-muted-foreground">{getTimeAgo(question.createdAt)}</div>
                  </div>
                  {question.solvedAnswerId && (
                    <Badge variant="default" className="gap-1 bg-status-online ml-auto">
                      <CheckCircle className="h-3 w-3" />
                      Solved
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold mb-3">{question.title}</h1>
                <p className="text-muted-foreground whitespace-pre-wrap mb-4">{question.body}</p>
                <div className="flex flex-wrap gap-2">
                  {question.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {user && (
                    <DropdownMenuItem onClick={() => setReportDialogOpen(true)}>
                      <Flag className="h-4 w-4 mr-2" />
                      Report
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem 
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Button
                variant={isUpvoted ? "default" : "outline"}
                size="sm"
                onClick={handleUpvoteQuestion}
                className="gap-2"
              >
                <ArrowUp className="h-4 w-4" />
                {question.upvotes.length}
              </Button>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>{question.answersCount} answers</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Answer Input */}
        {user && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatarUrl} />
                  <AvatarFallback>{profile?.displayName?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder="Write your answer..."
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    rows={4}
                    className="mb-3"
                  />
                  <Button
                    onClick={handlePostAnswer}
                    disabled={!answerText.trim() || postAnswerMutation.isPending}
                  >
                    {postAnswerMutation.isPending ? "Posting..." : "Post Answer"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Answers Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">
            {question.answersCount} {question.answersCount === 1 ? "Answer" : "Answers"}
          </h2>

          {answersLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading answers...</div>
          ) : answers.length > 0 ? (
            answers.map((answer) => {
              const isAnswerUpvoted = user ? answer.upvotes.includes(user.id) : false;
              return (
                <Card key={answer.id} className={question.solvedAnswerId === answer.id ? "border-green-500 border-2" : ""}>
                  <CardContent className="pt-6">
                    <div className="flex gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={answer.author?.avatarUrl} />
                        <AvatarFallback>{answer.author?.displayName?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{answer.author?.displayName || "Unknown"}</span>
                          <span className="text-sm text-muted-foreground">·</span>
                          <span className="text-sm text-muted-foreground">{getTimeAgo(answer.createdAt)}</span>
                          {question.solvedAnswerId === answer.id && (
                            <Badge variant="default" className="gap-1 bg-status-online">
                              <CheckCircle className="h-3 w-3" />
                              Accepted Answer
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground whitespace-pre-wrap mb-3">{answer.body}</p>
                        <div className="flex items-center gap-4">
                          <Button
                            variant={isAnswerUpvoted ? "default" : "ghost"}
                            size="sm"
                            onClick={() => handleUpvoteAnswer(answer.id)}
                            className="gap-2"
                          >
                            <ArrowUp className="h-4 w-4" />
                            {answer.upvotes.length}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No answers yet. Be the first to answer!
              </CardContent>
            </Card>
          )}
        </div>

        {/* Report Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Question</DialogTitle>
              <DialogDescription>
                Please provide a reason for reporting this question
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Describe the issue..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={4}
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

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Question</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this question? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteQuestionMutation.mutate()}
                disabled={deleteQuestionMutation.isPending}
              >
                {deleteQuestionMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
