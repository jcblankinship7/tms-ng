export interface Code {
  id: number;
  type: string;
  value: string;
  description: string;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface CodeDto {
  type: string;
  value: string;
  description: string;
}
