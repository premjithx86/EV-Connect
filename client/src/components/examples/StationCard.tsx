import { StationCard } from "../StationCard";

export default function StationCardExample() {
  return (
    <div className="p-6 max-w-md">
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
    </div>
  );
}
