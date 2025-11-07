import { HeroSection } from "@/components/HeroSection";
import { PostCard } from "@/components/PostCard";
import { PostComposer } from "@/components/PostComposer";
import { CommunityCard } from "@/components/CommunityCard";
import { ArticleCard } from "@/components/ArticleCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TrendingUp, Clock } from "lucide-react";
import avatarWoman from "@assets/generated_images/User_avatar_woman_bdd37206.png";
import avatarMan from "@assets/generated_images/User_avatar_man_9666579e.png";
import teslaImage from "@assets/generated_images/Tesla_Model_3_post_19f1f84d.png";
import communityImage from "@assets/generated_images/EV_community_meetup_1339d9c4.png";
import chargingImage from "@assets/generated_images/Charging_connector_closeup_2fe4a9b5.png";

export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSection />

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <PostComposer
              userAvatar={avatarMan}
              userName="Alex Rivera"
            />

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
                <PostCard
                  id="1"
                  author={{
                    name: "Sarah Chen",
                    avatar: avatarWoman,
                  }}
                  timestamp="2h ago"
                  community="Tesla Owners"
                  text="Just completed my first long road trip with the Model 3! The Supercharger network made it incredibly easy. Averaged 250 Wh/mi on the highway. Can't believe I was worried about range anxiety!"
                  media={[teslaImage]}
                  likes={42}
                  comments={8}
                />

                <PostCard
                  id="2"
                  author={{
                    name: "Mike Johnson",
                    avatar: avatarMan,
                  }}
                  timestamp="5h ago"
                  text="PSA: Winter is here! Remember to precondition your battery before charging in cold weather. It makes a huge difference in charging speed and battery health. Stay warm out there!"
                  likes={28}
                  comments={12}
                />

                <PostCard
                  id="3"
                  author={{
                    name: "Emily Park",
                    avatar: avatarWoman,
                  }}
                  timestamp="1d ago"
                  community="EV Tips"
                  text="Found an amazing hidden gem charging station with a café nearby. Perfect spot to relax while charging. Location in comments!"
                  likes={56}
                  comments={23}
                />
              </TabsContent>

              <TabsContent value="recent" className="space-y-6 mt-6">
                <PostCard
                  id="4"
                  author={{
                    name: "Alex Rivera",
                    avatar: avatarMan,
                  }}
                  timestamp="15m ago"
                  text="Question: What's your favorite EV charging app? Looking for something with real-time availability."
                  likes={5}
                  comments={3}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-xl">Featured Communities</h2>
                <Button variant="ghost" size="sm" data-testid="button-view-all-communities">View all</Button>
              </div>
              <div className="space-y-4">
                <CommunityCard
                  id="1"
                  name="Tesla Owners"
                  type="BRAND"
                  coverImage={communityImage}
                  description="A community for Tesla owners to share experiences and tips."
                  memberCount={15420}
                />
                <CommunityCard
                  id="2"
                  name="California EV Club"
                  type="REGION"
                  description="Connect with EV enthusiasts in California."
                  memberCount={8234}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-xl">Latest Articles</h2>
                <Button variant="ghost" size="sm" data-testid="button-view-all-articles">View all</Button>
              </div>
              <div className="space-y-4">
                <ArticleCard
                  id="1"
                  kind="TIP"
                  title="5 Tips to Maximize Your EV Range"
                  summary="Learn proven strategies to extend your electric vehicle's range."
                  coverImage={chargingImage}
                  author="EV Connect Team"
                  publishedAt="Dec 15, 2024"
                  tags={["range", "efficiency"]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
