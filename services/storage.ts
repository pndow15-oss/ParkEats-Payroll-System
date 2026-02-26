
import { Employee, Paysheet } from '../types';

const STORAGE_KEYS = {
  EMPLOYEES: 'payroll_employees',
  PAYSHEETS: 'payroll_paysheets'
};

export const storageService = {
  getEmployees: (): Employee[] => {
    const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    return data ? JSON.parse(data) : [];
  },

  saveEmployees: (employees: Employee[]) => {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  },

  getPaysheets: (): Paysheet[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PAYSHEETS);
    return data ? JSON.parse(data) : [];
  },

  savePaysheet: (paysheet: Paysheet) => {
    const existing = storageService.getPaysheets();
    localStorage.setItem(STORAGE_KEYS.PAYSHEETS, JSON.stringify([paysheet, ...existing]));
  },

  updatePaysheet: (paysheet: Paysheet) => {
    const existing = storageService.getPaysheets();
    const updated = existing.map(p => p.id === paysheet.id ? paysheet : p);
    localStorage.setItem(STORAGE_KEYS.PAYSHEETS, JSON.stringify(updated));
  },

  deletePaysheet: (id: string) => {
    const existing = storageService.getPaysheets();
    localStorage.setItem(STORAGE_KEYS.PAYSHEETS, JSON.stringify(existing.filter(p => p.id !== id)));
  }
};
