import { ReactNode, useMemo } from "react";
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
    followers?: number;
    following?: number;
  };
  isOwnProfile?: boolean;
  actions?: ReactNode;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
}

export function UserProfileCard({
  avatar,
  name,
  bio,
  location,
  vehicle,
  stats = { posts: 0, communities: 0 },
  isOwnProfile = false,
  actions,
  onFollowersClick,
  onFollowingClick,
}: UserProfileCardProps) {
  const initials = useMemo(() => {
    const segments = name.trim().split(/\s+/);
    if (segments.length === 0) {
      return "?";
    }
    const first = segments[0]?.[0] ?? "";
    const last = segments.length > 1 ? segments[segments.length - 1]?.[0] ?? "" : "";
    return `${first}${last}`.toUpperCase() || first.toUpperCase() || "?";
  }, [name]);

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row gap-6">
        <Avatar className="h-24 w-24 mx-auto sm:mx-0">
          <AvatarImage src={avatar} />
          <AvatarFallback className="text-2xl">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-2">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <h2 className="font-display font-bold text-2xl">{name}</h2>
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-2">
              {actions}
              {isOwnProfile && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  data-testid="button-edit-profile"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
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

          <div className="flex gap-6 justify-center sm:justify-start flex-wrap">
            <StatsItem label="Posts" value={stats.posts} />
            <StatsItem label="Communities" value={stats.communities} />
            {typeof stats.followers === "number" && (
              <StatsItem label="Followers" value={stats.followers} onClick={onFollowersClick} />
            )}
            {typeof stats.following === "number" && (
              <StatsItem label="Following" value={stats.following} onClick={onFollowingClick} />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatsItem({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="font-semibold text-lg">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex flex-col items-center sm:items-start text-left text-foreground hover:text-primary focus:outline-none"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center sm:items-start text-left">
      {content}
    </div>
  );
}
