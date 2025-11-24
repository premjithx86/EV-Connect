import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Plus, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Flag, LogOut } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export default function Communities() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCommunity, setNewCommunity] = useState({
    name: "",
    slug: "",
    type: "GENERAL",
    description: "",
  });

  const { data: communities, isLoading } = useQuery<Community[]>({
    queryKey: ["/api/communities", { search: searchQuery, type: selectedType !== "all" ? selectedType : undefined }],
    queryFn: async ({ queryKey }) => {
      const [url, params] = queryKey as [string, { search?: string; type?: string }];
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append("search", params.search);
      if (params.type) queryParams.append("type", params.type);
      const queryString = queryParams.toString();
      const requestUrl = queryString ? `${url}?${queryString}` : url;
      const res = await fetch(requestUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch communities");
      return res.json();
    },
  });

  const createCommunityMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("[CLIENT] Creating community with data:", data);
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.error("[CLIENT] Create community error:", errorData);
        throw new Error(errorData.message || errorData.error || "Failed to create community");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
      setIsCreateDialogOpen(false);
      setNewCommunity({ name: "", slug: "", type: "GENERAL", description: "" });
      toast({ title: "Community created successfully!" });
    },
    onError: (error: Error) => {
      console.error("[CLIENT] Mutation error:", error);
      toast({ 
        title: "Failed to create community", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const joinCommunityMutation = useMutation({
    mutationFn: async (communityId: string) => {
      const res = await fetch(`/api/communities/${communityId}/join`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to join community");
      return res.json();
    },
    onMutate: async (communityId: string) => {
      await queryClient.cancelQueries({ queryKey: ["/api/communities"] });
      const previous = queryClient.getQueryData<Community[]>(["/api/communities", { search: searchQuery, type: selectedType !== "all" ? selectedType : undefined }]);
      if (previous) {
        queryClient.setQueryData<Community[]>(["/api/communities", { search: searchQuery, type: selectedType !== "all" ? selectedType : undefined }],
          previous.map((community) =>
            community.id === communityId
              ? community.isMember
                ? community
                : { ...community, isMember: true, membersCount: community.membersCount + 1 }
              : community
          )
        );
      }
      return { previous };
    },
    onError: (_error, communityId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/communities", { search: searchQuery, type: selectedType !== "all" ? selectedType : undefined }], context.previous);
      }
      toast({ title: "Failed to join community", variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Joined community successfully!" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
    },
  });

  const leaveCommunityMutation = useMutation({
    mutationFn: async (communityId: string) => {
      const res = await fetch(`/api/communities/${communityId}/leave`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to leave community");
      return res.json();
    },
    onMutate: async (communityId: string) => {
      await queryClient.cancelQueries({ queryKey: ["/api/communities"] });
      const previous = queryClient.getQueryData<Community[]>(["/api/communities", { search: searchQuery, type: selectedType !== "all" ? selectedType : undefined }]);
      if (previous) {
        queryClient.setQueryData<Community[]>(["/api/communities", { search: searchQuery, type: selectedType !== "all" ? selectedType : undefined }],
          previous.map((community) =>
            community.id === communityId
              ? !community.isMember
                ? community
                : { ...community, isMember: false, membersCount: Math.max(0, community.membersCount - 1) }
              : community
          )
        );
      }
      return { previous };
    },
    onError: (_error, _communityId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/communities", { search: searchQuery, type: selectedType !== "all" ? selectedType : undefined }], context.previous);
      }
      toast({ title: "Failed to leave community", variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Left community successfully!" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
    },
  });

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportCommunityId, setReportCommunityId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");

  const reportMutation = useMutation({
    mutationFn: async ({ communityId, reason }: { communityId: string; reason: string }) => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetType: "COMMUNITY",
          targetId: communityId,
          reason,
        }),
      });
      if (!res.ok) throw new Error("Failed to report community");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Report submitted to the admins" });
      setReportDialogOpen(false);
      setReportCommunityId(null);
      setReportReason("");
    },
    onError: () => {
      toast({ title: "Failed to submit report", variant: "destructive" });
    },
  });

  const handleCreateCommunity = () => {
    if (!newCommunity.name || !newCommunity.slug) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    // Add createdBy field
    const communityData = {
      ...newCommunity,
      createdBy: user!.id,
      moderators: [user!.id],
    };
    createCommunityMutation.mutate(communityData);
  };

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
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold font-display mb-2">Communities</h1>
              <p className="text-muted-foreground">Connect with EV enthusiasts around the world</p>
            </div>
            {user && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Community
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Community</DialogTitle>
                    <DialogDescription>Start a new community for EV enthusiasts</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Community Name</Label>
                      <Input
                        id="name"
                        value={newCommunity.name}
                        onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                        placeholder="Tesla Owners Club"
                      />
                    </div>
                    <div>
                      <Label htmlFor="slug">Slug (URL)</Label>
                      <Input
                        id="slug"
                        value={newCommunity.slug}
                        onChange={(e) => setNewCommunity({ ...newCommunity, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                        placeholder="tesla-owners-club"
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select value={newCommunity.type} onValueChange={(value) => setNewCommunity({ ...newCommunity, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GENERAL">General</SelectItem>
                          <SelectItem value="BRAND">Brand-Specific</SelectItem>
                          <SelectItem value="REGIONAL">Regional</SelectItem>
                          <SelectItem value="INTEREST">Special Interest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newCommunity.description}
                        onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                        placeholder="Describe your community..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateCommunity} disabled={createCommunityMutation.isPending}>
                      {createCommunityMutation.isPending ? "Creating..." : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search communities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="GENERAL">General</SelectItem>
                <SelectItem value="BRAND">Brand-Specific</SelectItem>
                <SelectItem value="REGIONAL">Regional</SelectItem>
                <SelectItem value="INTEREST">Special Interest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Communities Grid */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Communities</TabsTrigger>
            <TabsTrigger value="trending">
              <TrendingUp className="h-4 w-4 mr-2" />
              Trending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="h-32 bg-muted" />
                    <CardContent className="p-6">
                      <div className="h-4 bg-muted rounded mb-2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : communities && communities.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {communities.map((community) => (
                  <Card key={community.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="relative">
                      {community.coverImageUrl ? (
                        <img src={community.coverImageUrl} alt={community.name} className="w-full h-32 object-cover rounded-t-lg" />
                      ) : (
                        <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-lg flex items-center justify-center">
                          <Users className="h-12 w-12 text-primary/40" />
                        </div>
                      )}
                      <Badge className={`absolute top-4 right-4 ${getCommunityTypeColor(community.type)}`}>
                        {community.type}
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-6">
                      <CardTitle className="mb-2">{community.name}</CardTitle>
                      <CardDescription className="mb-4 line-clamp-2">
                        {community.description || "Join this community to connect with other members"}
                      </CardDescription>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="h-4 w-4 mr-1" />
                          {community.membersCount} members
                        </div>
                        <div className="flex gap-2">
                          {community.isMember ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (community.isMember) {
                                  leaveCommunityMutation.mutate(community.id);
                                }
                              }}
                              disabled={!user || leaveCommunityMutation.isPending}
                            >
                              <LogOut className="h-4 w-4 mr-1" />
                              Exit
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!community.isMember) {
                                  joinCommunityMutation.mutate(community.id);
                                }
                              }}
                              disabled={!user || joinCommunityMutation.isPending}
                            >
                              Join
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setLocation(`/communities/${community.slug}`)}
                          >
                            View
                          </Button>
                          {user && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReportCommunityId(community.id);
                                setReportDialogOpen(true);
                              }}
                              disabled={reportMutation.isPending}
                              className="gap-1"
                            >
                              <Flag className="h-3 w-3" />
                              Report
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No communities found</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="trending" className="mt-6">
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="h-32 bg-muted" />
                    <CardContent className="p-6">
                      <div className="h-4 bg-muted rounded mb-2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : communities && communities.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {communities
                  .sort((a, b) => b.membersCount - a.membersCount)
                  .slice(0, 9)
                  .map((community) => (
                    <Card key={community.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="relative">
                        {community.coverImageUrl ? (
                          <img src={community.coverImageUrl} alt={community.name} className="w-full h-32 object-cover rounded-t-lg" />
                        ) : (
                          <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-lg flex items-center justify-center">
                            <Users className="h-12 w-12 text-primary/40" />
                          </div>
                        )}
                        <Badge className={`absolute top-4 right-4 ${getCommunityTypeColor(community.type)}`}>
                          {community.type}
                        </Badge>
                      </CardHeader>
                      <CardContent className="p-6">
                        <CardTitle className="mb-2">{community.name}</CardTitle>
                        <CardDescription className="mb-4 line-clamp-2">
                          {community.description || "Join this community to connect with other members"}
                        </CardDescription>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="h-4 w-4 mr-1" />
                            {community.membersCount} members
                          </div>
                          <div className="flex gap-2">
                            {community.isMember ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (community.isMember) {
                                    leaveCommunityMutation.mutate(community.id);
                                  }
                                }}
                                disabled={!user || leaveCommunityMutation.isPending}
                              >
                                <LogOut className="h-4 w-4 mr-1" />
                                Exit
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!community.isMember) {
                                    joinCommunityMutation.mutate(community.id);
                                  }
                                }}
                                disabled={!user || joinCommunityMutation.isPending}
                              >
                                Join
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setLocation(`/communities/${community.slug}`)}
                            >
                              View
                            </Button>
                            {user && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReportCommunityId(community.id);
                                  setReportDialogOpen(true);
                                }}
                                disabled={reportMutation.isPending}
                                className="gap-1"
                              >
                                <Flag className="h-3 w-3" />
                                Report
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No communities found</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Dialog open={reportDialogOpen} onOpenChange={(open) => {
        setReportDialogOpen(open);
        if (!open) {
          setReportCommunityId(null);
          setReportReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Community</DialogTitle>
            <DialogDescription>
              Let the admins know about any issues with this community.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Describe the issue..."
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReportDialogOpen(false);
                setReportCommunityId(null);
                setReportReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!reportCommunityId) return;
                reportMutation.mutate({ communityId: reportCommunityId, reason: reportReason });
              }}
              disabled={!reportReason.trim() || reportMutation.isPending || !reportCommunityId}
            >
              {reportMutation.isPending ? "Reporting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
