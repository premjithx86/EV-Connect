const OCM_API_KEY = process.env.OPEN_CHARGE_MAP_API_KEY || "";
const OCM_BASE_URL = "https://api.openchargemap.io/v3/poi/";

interface OCMStation {
  ID: number;
  AddressInfo: {
    Title: string;
    AddressLine1?: string;
    Town?: string;
    StateOrProvince?: string;
    Postcode?: string;
    Country?: {
      Title: string;
    };
    Latitude: number;
    Longitude: number;
  };
  Connections?: Array<{
    ConnectionType?: {
      Title: string;
    };
    PowerKW?: number;
  }>;
  OperatorInfo?: {
    Title: string;
  };
  UsageCost?: string;
  StatusType?: {
    IsOperational: boolean;
  };
}

export interface ChargingStation {
  externalId: string;
  name: string;
  coords: { lat: number; lng: number };
  address: string;
  connectors: Array<{ type: string; powerKW: number }>;
  provider?: string;
  pricing?: string;
  availability?: string;
}

export async function searchChargingStations(params: {
  latitude?: number;
  longitude?: number;
  distance?: number;
  countryCode?: string;
  maxResults?: number;
}): Promise<ChargingStation[]> {
  const queryParams = new URLSearchParams({
    output: "json",
    compact: "true",
    maxresults: (params.maxResults || 50).toString(),
  });

  if (params.latitude && params.longitude) {
    queryParams.append("latitude", params.latitude.toString());
    queryParams.append("longitude", params.longitude.toString());
    queryParams.append("distance", (params.distance || 25).toString());
    queryParams.append("distanceunit", "KM");
  }

  if (params.countryCode) {
    queryParams.append("countrycode", params.countryCode);
  }

  if (OCM_API_KEY) {
    queryParams.append("key", OCM_API_KEY);
  }

  const url = `${OCM_BASE_URL}?${queryParams.toString()}`;
  
  try {
    const response = await fetch(url, {
      headers: OCM_API_KEY ? { "X-API-Key": OCM_API_KEY } : {},
    });

    if (!response.ok) {
      throw new Error(`OCM API error: ${response.statusText}`);
    }

    const data: OCMStation[] = await response.json();

    return data.map((station) => ({
      externalId: `ocm-${station.ID}`,
      name: station.AddressInfo.Title || "Charging Station",
      coords: {
        lat: station.AddressInfo.Latitude,
        lng: station.AddressInfo.Longitude,
      },
      address: [
        station.AddressInfo.AddressLine1,
        station.AddressInfo.Town,
        station.AddressInfo.StateOrProvince,
        station.AddressInfo.Postcode,
        station.AddressInfo.Country?.Title,
      ]
        .filter(Boolean)
        .join(", "),
      connectors:
        station.Connections?.map((conn) => ({
          type: conn.ConnectionType?.Title || "Unknown",
          powerKW: conn.PowerKW || 0,
        })) || [],
      provider: station.OperatorInfo?.Title,
      pricing: station.UsageCost,
      availability: station.StatusType?.IsOperational ? "AVAILABLE" : "UNKNOWN",
    }));
  } catch (error) {
    console.error("Error fetching from Open Charge Map:", error);
    throw error;
  }
}
