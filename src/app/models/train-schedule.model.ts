export interface TrainSchedule {
  id: number;
  railroad: string;
  trainNumber: string;
  service: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  distanceMiles: number;
  frequency: string;
  cutoffTime: string;
  departureTime: string;
  arrivalDay: string;
  arrivalTime: string;
  transitDays: number;
  equipment: string;
  gateCutoffTime: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  originTerminalId: number;
  destinationTerminalId: number;
  effectiveDate: string;
  expirationDate: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrainScheduleRequest {
  railroad: string;
  trainNumber: string;
  service: string;
  frequency: string;
  originTerminalId: number;
  destinationTerminalId: number;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  distanceMiles: number;
  transitDays: number;
  equipment: string;
  cutoffTime: string;
  departureTime: string;
  arrivalDay: string;
  arrivalTime: string;
  gateCutoffTime: string;
  expirationDate: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

export interface CreateInterchangeScheduleRequest {
  interchangePointId: number;
  primaryLeg: CreateTrainScheduleRequest;
  secondaryLeg: CreateTrainScheduleRequest;
}

export interface UpdateTrainScheduleRequest extends CreateTrainScheduleRequest {}

export interface TrainScheduleResponse {
  data: TrainSchedule[];
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
