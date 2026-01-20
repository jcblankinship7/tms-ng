// Represents a pickup/delivery location
export interface Stop {
  zip: string;
  address: string;
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
  moveOrder: number;           // Order of this move
  moveType: MoveType;          // Type of move
  origin: Stop;
  destination: Stop;
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
}

// Represents a quote (can be used for creating new quotes)
export interface Quote {
  moves: Move[];
  price: number;              // Use number instead of string for arithmetic
}

// Terminal locations (for rail moves)
export interface Terminal {
  id: string;
  name: string;
  zip: string;
}
