export enum CustomerType {
  Shipper = 1,
  Consignee = 2,
  BillTo = 3,
  Other = 4,
  Broker = 5,
  ServiceProvider = 6
}

export enum ProviderType {
  ThirdPartyLogistics = 1,
  Carrier = 2
}

export enum QuoteType {
  Spot = 1,
  Customer = 2
}

export type CustomerStatus = 'active' | 'inactive';

export interface Customer {
  id: number;
  name: string;
  type: CustomerType;
  marketingGroupId?: number;
  marketingGroupName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  position?: { latitude?: number; longitude?: number };
  lineOfCredit: number;
  currentBalance: number;
  pendingCharges: number;
  quoteType: QuoteType;
  patronCode: string;
  associatedUserIds: string[];
  associatedBillToIds?: number[];
  providerType?: ProviderType;
  motorCarrierCode?: string;
  scacCode?: string;
  status: CustomerStatus;
}

export interface CreateCustomer {
  name: string;
  type: CustomerType;
  marketingGroupId?: number;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  position?: { latitude?: number; longitude?: number };
  lineOfCredit?: number;
  quoteType: QuoteType;
  patronCode: string;
  userIds: string[];
  billToIds?: number[];
  providerType?: ProviderType;
  motorCarrierCode?: string;
  scacCode?: string;
  status?: CustomerStatus;
}

export interface UpdateCustomer {
  name: string;
  type: CustomerType;
  marketingGroupId?: number;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  position?: { latitude?: number; longitude?: number };
  lineOfCredit?: number;
  quoteType: QuoteType;
  patronCode: string;
  userIds: string[];
  billToIds?: number[];
  providerType?: ProviderType;
  motorCarrierCode?: string;
  scacCode?: string;
  status?: CustomerStatus;
}
