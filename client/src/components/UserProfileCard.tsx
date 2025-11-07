import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Zap, Settings } from "lucide-react";

interface UserProfileCardProps {
  avatar?: string;
  name: string;
  bio?: string;
  location?: string;
  vehicle?: {
    brand: string;
    model: string;
    year: number;
  };
  stats?: {
    posts: number;
    communities: number;
  };
  isOwnProfile?: boolean;
}

export function UserProfileCard({
  avatar,
  name,
  bio,
  location,
  vehicle,
  stats = { posts: 0, communities: 0 },
  isOwnProfile = false,
}: UserProfileCardProps) {
  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row gap-6">
        <Avatar className="h-24 w-24 mx-auto sm:mx-0">
          <AvatarImage src={avatar} />
          <AvatarFallback className="text-2xl">
            {name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
            <h2 className="font-display font-bold text-2xl">{name}</h2>
            {isOwnProfile && (
              <Button variant="outline" size="icon" className="h-8 w-8" data-testid="button-edit-profile">
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>

          {bio && (
            <p className="text-muted-foreground mb-3">{bio}</p>
          )}

          <div className="flex flex-wrap gap-3 justify-center sm:justify-start mb-4">
            {location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{location}</span>
              </div>
            )}
            {vehicle && (
              <Badge variant="secondary" className="gap-1">
                <Zap className="h-3 w-3" />
                {vehicle.brand} {vehicle.model} ({vehicle.year})
              </Badge>
            )}
          </div>

          <div className="flex gap-6 justify-center sm:justify-start">
            <div>
              <p className="font-semibold text-lg">{stats.posts}</p>
              <p className="text-sm text-muted-foreground">Posts</p>
            </div>
            <div>
              <p className="font-semibold text-lg">{stats.communities}</p>
              <p className="text-sm text-muted-foreground">Communities</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
