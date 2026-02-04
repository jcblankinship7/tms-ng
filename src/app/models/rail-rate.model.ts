import { Terminal } from './terminal.model';

export enum RailRateStatus {
  Active = 1,
  Inactive = 2
}

export interface RailRate {
  id: number;
  originTerminalId: number;
  originTerminal?: Terminal;
  destinationTerminalId: number;
  destinationTerminal?: Terminal;
  railCost: number;
  distanceMiles?: number;
  baseRate?: number;
  fuelSurcharge?: number;
  totalRate?: number;
  ratePerMile?: number;
  effectiveDate: Date;
  endDate: Date;
  status: RailRateStatus;
  createdAt: Date;
  updatedAt?: Date;
}

export interface RailRateDto {
  originTerminalId: number;
  destinationTerminalId: number;
  railCost: number;
  distanceMiles?: number;
  baseRate?: number;
  fuelSurcharge?: number;
  totalRate?: number;
  ratePerMile?: number;
  effectiveDate: Date;
  endDate: Date;
  status: RailRateStatus;
  overrideConflicts?: boolean;
}

export interface RailRateConflictCheckDto {
  originTerminalId: number;
  destinationTerminalId: number;
  effectiveDate: Date;
  endDate: Date;
  excludeId?: number;
}

export interface RailRateConflictResponse {
  hasConflict: boolean;
  conflicts: RailRate[];
}
