import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Zap, Bookmark, Navigation } from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
  latitude?: number;
  longitude?: number;
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
  latitude,
  longitude,
}: StationCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bookmarked, setBookmarked] = useState(false);

  // Check if station is bookmarked
  const { data: bookmark } = useQuery({
    queryKey: [`/api/bookmarks/check`, user?.id, id],
    queryFn: async () => {
      if (!user) return null;
      const res = await fetch(`/api/bookmarks/check?userId=${user.id}&targetId=${id}`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user,
  });

  useEffect(() => {
    setBookmarked(!!bookmark);
  }, [bookmark]);

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (bookmarked) {
        // Delete bookmark
        const res = await fetch(`/api/bookmarks/${bookmark.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to remove bookmark");
      } else {
        // Create bookmark
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            targetType: "STATION",
            targetId: id,
            metadata: { name, address },
          }),
        });
        if (!res.ok) throw new Error("Failed to bookmark");
      }
    },
    onSuccess: () => {
      setBookmarked(!bookmarked);
      queryClient.invalidateQueries({ queryKey: [`/api/bookmarks/check`] });
      toast({
        title: bookmarked ? "Bookmark removed" : "Station bookmarked",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update bookmark",
        variant: "destructive",
      });
    },
  });

  const handleBookmark = () => {
    if (!user) {
      toast({
        title: "Please login to bookmark stations",
        variant: "destructive",
      });
      return;
    }
    bookmarkMutation.mutate();
  };

  const handleNavigate = () => {
    if (latitude && longitude) {
      // Open in Google Maps
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
        "_blank"
      );
    } else {
      // Fallback to address search
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
        "_blank"
      );
    }
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
              onClick={handleNavigate}
              data-testid={`button-navigate-${id}`}
            >
              <Navigation className="h-3 w-3 mr-1" />
              Navigate
            </Button>
            <Button
              variant={bookmarked ? "default" : "outline"}
              size="sm"
              onClick={handleBookmark}
              disabled={bookmarkMutation.isPending}
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
