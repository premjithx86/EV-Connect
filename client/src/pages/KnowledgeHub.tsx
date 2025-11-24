import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, BookOpen, Lightbulb, Zap, Battery, Car, MapPin, Plus, FolderPlus, Trash2 } from "lucide-react";

interface Article {
  id: string;
  kind: string;
  title: string;
  summary: string;
  body: string;
  coverImageUrl?: string;
  tags?: string[];
  authorId: string;
  publishedAt: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  createdBy: string;
  createdAt: string;
}

const iconMap: Record<string, any> = {
  Car,
  Zap,
  Battery,
  MapPin,
  Lightbulb,
  BookOpen,
};

const defaultCategories = [
  { id: "basics", name: "EV Basics", icon: "Car", description: "Learn the fundamentals of electric vehicles", color: "text-blue-500" },
  { id: "charging", name: "Charging Guide", icon: "Zap", description: "Everything about charging your EV", color: "text-yellow-500" },
  { id: "battery", name: "Battery Care", icon: "Battery", description: "Maximize your battery life and performance", color: "text-green-500" },
  { id: "maintenance", name: "Maintenance", icon: "Car", description: "Keep your EV in top condition", color: "text-purple-500" },
  { id: "travel", name: "Travel Tips", icon: "MapPin", description: "Plan your EV road trips", color: "text-red-500" },
  { id: "technology", name: "Technology", icon: "Lightbulb", description: "Latest EV tech and innovations", color: "text-orange-500" },
];

export default function KnowledgeHub() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [createGuideOpen, setCreateGuideOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [newGuide, setNewGuide] = useState({
    title: "",
    summary: "",
    body: "",
    category: "",
    coverImageUrl: "",
  });
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    icon: "BookOpen",
    color: "text-blue-500",
  });

  const { data: guides, isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles", { kind: "GUIDE", limit: 50 }],
    queryFn: async ({ queryKey }) => {
      const [url, params] = queryKey as [string, { kind: string; limit: number }];
      const queryParams = new URLSearchParams();
      queryParams.append("kind", params.kind);
      queryParams.append("limit", params.limit.toString());
      const res = await fetch(`${url}?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch guides");
      return res.json();
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/knowledge-categories"],
    queryFn: async () => {
      const res = await fetch("/api/knowledge-categories");
      if (!res.ok) return defaultCategories.map((c, i) => ({ ...c, id: c.id, createdBy: "system", createdAt: new Date().toISOString() }));
      return res.json();
    },
  });

  const createGuideMutation = useMutation({
    mutationFn: async (guideData: any) => {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(guideData),
      });
      if (!res.ok) throw new Error("Failed to create guide");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({ title: "Guide created successfully!" });
      setCreateGuideOpen(false);
      setNewGuide({ title: "", summary: "", body: "", category: "", coverImageUrl: "" });
      setLocation(`/articles/${data.id}`);
    },
    onError: () => {
      toast({ title: "Failed to create guide", variant: "destructive" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: any) => {
      const res = await fetch("/api/knowledge-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(categoryData),
      });
      if (!res.ok) throw new Error("Failed to create category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-categories"] });
      toast({ title: "Category created successfully!" });
      setCreateCategoryOpen(false);
      setNewCategory({ name: "", description: "", icon: "BookOpen", color: "text-blue-500" });
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const res = await fetch(`/api/knowledge-categories/${categoryId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-categories"] });
      toast({ title: "Category deleted successfully" });
      if (selectedCategory) setSelectedCategory(null);
    },
    onError: () => {
      toast({ title: "Failed to delete category", variant: "destructive" });
    },
  });

  const handleCreateGuide = () => {
    const guideData = {
      title: newGuide.title,
      summary: newGuide.summary,
      body: newGuide.body,
      kind: "GUIDE",
      tags: newGuide.category ? [newGuide.category] : [],
      coverImageUrl: newGuide.coverImageUrl || undefined,
    };
    createGuideMutation.mutate(guideData);
  };

  const handleCreateCategory = () => {
    createCategoryMutation.mutate(newCategory);
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  const filteredGuides = guides?.filter((guide) => {
    const matchesSearch = guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || guide.tags?.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-start justify-between">
            <div className="text-center flex-1">
              <div className="flex items-center justify-center mb-4">
                <BookOpen className="h-12 w-12 text-primary" />
              </div>
              <h1 className="text-4xl font-bold font-display mb-3">Knowledge Hub</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Your comprehensive resource for everything about electric vehicles
              </p>
            </div>
            {user && (
              <div className="flex gap-2">
                <Button onClick={() => setCreateGuideOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Guide
                </Button>
                <Button variant="outline" onClick={() => setCreateCategoryOpen(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Category
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search guides and tutorials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-lg"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => {
              const Icon = iconMap[category.icon] || BookOpen;
              const canDelete = user && (user.role === "ADMIN" || category.createdBy === user.id);
              return (
                <Card
                  key={category.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedCategory === category.id ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <CardHeader onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg bg-primary/10 ${category.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <CardTitle>{category.name}</CardTitle>
                      </div>
                      {canDelete && category.createdBy !== "system" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(category.id);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Guides */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {selectedCategory
                ? `${categories.find((c) => c.id === selectedCategory)?.name} Guides`
                : "All Guides"}
            </h2>
            {selectedCategory && (
              <Button variant="ghost" onClick={() => setSelectedCategory(null)}>
                Clear Filter
              </Button>
            )}
          </div>

          <Tabs defaultValue="popular" className="w-full">
            <TabsList>
              <TabsTrigger value="popular">Popular</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
            </TabsList>

            <TabsContent value="popular" className="mt-6">
              {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="h-48 bg-muted" />
                      <CardContent className="p-6">
                        <div className="h-4 bg-muted rounded mb-2" />
                        <div className="h-3 bg-muted rounded w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredGuides && filteredGuides.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGuides.map((guide) => (
                    <Card
                      key={guide.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setLocation(`/articles/${guide.id}`)}
                    >
                      {guide.coverImageUrl ? (
                        <img
                          src={guide.coverImageUrl}
                          alt={guide.title}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center rounded-t-lg">
                          <BookOpen className="h-16 w-16 text-primary/40" />
                        </div>
                      )}
                      <CardContent className="p-6">
                        <CardTitle className="mb-2 line-clamp-2">{guide.title}</CardTitle>
                        <CardDescription className="mb-4 line-clamp-2">
                          {guide.summary}
                        </CardDescription>
                        <div className="flex gap-2 flex-wrap">
                          {guide.tags?.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No guides found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="recent" className="mt-6">
              {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="h-48 bg-muted" />
                      <CardContent className="p-6">
                        <div className="h-4 bg-muted rounded mb-2" />
                        <div className="h-3 bg-muted rounded w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredGuides && filteredGuides.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGuides
                    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
                    .map((guide) => (
                      <Card
                        key={guide.id}
                        className="hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => setLocation(`/articles/${guide.id}`)}
                      >
                        {guide.coverImageUrl ? (
                          <img
                            src={guide.coverImageUrl}
                            alt={guide.title}
                            className="w-full h-48 object-cover rounded-t-lg"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center rounded-t-lg">
                            <BookOpen className="h-16 w-16 text-primary/40" />
                          </div>
                        )}
                        <CardContent className="p-6">
                          <CardTitle className="mb-2 line-clamp-2">{guide.title}</CardTitle>
                          <CardDescription className="mb-4 line-clamp-2">
                            {guide.summary}
                          </CardDescription>
                          <div className="flex gap-2 flex-wrap">
                            {guide.tags?.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No guides found</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Create Guide Dialog */}
        <Dialog open={createGuideOpen} onOpenChange={setCreateGuideOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Guide or Tutorial</DialogTitle>
              <DialogDescription>
                Share your knowledge with the EV community
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="guide-title">Title *</Label>
                <Input
                  id="guide-title"
                  placeholder="Enter guide title"
                  value={newGuide.title}
                  onChange={(e) => setNewGuide({ ...newGuide, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guide-category">Category *</Label>
                <Select value={newGuide.category} onValueChange={(value) => setNewGuide({ ...newGuide, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="guide-summary">Summary *</Label>
                <Textarea
                  id="guide-summary"
                  placeholder="Brief summary of the guide"
                  value={newGuide.summary}
                  onChange={(e) => setNewGuide({ ...newGuide, summary: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guide-body">Content *</Label>
                <Textarea
                  id="guide-body"
                  placeholder="Write your guide content here..."
                  value={newGuide.body}
                  onChange={(e) => setNewGuide({ ...newGuide, body: e.target.value })}
                  rows={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guide-cover">Cover Image URL (optional)</Label>
                <Input
                  id="guide-cover"
                  placeholder="https://example.com/image.jpg"
                  value={newGuide.coverImageUrl}
                  onChange={(e) => setNewGuide({ ...newGuide, coverImageUrl: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateGuideOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateGuide}
                disabled={!newGuide.title || !newGuide.summary || !newGuide.body || !newGuide.category || createGuideMutation.isPending}
              >
                {createGuideMutation.isPending ? "Creating..." : "Create Guide"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Category Dialog */}
        <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>
                Add a new category for organizing guides
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Category Name *</Label>
                <Input
                  id="cat-name"
                  placeholder="e.g., Solar Charging"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-desc">Description *</Label>
                <Textarea
                  id="cat-desc"
                  placeholder="Describe what this category is about"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-icon">Icon</Label>
                <Select value={newCategory.icon} onValueChange={(value) => setNewCategory({ ...newCategory, icon: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BookOpen">Book</SelectItem>
                    <SelectItem value="Car">Car</SelectItem>
                    <SelectItem value="Zap">Lightning</SelectItem>
                    <SelectItem value="Battery">Battery</SelectItem>
                    <SelectItem value="MapPin">Map Pin</SelectItem>
                    <SelectItem value="Lightbulb">Lightbulb</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-color">Color</Label>
                <Select value={newCategory.color} onValueChange={(value) => setNewCategory({ ...newCategory, color: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text-blue-500">Blue</SelectItem>
                    <SelectItem value="text-green-500">Green</SelectItem>
                    <SelectItem value="text-yellow-500">Yellow</SelectItem>
                    <SelectItem value="text-red-500">Red</SelectItem>
                    <SelectItem value="text-purple-500">Purple</SelectItem>
                    <SelectItem value="text-orange-500">Orange</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateCategoryOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateCategory}
                disabled={!newCategory.name || !newCategory.description || createCategoryMutation.isPending}
              >
                {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
