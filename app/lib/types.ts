// lib/types.ts

export type CompanySummary = {
  CustomerID: number;
  Name: string;
  LocationCount: number;
  EmployeeCount: number;
};

export type LocationSummary = {
  id: number;
  Name: string;
  City: string | null;
  State: string | null;
  Zip: string | null;
  latitude: string | null;
  longitude: string | null;
  EmployeeCount: number;
  TotalWages: number;
  TotalHours: number;
};

export type LocationSearchResult = {
  id: number;
  Name: string;
  City: string | null;
  State: string | null;
  Zip: string | null;
  latitude: string | null;
  longitude: string | null;
  CustomerID: number;
  CompanyName: string;
  EmployeeCount: number;
};

export type EmployeeSummary = {
  id: number;
  FirstName: string | null;
  LastName: string | null;
  SSN: string | null;
  datehired: string; // date as string from MySQL
  termdate: string;
  Inactive: number;
  TotalWages: number;
  TotalHours: number;
  LatestCertifiedDate: string | null;
  LatestDeniedDate: string | null;
};

export type CompanyContact = {
  contactname: string | null;
  contactphone: string | null;
  contactemail: string | null;
};

export type EmployeeWage = {
  id: number;
  fromdate: string; // MySQL DATE as string
  todate: string; // MySQL DATE as string
  amount: number;
  hours: number;
  conid: number;
};

export type CreditsSummary = {
  screened: number;
  qualified: number;
  nonQualified: number;
  totalCerts: number;
  totalDenials: number;
  totalPending: number;
};

export type CreditEmployee = {
  id: number;
  FirstName: string | null;
  LastName: string | null;
  SSN: string | null;
  datehired: string; // DATE as string 'YYYY-MM-DD'
  LocationID: number;
  LocationName: string | null;
  City: string | null;
  State: string | null;
  CertifiedDate: string; // '1900-01-01' when not set
  DeniedDate: string;
  PendingDate: string;
  sent: number;
  DPC: number;
};

export type CompanyRecord = Record<string, any>;
export type EmployeeRecord = Record<string, any>;

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
