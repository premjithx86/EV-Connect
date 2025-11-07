import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, Filter, Layers } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StationMap() {
  const [radius, setRadius] = useState("10");
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="flex flex-col md:flex-row h-[600px] gap-4">
      <div className="flex-1 relative rounded-lg overflow-hidden bg-muted">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Layers className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Interactive map will load here</p>
            <p className="text-sm text-muted-foreground mt-2">Leaflet + OpenStreetMap integration</p>
          </div>
        </div>

        <Card className="absolute top-4 left-4 right-4 md:right-auto md:w-80 p-3">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search location..."
                className="pl-9"
                data-testid="input-map-search"
              />
            </div>

            <div className="flex gap-2">
              <Select value={radius} onValueChange={setRadius}>
                <SelectTrigger className="flex-1" data-testid="select-radius">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 km radius</SelectItem>
                  <SelectItem value="10">10 km radius</SelectItem>
                  <SelectItem value="25">25 km radius</SelectItem>
                  <SelectItem value="50">50 km radius</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-filters"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {showFilters && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium">Connector Type</p>
                <div className="flex flex-wrap gap-2">
                  {["CCS", "CHAdeMO", "Type 2", "Tesla"].map((type) => (
                    <Badge key={type} variant="secondary" className="cursor-pointer">
                      {type}
                    </Badge>
                  ))}
                </div>

                <p className="text-sm font-medium mt-3">Min Power</p>
                <Select defaultValue="any">
                  <SelectTrigger data-testid="select-power">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="50">50+ kW</SelectItem>
                    <SelectItem value="100">100+ kW</SelectItem>
                    <SelectItem value="150">150+ kW</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </Card>

        <div className="absolute bottom-4 right-4 flex gap-2">
          <Button size="icon" variant="secondary" data-testid="button-locate">
            <MapPin className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="w-full md:w-80 overflow-y-auto">
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Nearby Stations (12)</h3>
          <p className="text-sm text-muted-foreground">
            Showing charging stations within {radius} km
          </p>
        </div>
      </div>
    </div>
  );
}
