export enum TerminalStatus {
  Active = 1,
  Inactive = 2
}

export interface Terminal {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  railroad: string;
  status: TerminalStatus;
  mondayHours?: string | null;
  tuesdayHours?: string | null;
  wednesdayHours?: string | null;
  thursdayHours?: string | null;
  fridayHours?: string | null;
  saturdayHours?: string | null;
  sundayHours?: string | null;
  mondayFlipHours?: string | null;
  tuesdayFlipHours?: string | null;
  wednesdayFlipHours?: string | null;
  thursdayFlipHours?: string | null;
  fridayFlipHours?: string | null;
  saturdayFlipHours?: string | null;
  sundayFlipHours?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface TerminalDto {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  railroad: string;
  status: TerminalStatus;
  mondayHours?: string | null;
  tuesdayHours?: string | null;
  wednesdayHours?: string | null;
  thursdayHours?: string | null;
  fridayHours?: string | null;
  saturdayHours?: string | null;
  sundayHours?: string | null;
  mondayFlipHours?: string | null;
  tuesdayFlipHours?: string | null;
  wednesdayFlipHours?: string | null;
  thursdayFlipHours?: string | null;
  fridayFlipHours?: string | null;
  saturdayFlipHours?: string | null;
  sundayFlipHours?: string | null;
}

export interface TerminalDistance {
  from: { id: number; name: string };
  to: { id: number; name: string };
  distanceMiles: number;
}
