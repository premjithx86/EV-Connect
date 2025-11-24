import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Newspaper, TrendingUp, Clock, Tag, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

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

export default function Articles() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKind, setSelectedKind] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newArticle, setNewArticle] = useState({
    title: "",
    summary: "",
    body: "",
    kind: "NEWS",
    tags: "",
    coverImageUrl: "",
  });

  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles", { kind: selectedKind !== "all" ? selectedKind : undefined, limit: 50 }],
    queryFn: async ({ queryKey }) => {
      const [url, params] = queryKey as [string, { kind?: string; limit: number }];
      const queryParams = new URLSearchParams();
      if (params.kind) queryParams.append("kind", params.kind);
      queryParams.append("limit", params.limit.toString());
      const res = await fetch(`${url}?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch articles");
      return res.json();
    },
  });

  const filteredArticles = articles?.filter((article) => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === "all" || article.tags?.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const allTags = Array.from(new Set(articles?.flatMap((a) => a.tags || []) || []));

  const createArticleMutation = useMutation({
    mutationFn: async (articleData: any) => {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(articleData),
      });
      if (!res.ok) throw new Error("Failed to create article");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({ title: "Article created successfully!" });
      setCreateDialogOpen(false);
      setNewArticle({ title: "", summary: "", body: "", kind: "NEWS", tags: "", coverImageUrl: "" });
      setLocation(`/articles/${data.id}`);
    },
    onError: () => {
      toast({ title: "Failed to create article", variant: "destructive" });
    },
  });

  const handleCreateArticle = () => {
    const articleData = {
      ...newArticle,
      tags: newArticle.tags.split(",").map(t => t.trim()).filter(t => t),
      coverImageUrl: newArticle.coverImageUrl || undefined,
    };
    createArticleMutation.mutate(articleData);
  };

  const getKindColor = (kind: string) => {
    const colors: Record<string, string> = {
      NEWS: "bg-blue-500",
      GUIDE: "bg-green-500",
      REVIEW: "bg-purple-500",
      OPINION: "bg-orange-500",
    };
    return colors[kind] || "bg-gray-500";
  };

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case "NEWS":
        return <Newspaper className="h-4 w-4" />;
      case "GUIDE":
        return <Tag className="h-4 w-4" />;
      default:
        return <Newspaper className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold font-display mb-2">Articles & News</h1>
            <p className="text-muted-foreground">Stay updated with the latest EV news, guides, and reviews</p>
          </div>
          {user && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Article
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedKind} onValueChange={setSelectedKind}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="NEWS">News</SelectItem>
                <SelectItem value="GUIDE">Guides</SelectItem>
                <SelectItem value="REVIEW">Reviews</SelectItem>
                <SelectItem value="OPINION">Opinion</SelectItem>
              </SelectContent>
            </Select>
            {allTags.length > 0 && (
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Articles Tabs */}
        <Tabs defaultValue="latest" className="w-full">
          <TabsList>
            <TabsTrigger value="latest">
              <Clock className="h-4 w-4 mr-2" />
              Latest
            </TabsTrigger>
            <TabsTrigger value="trending">
              <TrendingUp className="h-4 w-4 mr-2" />
              Trending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="latest" className="mt-6">
            {isLoading ? (
              <div className="space-y-6">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="md:flex">
                      <div className="md:w-1/3 h-48 bg-muted" />
                      <CardContent className="md:w-2/3 p-6">
                        <div className="h-6 bg-muted rounded mb-3" />
                        <div className="h-4 bg-muted rounded mb-2" />
                        <div className="h-4 bg-muted rounded w-3/4" />
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredArticles && filteredArticles.length > 0 ? (
              <div className="space-y-6">
                {filteredArticles
                  .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
                  .map((article) => (
                    <Card
                      key={article.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setLocation(`/articles/${article.id}`)}
                    >
                      <div className="md:flex">
                        {article.coverImageUrl ? (
                          <div className="md:w-1/3">
                            <img
                              src={article.coverImageUrl}
                              alt={article.title}
                              className="w-full h-48 md:h-full object-cover rounded-t-lg md:rounded-l-lg md:rounded-tr-none"
                            />
                          </div>
                        ) : (
                          <div className="md:w-1/3 h-48 md:h-auto bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center rounded-t-lg md:rounded-l-lg md:rounded-tr-none">
                            <Newspaper className="h-16 w-16 text-primary/40" />
                          </div>
                        )}
                        <CardContent className="md:w-2/3 p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className={getKindColor(article.kind)}>
                              <span className="flex items-center gap-1">
                                {getKindIcon(article.kind)}
                                {article.kind}
                              </span>
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(article.publishedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <CardTitle className="mb-2 text-2xl">{article.title}</CardTitle>
                          <CardDescription className="mb-4 line-clamp-2 text-base">
                            {article.summary}
                          </CardDescription>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2 flex-wrap">
                              {article.tags?.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{article.likes?.length || 0} likes</span>
                              <span>{article.commentsCount} comments</span>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No articles found</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="trending" className="mt-6">
            {isLoading ? (
              <div className="space-y-6">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="md:flex">
                      <div className="md:w-1/3 h-48 bg-muted" />
                      <CardContent className="md:w-2/3 p-6">
                        <div className="h-6 bg-muted rounded mb-3" />
                        <div className="h-4 bg-muted rounded mb-2" />
                        <div className="h-4 bg-muted rounded w-3/4" />
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredArticles && filteredArticles.length > 0 ? (
              <div className="space-y-6">
                {filteredArticles
                  .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
                  .map((article) => (
                    <Card
                      key={article.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setLocation(`/articles/${article.id}`)}
                    >
                      <div className="md:flex">
                        {article.coverImageUrl ? (
                          <div className="md:w-1/3">
                            <img
                              src={article.coverImageUrl}
                              alt={article.title}
                              className="w-full h-48 md:h-full object-cover rounded-t-lg md:rounded-l-lg md:rounded-tr-none"
                            />
                          </div>
                        ) : (
                          <div className="md:w-1/3 h-48 md:h-auto bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center rounded-t-lg md:rounded-l-lg md:rounded-tr-none">
                            <Newspaper className="h-16 w-16 text-primary/40" />
                          </div>
                        )}
                        <CardContent className="md:w-2/3 p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className={getKindColor(article.kind)}>
                              <span className="flex items-center gap-1">
                                {getKindIcon(article.kind)}
                                {article.kind}
                              </span>
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(article.publishedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <CardTitle className="mb-2 text-2xl">{article.title}</CardTitle>
                          <CardDescription className="mb-4 line-clamp-2 text-base">
                            {article.summary}
                          </CardDescription>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2 flex-wrap">
                              {article.tags?.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{article.likes?.length || 0} likes</span>
                              <span>{article.commentsCount} comments</span>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No articles found</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Article Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Article</DialogTitle>
              <DialogDescription>
                Share news, guides, reviews, or opinions with the EV community
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter article title"
                  value={newArticle.title}
                  onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kind">Type *</Label>
                <Select value={newArticle.kind} onValueChange={(value) => setNewArticle({ ...newArticle, kind: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEWS">News</SelectItem>
                    <SelectItem value="GUIDE">Guide</SelectItem>
                    <SelectItem value="REVIEW">Review</SelectItem>
                    <SelectItem value="OPINION">Opinion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary">Summary *</Label>
                <Textarea
                  id="summary"
                  placeholder="Brief summary of the article"
                  value={newArticle.summary}
                  onChange={(e) => setNewArticle({ ...newArticle, summary: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Content *</Label>
                <Textarea
                  id="body"
                  placeholder="Write your article content here..."
                  value={newArticle.body}
                  onChange={(e) => setNewArticle({ ...newArticle, body: e.target.value })}
                  rows={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverImage">Cover Image URL (optional)</Label>
                <Input
                  id="coverImage"
                  placeholder="https://example.com/image.jpg"
                  value={newArticle.coverImageUrl}
                  onChange={(e) => setNewArticle({ ...newArticle, coverImageUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="EV, charging, technology"
                  value={newArticle.tags}
                  onChange={(e) => setNewArticle({ ...newArticle, tags: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateArticle}
                disabled={!newArticle.title || !newArticle.summary || !newArticle.body || createArticleMutation.isPending}
              >
                {createArticleMutation.isPending ? "Creating..." : "Create Article"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
