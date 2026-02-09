// Represents a pickup/delivery location
export interface Stop {
  zip: string;
  address: string;
  city?: string;
  state?: string;
  name?: string;
}

// Shipment details for a move
export interface ShipmentDetails {
  containerSealNumber?: string;
  weight?: number;
  weightUnit?: string;  // 'lbs', 'kg', 'tons'
  description?: string;
  hazardous?: boolean;
  commodityType?: string;
}

// Types of moves in an order
export enum MoveType {
  INITIAL_PICKUP = 'InitialPickup',
  EXTRA_PICKUP = 'ExtraPickup',
  RAIL = 'Rail',
  EXTRA_DELIVERY = 'ExtraDelivery',
  FINAL_DESTINATION = 'FinalDestination',
  OVER_THE_ROAD = 'OverTheRoad'
}

// Represents a single move in an order
export interface Move {
  id: string;
  orderNumber: string;         // Order number (e.g., ORD-001)
  moveOrder: number;           // Sequence of this move (1, 2, 3, etc.)
  moveType: MoveType;          // Type of move
  origin: Stop;
  destination: Stop;
  originArrivalTime?: string;  // ISO date string
  originDepartureTime?: string;  // ISO date string
  destinationArrivalTime?: string;  // ISO date string
  destinationDepartureTime?: string;  // ISO date string
  shipmentDetails?: ShipmentDetails;
  serviceProviderId?: string;  // For service provider specific moves
  isDirty?: boolean;           // True if move is incomplete/edited
}

// Represents a customer order
export interface Order {
  id: string;
  orderNumber?: string;
  customerId: string;
  status: string;
  createdDate: string;
  totalPrice: number;
  moves: Move[];
  customerShipmentNumber?: string;
  containerNumber?: string;
  shipperName?: string;
  shipperAddress?: string;
  shipperCity?: string;
  shipperState?: string;
  shipperZip?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  consigneeCity?: string;
  consigneeState?: string;
  consigneeZip?: string;
  beneficialOwnerId?: number;
  beneficialOwnerName?: string;
  brokerCustomerId?: number;
  brokerCustomerName?: string;
}

// Represents a quote (can be used for creating new quotes)
export interface Quote {
  id?: string;
  quoteNumber?: string;
  moves: Move[];
  totalPrice: number;         // Whole dollar amount from backend
  baseRate?: number;          // Rail rate base charge
  fuelSurcharge?: number;     // Fuel surcharge
  pickupCost?: number;        // Origin pickup cost
  deliveryCost?: number;      // Final delivery cost
  beneficialOwnerId?: number; // Customer who owns the goods
  beneficialOwnerName?: string;
  brokerCustomerId?: number;  // Broker facilitating the quote
  brokerCustomerName?: string;
  status?: string;
  message?: string;
}

// Terminal locations (for rail moves)
export interface Terminal {
  id: string;
  name: string;
  zip: string;
}
