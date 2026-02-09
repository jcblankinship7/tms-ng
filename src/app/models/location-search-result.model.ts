export interface LocationSearchResult {
  id: string;
  displayName: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  zipCode: string;
  country: string;
  // structured position preferred
  position?: {
    latitude?: number;
    longitude?: number;
  };
  latitude?: number;
  longitude?: number;
}
