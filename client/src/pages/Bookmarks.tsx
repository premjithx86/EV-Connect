import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Bookmark, MapPin, ArrowRight } from "lucide-react";

interface BookmarkItem {
  id: string;
  userId: string;
  targetType: string;
  targetId: string;
  createdAt: string;
}

function BookmarkCard({ bookmark }: { bookmark: BookmarkItem }) {
  const isStation = bookmark.targetType === "STATION";

  const handleOpen = () => {
    if (isStation) {
      window.open(`https://openchargemap.org/site/poi/details/${bookmark.targetId}`, "_blank");
    } else {
      window.open(
        bookmark.targetType === "POST"
          ? `/posts/${bookmark.targetId}`
          : `/articles/${bookmark.targetId}`,
        "_blank"
      );
    }
  };

  return (
    <Card className="p-4 flex items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isStation ? <Zap className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          <span>{bookmark.targetType}</span>
        </div>
        <p className="font-medium text-sm break-all">{bookmark.targetId}</p>
        <p className="text-xs text-muted-foreground">
          Saved {formatDistanceToNow(new Date(bookmark.createdAt), { addSuffix: true })}
        </p>
      </div>
      <Button variant="outline" size="sm" className="gap-1" onClick={handleOpen}>
        {isStation ? <MapPin className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
        Open
      </Button>
    </Card>
  );
}

export default function Bookmarks() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  const {
    data: bookmarks,
    isLoading: bookmarksLoading,
    error,
  } = useQuery<BookmarkItem[]>({
    queryKey: ["bookmarks"],
    queryFn: async () => {
      const res = await fetch("/api/bookmarks", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load bookmarks");
      return res.json();
    },
    enabled: !!user,
  });

  const stationBookmarks = useMemo(
    () => (bookmarks || []).filter((bookmark) => bookmark.targetType === "STATION"),
    [bookmarks]
  );
  const postBookmarks = useMemo(
    () => (bookmarks || []).filter((bookmark) => bookmark.targetType === "POST"),
    [bookmarks]
  );
  const articleBookmarks = useMemo(
    () => (bookmarks || []).filter((bookmark) => bookmark.targetType === "ARTICLE"),
    [bookmarks]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-40 w-80" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center space-y-4">
          <h2 className="text-xl font-semibold">Log in to view your bookmarks</h2>
          <Button onClick={() => navigate("/login")}>Go to login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">My Bookmarks</h1>
          <p className="text-sm text-muted-foreground">
            Quick access to your saved charging stations, posts, and articles.
          </p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="stations">Stations</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="articles">Articles</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6 space-y-4">
            {bookmarksLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, idx) => (
                  <Skeleton key={idx} className="h-20 w-full" />
                ))}
              </div>
            ) : error ? (
              <Card className="p-6 text-center text-destructive">
                Failed to load bookmarks. Please try again later.
              </Card>
            ) : bookmarks && bookmarks.length > 0 ? (
              bookmarks.map((bookmark) => <BookmarkCard key={bookmark.id} bookmark={bookmark} />)
            ) : (
              <Card className="p-6 text-center text-muted-foreground">
                You haven't saved anything yet.
              </Card>
            )}
          </TabsContent>

          <TabsContent value="stations" className="mt-6 space-y-4">
            {stationBookmarks.length > 0 ? (
              stationBookmarks.map((bookmark) => <BookmarkCard key={bookmark.id} bookmark={bookmark} />)
            ) : (
              <Card className="p-6 text-center text-muted-foreground">
                No stations bookmarked yet.
              </Card>
            )}
          </TabsContent>

          <TabsContent value="posts" className="mt-6 space-y-4">
            {postBookmarks.length > 0 ? (
              postBookmarks.map((bookmark) => <BookmarkCard key={bookmark.id} bookmark={bookmark} />)
            ) : (
              <Card className="p-6 text-center text-muted-foreground">
                No posts bookmarked yet.
              </Card>
            )}
          </TabsContent>

          <TabsContent value="articles" className="mt-6 space-y-4">
            {articleBookmarks.length > 0 ? (
              articleBookmarks.map((bookmark) => <BookmarkCard key={bookmark.id} bookmark={bookmark} />)
            ) : (
              <Card className="p-6 text-center text-muted-foreground">
                No articles bookmarked yet.
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
