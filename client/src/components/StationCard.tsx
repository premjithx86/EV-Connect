import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Zap, Bookmark, Navigation } from "lucide-react";
import { useState } from "react";

interface Connector {
  type: string;
  powerKW: number;
}

interface StationCardProps {
  id: string;
  name: string;
  address: string;
  distance?: string;
  connectors: Connector[];
  provider?: string;
  pricing?: string;
  availability?: "available" | "busy" | "offline";
  isBookmarked?: boolean;
}

export function StationCard({
  id,
  name,
  address,
  distance,
  connectors,
  provider,
  pricing,
  availability = "available",
  isBookmarked = false,
}: StationCardProps) {
  const [bookmarked, setBookmarked] = useState(isBookmarked);

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    console.log(`Station ${id} bookmark toggled`);
  };

  const availabilityColor = {
    available: "bg-status-online",
    busy: "bg-status-away",
    offline: "bg-status-offline",
  };

  return (
    <Card className="p-4 hover-elevate transition-shadow" data-testid={`card-station-${id}`}>
      <div className="flex gap-3">
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
          <Zap className="h-6 w-6 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-base" data-testid={`text-name-${id}`}>
              {name}
            </h3>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${availabilityColor[availability]}`} />
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {address}
            {distance && <span className="ml-1">· {distance}</span>}
          </p>

          <div className="flex flex-wrap gap-1 mb-3">
            {connectors.map((connector, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {connector.type} · {connector.powerKW}kW
              </Badge>
            ))}
          </div>

          {(provider || pricing) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              {provider && <span>{provider}</span>}
              {pricing && <span>· {pricing}</span>}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              data-testid={`button-navigate-${id}`}
            >
              <Navigation className="h-3 w-3 mr-1" />
              Navigate
            </Button>
            <Button
              variant={bookmarked ? "default" : "outline"}
              size="sm"
              onClick={handleBookmark}
              data-testid={`button-bookmark-${id}`}
            >
              <Bookmark className={`h-3 w-3 ${bookmarked ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
