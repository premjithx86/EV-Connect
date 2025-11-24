import { HeroSection } from "@/components/HeroSection";
import { PostCard } from "@/components/PostCard";
import { PostComposer } from "@/components/PostComposer";
import { CommunityCard } from "@/components/CommunityCard";
import { ArticleCard } from "@/components/ArticleCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TrendingUp, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Post {
  id: string;
  title?: string;
  text: string;
  media?: Array<{ type: string; url: string }>;
  communityId?: string;
  community?: string;
  authorId: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  likes: string[];
  commentsCount: number;
  createdAt: string;
}

interface Community {
  id: string;
  name: string;
  type: string;
  description: string;
  membersCount: number;
  coverImageUrl?: string;
}

interface Article {
  id: string;
  title: string;
  summary: string;
  kind: string;
  coverImageUrl?: string;
  authorId: string;
  publishedAt: string;
  tags: string[];
}

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: posts, isLoading: postsLoading, refetch: refetchPosts } = useQuery<Post[]>({
    queryKey: ["/api/posts", { limit: 10 }],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(`${queryKey[0]}?limit=10`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
  });

  const { data: communities, isLoading: communitiesLoading } = useQuery<Community[]>({
    queryKey: ["/api/communities", { limit: 5 }],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(`${queryKey[0]}?limit=5`);
      if (!res.ok) throw new Error("Failed to fetch communities");
      return res.json();
    },
  });

  const { data: articles, isLoading: articlesLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles", { limit: 3 }],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(`${queryKey[0]}?limit=3`);
      if (!res.ok) throw new Error("Failed to fetch articles");
      return res.json();
    },
  });

  const handlePostCreated = () => {
    refetchPosts();
    toast({ title: "Post created successfully!" });
  };

  return (
    <div className="min-h-screen">
      <HeroSection />

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {user && (
              <PostComposer
                userAvatar={user.email || undefined}
                userName={user.email || "User"}
                onPostCreated={handlePostCreated}
              />
            )}

            <Tabs defaultValue="trending" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="trending" className="gap-2" data-testid="tab-trending">
                  <TrendingUp className="h-4 w-4" />
                  Trending
                </TabsTrigger>
                <TabsTrigger value="recent" className="gap-2" data-testid="tab-recent">
                  <Clock className="h-4 w-4" />
                  Recent
                </TabsTrigger>
              </TabsList>

              <TabsContent value="trending" className="space-y-6 mt-6">
                {postsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-muted rounded-lg h-48" />
                    ))}
                  </div>
                ) : posts && posts.length > 0 ? (
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      id={post.id}
                      author={{
                        id: post.authorId,
                        name: post.author.displayName || post.authorId,
                        avatar: post.author.avatarUrl,
                      }}
                      timestamp={new Date(post.createdAt).toLocaleString()}
                      community={post.community}
                      text={post.text}
                      media={post.media?.map(m => m.url)}
                      likes={post.likes.length}
                      comments={post.commentsCount}
                      isLiked={user ? post.likes.includes(user.id) : false}
                      onRefresh={refetchPosts}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recent" className="space-y-6 mt-6">
                {postsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-muted rounded-lg h-48" />
                    ))}
                  </div>
                ) : posts && posts.length > 0 ? (
                  posts
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((post) => (
                      <PostCard
                        key={post.id}
                        id={post.id}
                        author={{
                          id: post.authorId,
                          name: post.author.displayName || post.authorId,
                          avatar: post.author.avatarUrl,
                        }}
                        timestamp={new Date(post.createdAt).toLocaleString()}
                        community={post.community}
                        text={post.text}
                        media={post.media?.map(m => m.url)}
                        likes={post.likes.length}
                        comments={post.commentsCount}
                        isLiked={user ? post.likes.includes(user.id) : false}
                        onRefresh={refetchPosts}
                      />
                    ))
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-xl">Featured Communities</h2>
                <Button variant="ghost" size="sm" data-testid="button-view-all-communities" onClick={() => setLocation("/communities")}>View all</Button>
              </div>
              <div className="space-y-4">
                {communitiesLoading ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-muted rounded-lg h-24" />
                    ))}
                  </div>
                ) : communities && communities.length > 0 ? (
                  communities.map((community) => (
                    <CommunityCard
                      key={community.id}
                      id={community.id}
                      name={community.name}
                      type={community.type as any}
                      coverImage={community.coverImageUrl}
                      description={community.description}
                      membersCount={community.membersCount}
                    />
                  ))
                ) : (
                  <p className="text-muted-foreground">No communities available</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-xl">Latest Articles</h2>
                <Button variant="ghost" size="sm" data-testid="button-view-all-articles" onClick={() => setLocation("/articles")}>View all</Button>
              </div>
              <div className="space-y-4">
                {articlesLoading ? (
                  <div className="space-y-4">
                    {[...Array(1)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-muted rounded-lg h-32" />
                    ))}
                  </div>
                ) : articles && articles.length > 0 ? (
                  articles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      id={article.id}
                      kind={article.kind as any}
                      title={article.title}
                      summary={article.summary}
                      coverImage={article.coverImageUrl}
                      author={article.authorId}
                      publishedAt={new Date(article.publishedAt).toLocaleDateString()}
                      tags={article.tags}
                    />
                  ))
                ) : (
                  <p className="text-muted-foreground">No articles available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
