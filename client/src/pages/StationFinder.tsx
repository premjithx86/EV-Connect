import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { StationMap } from "@/components/StationMap";
import { StationCard } from "@/components/StationCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Map, List, Search, MapPin, Loader2 } from "lucide-react";

interface ChargingStation {
  ID: number;
  AddressInfo: {
    Title: string;
    AddressLine1: string;
    Town: string;
    StateOrProvince: string;
    Postcode: string;
    Country: {
      Title: string;
    };
    Latitude: number;
    Longitude: number;
    Distance?: number;
  };
  Connections: Array<{
    ConnectionType?: {
      Title: string;
    };
    PowerKW?: number;
    Level?: {
      Title: string;
    };
  }>;
  OperatorInfo?: {
    Title: string;
  };
  UsageCost?: string;
  StatusType?: {
    IsOperational: boolean;
    Title: string;
  };
}

export default function StationFinder() {
  const { toast } = useToast();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchLocation, setSearchLocation] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsGettingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          // Default to San Francisco if location access denied
          setUserLocation({ lat: 37.7749, lng: -122.4194 });
          setIsGettingLocation(false);
          toast({
            title: "Location access denied",
            description: "Showing stations near San Francisco",
            variant: "destructive",
          });
        }
      );
    } else {
      // Default location if geolocation not supported
      setUserLocation({ lat: 37.7749, lng: -122.4194 });
    }
  }, [toast]);

  // Fetch charging stations via backend proxy
  const { data: stations = [], isLoading, error } = useQuery<ChargingStation[]>({
    queryKey: ["charging-stations", userLocation],
    queryFn: async () => {
      if (!userLocation) return [];
      
      console.log("Fetching stations for:", userLocation);
      
      const url = `/api/charging-stations?latitude=${userLocation.lat}&longitude=${userLocation.lng}&distance=25&maxResults=50`;
      console.log("API URL:", url);
      
      const response = await fetch(url, {
        credentials: "include",
      });
      
      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      
      const text = await response.text();
      console.log("Response text (first 200 chars):", text.substring(0, 200));
      
      if (!response.ok) {
        console.error("API Error:", response.status, response.statusText);
        throw new Error("Failed to fetch stations");
      }
      
      try {
        const data = JSON.parse(text);
        console.log("Stations received:", data.length, "stations");
        console.log("First station:", data[0]);
        return data;
      } catch (e) {
        console.error("JSON parse error:", e);
        console.error("Full response text:", text);
        throw new Error("Invalid JSON response from server");
      }
    },
    enabled: !!userLocation,
    retry: 2,
    retryDelay: 1000,
  });

  // Log errors
  if (error) {
    console.error("Query error:", error);
  }

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsGettingLocation(false);
          toast({ title: "Location updated" });
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsGettingLocation(false);
          toast({
            title: "Failed to get location",
            variant: "destructive",
          });
        }
      );
    }
  };

  const handleSearch = async () => {
    if (!searchLocation.trim()) return;
    
    try {
      // Use Nominatim (OpenStreetMap) geocoding service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchLocation)}&limit=1`
      );
      
      if (!response.ok) throw new Error("Geocoding failed");
      
      const results = await response.json();
      
      if (results.length === 0) {
        toast({
          title: "Location not found",
          description: "Please try a different search term",
          variant: "destructive",
        });
        return;
      }
      
      const location = results[0];
      setUserLocation({
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lon),
      });
      
      toast({
        title: "Location updated",
        description: `Showing stations near ${location.display_name.split(',')[0]}`,
      });
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Don't filter stations - show all from API
  const filteredStations = stations;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-display font-bold text-3xl mb-2">Find Charging Stations</h1>
              <p className="text-muted-foreground">
                Discover nearby EV charging stations
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleUseMyLocation}
              disabled={isGettingLocation}
              className="gap-2"
            >
              {isGettingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              Use My Location
            </Button>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by city, address, or station name..."
                className="pl-9"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={!searchLocation.trim() || isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="map" className="w-full">
          <TabsList>
            <TabsTrigger value="map" className="gap-2" data-testid="tab-map">
              <Map className="h-4 w-4" />
              Map View
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2" data-testid="tab-list">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="mt-6">
            <StationMap 
              stations={filteredStations} 
              userLocation={userLocation}
              onLocationChange={(newLocation) => {
                setUserLocation(newLocation);
                setSearchLocation("");
              }}
            />
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            {isLoading || isGettingLocation ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Loading charging stations...</p>
                  {userLocation && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Searching near {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <h3 className="text-lg font-semibold mb-2">Failed to load stations</h3>
                <p className="text-muted-foreground mb-4">
                  There was an error fetching charging stations
                </p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            ) : filteredStations.length > 0 ? (
              <>
                <div className="mb-4 text-sm text-muted-foreground">
                  Found {filteredStations.length} charging stations nearby
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStations.map((station) => {
                    const address = [
                      station.AddressInfo.AddressLine1,
                      station.AddressInfo.Town,
                      station.AddressInfo.StateOrProvince,
                      station.AddressInfo.Postcode,
                    ]
                      .filter(Boolean)
                      .join(", ");

                    const connectors = station.Connections?.map((conn) => ({
                      type: conn.ConnectionType?.Title || conn.Level?.Title || "Unknown",
                      powerKW: conn.PowerKW || 0,
                    })) || [];

                    const distance = station.AddressInfo.Distance
                      ? `${station.AddressInfo.Distance.toFixed(1)} mi`
                      : undefined;

                    const availability = station.StatusType?.IsOperational
                      ? "available"
                      : "offline";

                    return (
                      <StationCard
                        key={station.ID}
                        id={station.ID.toString()}
                        name={station.AddressInfo.Title}
                        address={address}
                        distance={distance}
                        connectors={connectors}
                        provider={station.OperatorInfo?.Title}
                        pricing={station.UsageCost}
                        availability={availability as any}
                        latitude={station.AddressInfo.Latitude}
                        longitude={station.AddressInfo.Longitude}
                      />
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No stations found</h3>
                <p className="text-muted-foreground mb-4">
                  No charging stations found within 25 miles of your location
                </p>
                {userLocation && (
                  <p className="text-xs text-muted-foreground mb-4">
                    Current location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                  </p>
                )}
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={handleUseMyLocation}>
                    <MapPin className="h-4 w-4 mr-2" />
                    Use My Location
                  </Button>
                  <Button variant="outline" onClick={() => setUserLocation({ lat: 40.7128, lng: -74.0060 })}>
                    Try New York
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
