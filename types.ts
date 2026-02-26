
export enum UserRole {
  ADMIN = 'ADMIN',
  PAYMASTER = 'PAYMASTER'
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  alias: string;
  firstName: string;
  lastName: string;
  hourlyRate: number;
  lastUpdated: string;
}

export interface PunchDetail {
  date: string;
  inTime: string;
  outTime?: string;
  hours: number;
  inconsistent?: boolean;
  isIgnored?: boolean;
  comment?: string;
  isManualEntry?: boolean;
}

export interface TimeClockEntry {
  employeeName: string;
  employeeNumber: string;
  hoursWorked: number;
  weekIdentifier: string; // Week Number or Week Date
  punches?: PunchDetail[];
  weekEndingDate?: string;
  comments?: string;
}

export interface CleanedPayrollRow extends TimeClockEntry {
  // Inherits everything from TimeClockEntry
}

export interface PaysheetRow extends TimeClockEntry {
  hourlyRate: number;
  amountToPay: number;
  nisDeduction: number;
  netPay: number;
  status: 'valid' | 'missing_rate' | 'anomaly';
  warningMessage?: string;
}

export interface Paysheet {
  id: string;
  generationDate: string;
  weekIdentifier: string;
  weekEndingDate?: string;
  rows: PaysheetRow[];
  totalHours: number;
  totalAmount: number;
  generatedBy: string;
}
