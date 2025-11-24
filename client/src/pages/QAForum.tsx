import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { QuestionCard } from "@/components/QuestionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, TrendingUp, Clock, CheckCircle } from "lucide-react";

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

export default function QAForum() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    title: "",
    body: "",
    tags: "",
  });

  const popularTags = ["battery", "charging", "maintenance", "range", "winter", "software"];

  const { data: questions, isLoading } = useQuery<Question[]>({
    queryKey: ["/api/questions", { tag: selectedTag, limit: 50 }],
    queryFn: async ({ queryKey }) => {
      const [url, params] = queryKey as [string, { tag: string | null; limit: number }];
      const queryParams = new URLSearchParams();
      if (params.tag) queryParams.append("tag", params.tag);
      queryParams.append("limit", params.limit.toString());
      const res = await fetch(`${url}?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch questions");
      return res.json();
    },
  });

  const handleCreateQuestion = async () => {
    if (!user) {
      toast({ title: "Please login to ask a question", variant: "destructive" });
      return;
    }

    try {
      const tags = newQuestion.tags.split(",").map(t => t.trim()).filter(Boolean);
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: newQuestion.title,
          body: newQuestion.body,
          tags,
        }),
      });

      if (!res.ok) throw new Error("Failed to create question");
      const data = await res.json();
      toast({ title: "Question posted successfully!" });
      setCreateDialogOpen(false);
      setNewQuestion({ title: "", body: "", tags: "" });
      setLocation(`/questions/${data.id}`);
    } catch (error) {
      toast({ title: "Failed to create question", variant: "destructive" });
    }
  };

  const filteredQuestions = questions?.filter((q) => {
    const matchesSearch = searchQuery === "" ||
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.body.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const recentQuestions = filteredQuestions?.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const popularQuestions = filteredQuestions?.sort((a, b) => 
    b.upvotes.length - a.upvotes.length
  );

  const solvedQuestions = filteredQuestions?.filter(q => q.solvedAnswerId);

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-display font-bold text-3xl mb-2">Q&A Forum</h1>
              <p className="text-muted-foreground">
                Get answers from the EV community
              </p>
            </div>
            <Button 
              className="gap-2" 
              data-testid="button-ask-question"
              onClick={() => user ? setCreateDialogOpen(true) : toast({ title: "Please login to ask a question", variant: "destructive" })}
            >
              <Plus className="h-4 w-4" />
              Ask Question
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                className="pl-9"
                data-testid="input-search-questions"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <Tabs defaultValue="recent" className="w-full">
              <TabsList>
                <TabsTrigger value="recent" className="gap-2" data-testid="tab-recent-questions">
                  <Clock className="h-4 w-4" />
                  Recent
                </TabsTrigger>
                <TabsTrigger value="popular" className="gap-2" data-testid="tab-popular">
                  <TrendingUp className="h-4 w-4" />
                  Popular
                </TabsTrigger>
                <TabsTrigger value="solved" className="gap-2" data-testid="tab-solved">
                  <CheckCircle className="h-4 w-4" />
                  Solved
                </TabsTrigger>
              </TabsList>

              <TabsContent value="recent" className="space-y-4 mt-6">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading questions...</div>
                ) : recentQuestions && recentQuestions.length > 0 ? (
                  recentQuestions.map((q) => (
                    <QuestionCard
                      key={q.id}
                      id={q.id}
                      title={q.title}
                      body={q.body}
                      tags={q.tags}
                      author={q.author?.displayName || "Unknown"}
                      timestamp={getTimeAgo(q.createdAt)}
                      upvotes={q.upvotes.length}
                      answers={q.answersCount}
                      isSolved={!!q.solvedAnswerId}
                      isUpvoted={user ? q.upvotes.includes(user.id) : false}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No questions found</div>
                )}
              </TabsContent>

              <TabsContent value="popular" className="space-y-4 mt-6">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading questions...</div>
                ) : popularQuestions && popularQuestions.length > 0 ? (
                  popularQuestions.map((q) => (
                    <QuestionCard
                      key={q.id}
                      id={q.id}
                      title={q.title}
                      body={q.body}
                      tags={q.tags}
                      author={q.author?.displayName || "Unknown"}
                      timestamp={getTimeAgo(q.createdAt)}
                      upvotes={q.upvotes.length}
                      answers={q.answersCount}
                      isSolved={!!q.solvedAnswerId}
                      isUpvoted={user ? q.upvotes.includes(user.id) : false}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No questions found</div>
                )}
              </TabsContent>

              <TabsContent value="solved" className="space-y-4 mt-6">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading questions...</div>
                ) : solvedQuestions && solvedQuestions.length > 0 ? (
                  solvedQuestions.map((q) => (
                    <QuestionCard
                      key={q.id}
                      id={q.id}
                      title={q.title}
                      body={q.body}
                      tags={q.tags}
                      author={q.author?.displayName || "Unknown"}
                      timestamp={getTimeAgo(q.createdAt)}
                      upvotes={q.upvotes.length}
                      answers={q.answersCount}
                      isSolved={!!q.solvedAnswerId}
                      isUpvoted={user ? q.upvotes.includes(user.id) : false}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No solved questions yet</div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-4">Popular Tags</h3>
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTag === tag ? "default" : "secondary"}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4">Guidelines</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Be respectful and constructive</li>
                <li>• Search before asking</li>
                <li>• Provide context and details</li>
                <li>• Mark helpful answers</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Create Question Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ask a Question</DialogTitle>
              <DialogDescription>
                Get help from the EV community
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="question-title">Title *</Label>
                <Input
                  id="question-title"
                  placeholder="What's your question?"
                  value={newQuestion.title}
                  onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="question-body">Details *</Label>
                <Textarea
                  id="question-body"
                  placeholder="Provide more context and details..."
                  value={newQuestion.body}
                  onChange={(e) => setNewQuestion({ ...newQuestion, body: e.target.value })}
                  rows={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="question-tags">Tags (comma-separated)</Label>
                <Input
                  id="question-tags"
                  placeholder="e.g., battery, charging, maintenance"
                  value={newQuestion.tags}
                  onChange={(e) => setNewQuestion({ ...newQuestion, tags: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateQuestion}
                disabled={!newQuestion.title || !newQuestion.body}
              >
                Post Question
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
