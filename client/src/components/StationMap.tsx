import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Zap, Navigation, Search, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Station {
  ID: number;
  AddressInfo: {
    Title: string;
    AddressLine1: string;
    Town: string;
    StateOrProvince: string;
    Latitude: number;
    Longitude: number;
    Distance?: number;
  };
  Connections: Array<{
    ConnectionType?: { Title: string };
    PowerKW?: number;
  }>;
  OperatorInfo?: { Title: string };
  StatusType?: { IsOperational: boolean };
}

interface StationMapProps {
  stations: Station[];
  userLocation: { lat: number; lng: number } | null;
  onLocationChange?: (location: { lat: number; lng: number }) => void;
}

export function StationMap({ stations, userLocation, onLocationChange }: StationMapProps) {
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Load Leaflet dynamically
  useEffect(() => {
    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(script);
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || !userLocation) return;

    // @ts-ignore
    const L = window.L;
    if (!L) return;

    // Clear existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    // Create map
    const map = L.map(mapRef.current).setView([userLocation.lat, userLocation.lng], 12);
    mapInstanceRef.current = map;

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add user location marker
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: '<div style="background: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup('<b>Your Location</b>');

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded, userLocation]);

  // Add station markers
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded) return;

    // @ts-ignore
    const L = window.L;
    if (!L) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for each station
    stations.forEach((station) => {
      const isOperational = station.StatusType?.IsOperational !== false;
      const color = isOperational ? '#10b981' : '#ef4444';

      const stationIcon = L.divIcon({
        className: 'custom-station-marker',
        html: `<div style="background: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker(
        [station.AddressInfo.Latitude, station.AddressInfo.Longitude],
        { icon: stationIcon }
      )
        .addTo(mapInstanceRef.current)
        .on('click', () => setSelectedStation(station));

      const connectors = station.Connections?.map(c => 
        `${c.ConnectionType?.Title || 'Unknown'} ${c.PowerKW ? `(${c.PowerKW}kW)` : ''}`
      ).join(', ') || 'No connector info';

      marker.bindPopup(`
        <div style="min-width: 200px;">
          <h3 style="font-weight: 600; margin-bottom: 8px;">${station.AddressInfo.Title}</h3>
          <p style="font-size: 12px; color: #666; margin-bottom: 4px;">${station.AddressInfo.AddressLine1}</p>
          <p style="font-size: 12px; color: #666; margin-bottom: 8px;">${station.AddressInfo.Town}, ${station.AddressInfo.StateOrProvince}</p>
          <p style="font-size: 11px; margin-bottom: 4px;"><strong>Connectors:</strong> ${connectors}</p>
          ${station.OperatorInfo ? `<p style="font-size: 11px;"><strong>Operator:</strong> ${station.OperatorInfo.Title}</p>` : ''}
          ${station.AddressInfo.Distance ? `<p style="font-size: 11px; margin-top: 4px; color: #3b82f6;"><strong>Distance:</strong> ${station.AddressInfo.Distance.toFixed(1)} mi</p>` : ''}
        </div>
      `);

      markersRef.current.push(marker);
    });
  }, [stations, leafletLoaded]);

  const handleNavigate = (station: Station) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${station.AddressInfo.Latitude},${station.AddressInfo.Longitude}`,
      '_blank'
    );
  };

  const handleMapSearch = async () => {
    if (!mapSearchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // Use Nominatim (OpenStreetMap) geocoding service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}&limit=1`
      );
      
      if (!response.ok) throw new Error("Geocoding failed");
      
      const results = await response.json();
      
      if (results.length === 0) {
        toast({
          title: "Location not found",
          description: "Please try a different search term",
          variant: "destructive",
        });
        setIsSearching(false);
        return;
      }
      
      const location = results[0];
      const newLocation = {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lon),
      };
      
      // Update map center
      if (mapInstanceRef.current) {
        // @ts-ignore
        const L = window.L;
        if (L) {
          mapInstanceRef.current.setView([newLocation.lat, newLocation.lng], 12);
        }
      }
      
      // Notify parent component to fetch new stations
      if (onLocationChange) {
        onLocationChange(newLocation);
      }
      
      toast({
        title: "Location updated",
        description: `Centered map on ${location.display_name.split(',')[0]}`,
      });
      
      setMapSearchQuery("");
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[600px] gap-4">
      {/* Map Container */}
      <div className="flex-1 relative rounded-lg overflow-hidden bg-muted border">
        <div ref={mapRef} className="w-full h-full" />
        
        {!leafletLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}

        {/* Search Box */}
        <Card className="absolute top-4 left-4 right-4 md:right-auto md:w-96 p-3 z-[1000] shadow-lg">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search location on map..."
                className="pl-9 bg-background"
                value={mapSearchQuery}
                onChange={(e) => setMapSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleMapSearch()}
              />
            </div>
            <Button 
              size="sm" 
              onClick={handleMapSearch}
              disabled={!mapSearchQuery.trim() || isSearching}
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </Card>

        {/* Legend */}
        <Card className="absolute top-20 right-4 p-3 z-[1000] shadow-lg">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
              <span>Your Location</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
              <span>Offline</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Station List Sidebar */}
      <div className="w-full md:w-80 overflow-y-auto space-y-3">
        <div>
          <h3 className="font-semibold text-lg mb-1">Nearby Stations ({stations.length})</h3>
          <p className="text-sm text-muted-foreground">
            Click markers on the map for details
          </p>
        </div>

        {selectedStation && (
          <Card className="p-4 border-primary">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm mb-1">{selectedStation.AddressInfo.Title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {selectedStation.AddressInfo.AddressLine1}<br />
                    {selectedStation.AddressInfo.Town}, {selectedStation.AddressInfo.StateOrProvince}
                  </p>
                </div>
              </div>

              {selectedStation.Connections && selectedStation.Connections.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1">Connectors:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedStation.Connections.map((conn, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {conn.ConnectionType?.Title || 'Unknown'}
                        {conn.PowerKW && ` · ${conn.PowerKW}kW`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedStation.OperatorInfo && (
                <p className="text-xs">
                  <span className="font-medium">Operator:</span> {selectedStation.OperatorInfo.Title}
                </p>
              )}

              {selectedStation.AddressInfo.Distance && (
                <p className="text-xs text-primary font-medium">
                  {selectedStation.AddressInfo.Distance.toFixed(1)} miles away
                </p>
              )}

              <Button
                size="sm"
                className="w-full gap-2"
                onClick={() => handleNavigate(selectedStation)}
              >
                <Navigation className="h-3 w-3" />
                Get Directions
              </Button>
            </div>
          </Card>
        )}

        {!selectedStation && stations.length > 0 && (
          <Card className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              Select a station on the map to view details
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
