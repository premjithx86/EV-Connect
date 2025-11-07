import { QuestionCard } from "@/components/QuestionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, TrendingUp, Clock, CheckCircle } from "lucide-react";

export default function QAForum() {
  const popularTags = ["battery", "charging", "maintenance", "range", "winter", "software"];

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
            <Button className="gap-2" data-testid="button-ask-question">
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
                <QuestionCard
                  id="1"
                  title="Best practices for battery health in cold weather?"
                  body="I live in Minnesota and winter is approaching. What are the best practices to maintain battery health during freezing temperatures? Should I precondition before every drive?"
                  tags={["battery", "winter", "maintenance"]}
                  author="Mike Johnson"
                  timestamp="3h ago"
                  upvotes={24}
                  answers={7}
                  isSolved={true}
                />

                <QuestionCard
                  id="2"
                  title="Charging to 80% vs 100% - does it really matter?"
                  body="I've heard conflicting advice about charging limits. Some say always charge to 80%, others say 100% is fine for road trips. What's the science behind this?"
                  tags={["charging", "battery", "longevity"]}
                  author="Sarah Chen"
                  timestamp="5h ago"
                  upvotes={18}
                  answers={12}
                />

                <QuestionCard
                  id="3"
                  title="Best route planning apps for long trips?"
                  body="Planning my first cross-country trip in my EV. What apps do you recommend for route planning that includes charging stops?"
                  tags={["road-trip", "apps", "planning"]}
                  author="David Lee"
                  timestamp="1d ago"
                  upvotes={31}
                  answers={15}
                />
              </TabsContent>

              <TabsContent value="popular" className="space-y-4 mt-6">
                <QuestionCard
                  id="4"
                  title="How to calculate real-world range vs EPA estimates?"
                  body="The EPA range seems optimistic. What factors should I consider for real-world range calculations?"
                  tags={["range", "efficiency"]}
                  author="Emily Park"
                  timestamp="2d ago"
                  upvotes={45}
                  answers={20}
                  isSolved={true}
                />
              </TabsContent>

              <TabsContent value="solved" className="space-y-4 mt-6">
                <QuestionCard
                  id="1"
                  title="Best practices for battery health in cold weather?"
                  body="I live in Minnesota and winter is approaching. What are the best practices to maintain battery health during freezing temperatures?"
                  tags={["battery", "winter", "maintenance"]}
                  author="Mike Johnson"
                  timestamp="3h ago"
                  upvotes={24}
                  answers={7}
                  isSolved={true}
                />
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
                    variant="secondary"
                    className="cursor-pointer hover-elevate"
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
      </div>
    </div>
  );
}
