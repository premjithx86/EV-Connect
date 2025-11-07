import { StationMap } from "@/components/StationMap";
import { StationCard } from "@/components/StationCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Map, List } from "lucide-react";

export default function StationFinder() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="font-display font-bold text-3xl mb-2">Find Charging Stations</h1>
          <p className="text-muted-foreground">
            Discover nearby EV charging stations with real-time availability
          </p>
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
            <StationMap />
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StationCard
                id="1"
                name="Downtown Supercharger"
                address="123 Main St, San Francisco, CA"
                distance="0.5 mi"
                connectors={[
                  { type: "CCS", powerKW: 150 },
                  { type: "CHAdeMO", powerKW: 50 },
                ]}
                provider="Tesla"
                pricing="$0.28/kWh"
                availability="available"
              />
              <StationCard
                id="2"
                name="Shopping Mall Fast Charger"
                address="456 Oak Ave, San Francisco, CA"
                distance="1.2 mi"
                connectors={[
                  { type: "CCS", powerKW: 100 },
                  { type: "Type 2", powerKW: 22 },
                ]}
                provider="EVgo"
                pricing="$0.32/kWh"
                availability="busy"
              />
              <StationCard
                id="3"
                name="City Center Station"
                address="789 Pine St, San Francisco, CA"
                distance="1.8 mi"
                connectors={[
                  { type: "Tesla", powerKW: 250 },
                ]}
                provider="Tesla"
                pricing="$0.30/kWh"
                availability="available"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
