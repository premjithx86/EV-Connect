import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Check } from "lucide-react";
import { useState } from "react";

interface CommunityCardProps {
  id: string;
  name: string;
  type: string;
  coverImage?: string;
  description: string;
  memberCount: number;
  isJoined?: boolean;
}

export function CommunityCard({
  id,
  name,
  type,
  coverImage,
  description,
  memberCount,
  isJoined = false,
}: CommunityCardProps) {
  const [joined, setJoined] = useState(isJoined);

  const handleJoin = () => {
    setJoined(!joined);
    console.log(`Community ${id} ${joined ? 'left' : 'joined'}`);
  };

  return (
    <Card className="overflow-hidden hover-elevate transition-shadow" data-testid={`card-community-${id}`}>
      <div className="flex flex-col sm:flex-row">
        {coverImage && (
          <div className="w-full sm:w-48 h-32 sm:h-auto">
            <img
              src={coverImage}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-xl mb-1" data-testid={`text-name-${id}`}>
                {name}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {type}
              </Badge>
            </div>
            
            <Button
              size="sm"
              variant={joined ? "secondary" : "default"}
              onClick={handleJoin}
              className="gap-2"
              data-testid={`button-join-${id}`}
            >
              {joined ? (
                <>
                  <Check className="h-4 w-4" />
                  Joined
                </>
              ) : (
                'Join'
              )}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {description}
          </p>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{memberCount.toLocaleString()} members</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
