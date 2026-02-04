export interface UpdateUser {
  persona: UserPersona;
  email: string;
  userName: string;
}
export enum UserPersona {
  Customer = 1,
  ServiceProvider = 2,
  Admin = 3,
  MarketingManager = 4,
  SalesRep = 5,
  SettlementsClerk = 6,
  BillingClerk = 7,
  OperationClerk = 8
}

export interface User {
  id: string;
  email: string;
  userName: string;
  firstName: string;
  lastName: string;
  persona: UserPersona;
  emailConfirmed: boolean;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface UpdateUserPersona {
  persona: UserPersona;
}

export interface SetEmailConfirmed {
  emailConfirmed: boolean;
}
