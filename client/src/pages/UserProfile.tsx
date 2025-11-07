import { UserProfileCard } from "@/components/UserProfileCard";
import { PostCard } from "@/components/PostCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Bookmark } from "lucide-react";
import avatarWoman from "@assets/generated_images/User_avatar_woman_bdd37206.png";
import teslaImage from "@assets/generated_images/Tesla_Model_3_post_19f1f84d.png";

export default function UserProfile() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <UserProfileCard
            avatar={avatarWoman}
            name="Sarah Chen"
            bio="EV enthusiast and sustainability advocate. Love sharing my experiences with the Tesla community!"
            location="San Francisco, CA"
            vehicle={{
              brand: "Tesla",
              model: "Model 3",
              year: 2023,
            }}
            stats={{
              posts: 142,
              communities: 8,
            }}
            isOwnProfile={true}
          />

          <Tabs defaultValue="posts" className="w-full">
            <TabsList>
              <TabsTrigger value="posts" className="gap-2" data-testid="tab-posts">
                <FileText className="h-4 w-4" />
                Posts
              </TabsTrigger>
              <TabsTrigger value="bookmarks" className="gap-2" data-testid="tab-bookmarks">
                <Bookmark className="h-4 w-4" />
                Bookmarks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="space-y-6 mt-6">
              <PostCard
                id="1"
                author={{
                  name: "Sarah Chen",
                  avatar: avatarWoman,
                }}
                timestamp="2h ago"
                community="Tesla Owners"
                text="Just completed my first long road trip with the Model 3! The Supercharger network made it incredibly easy. Averaged 250 Wh/mi on the highway."
                media={[teslaImage]}
                likes={42}
                comments={8}
              />
            </TabsContent>

            <TabsContent value="bookmarks" className="mt-6">
              <div className="text-center py-12 text-muted-foreground">
                Your bookmarked posts and stations will appear here
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
