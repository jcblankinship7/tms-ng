// Represents a pickup/delivery location
export interface Stop {
  zip: string;
  address: string;
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
  ORIGIN_PICKUP = 'ORIGIN_PICKUP',
  EXTRA_PICKUP = 'EXTRA_PICKUP',
  RAIL_MOVE = 'RAIL_MOVE',
  EXTRA_DELIVERY = 'EXTRA_DELIVERY',
  FINAL_DELIVERY = 'FINAL_DELIVERY'
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
  customerId: string;
  status: string;
  createdDate: string;
  totalPrice: number;
  moves: Move[];
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
}

// Terminal locations (for rail moves)
export interface Terminal {
  id: string;
  name: string;
  zip: string;
}
