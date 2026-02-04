export interface InterchangePoint {
  id: number;
  name: string;
  city: string;
  state: string;
  upServed: boolean;
  csxServed: boolean;
  bnsfServed: boolean;
  createdAt: string;
  updatedAt: string | null;
}