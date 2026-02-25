
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { Paysheet, PunchDetail } from '../types';
import { 
  History, 
  ChevronDown, 
  Search, 
  AlertCircle, 
  Clock, 
  User,
  Calendar,
  FileText,
  Printer,
  FileDown
} from 'lucide-react';
import * as XLSX from 'xlsx';

const PunchAudit: React.FC = () => {
  const [paysheets, setPaysheets] = useState<Paysheet[]>([]);
  const [selectedPaysheet, setSelectedPaysheet] = useState<Paysheet | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const history = storageService.getPaysheets();
    setPaysheets(history);
    if (history.length > 0) {
      setSelectedPaysheet(history[0]);
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const exportAuditToExcel = () => {
    if (!selectedPaysheet) return;

    const exportData: any[] = [];
    selectedPaysheet.rows.forEach(row => {
      if (row.punches && row.punches.length > 0) {
        row.punches.forEach(punch => {
          exportData.push({
            'Employee Name': row.employeeName,
            'Employee ID': row.employeeNumber,
            'Date': punch.date,
            'Punch In': punch.inTime,
            'Punch Out': punch.outTime || 'N/A',
            'Hours': punch.hours,
            'Status': punch.isIgnored ? 'IGNORED' : 'VALID',
            'Pay Rate': row.hourlyRate,
            'Daily Pay': punch.isIgnored ? '0.00' : (punch.hours * row.hourlyRate).toFixed(2),
            'Comments': punch.comment || ''
          });
        });
      } else {
        exportData.push({
          'Employee Name': row.employeeName,
          'Employee ID': row.employeeNumber,
          'Date': 'N/A',
          'Punch In': 'N/A',
          'Punch Out': 'N/A',
          'Hours': row.hoursWorked,
          'Pay Rate': row.hourlyRate,
          'Daily Pay': row.amountToPay.toFixed(2),
          'Comments': 'No detailed punch data available'
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Punch Audit");
    XLSX.writeFile(wb, `Punch_Audit_${selectedPaysheet.weekIdentifier}.xlsx`);
  };

  const filteredRows = selectedPaysheet?.rows.filter(row => 
    row.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.employeeNumber.includes(searchTerm)
  ) || [];

  if (!selectedPaysheet) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <History size={64} className="mb-6 opacity-20" />
        <h3 className="text-xl font-bold">No Audit Data Found</h3>
        <p className="max-w-xs text-center mt-2">Process a detailed timeclock file to view punch audits.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 no-print">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <select 
              value={selectedPaysheet.id}
              onChange={(e) => setSelectedPaysheet(paysheets.find(p => p.id === e.target.value) || null)}
              className="w-full appearance-none bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer pr-10 text-sm"
            >
              {paysheets.map(p => (
                <option key={p.id} value={p.id}>
                  Week: {p.weekIdentifier}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button 
            onClick={exportAuditToExcel}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold text-sm transition-all"
          >
            <FileDown size={16} />
            Export Audit
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold text-sm transition-all shadow-lg shadow-emerald-200"
          >
            <Printer size={16} />
            Print Audit
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {filteredRows.map((row, idx) => (
          <div key={idx} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm break-inside-avoid">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <User size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{row.employeeName}</h4>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                    <span>ID: {row.employeeNumber}</span>
                    <span className="text-slate-300">|</span>
                    <span>Rate: ${row.hourlyRate.toFixed(2)}/hr</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Hours</div>
                  <div className="text-xl font-bold text-slate-900">{row.hoursWorked.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weekly Total</div>
                  <div className="text-xl font-bold text-emerald-600">${row.amountToPay.toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/30 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Punch In</th>
                    <th className="px-6 py-3">Punch Out</th>
                    <th className="px-6 py-3 text-right">Hours</th>
                    <th className="px-6 py-3 text-right">Daily Pay</th>
                    <th className="px-6 py-3">Audit Comments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {row.punches && row.punches.length > 0 ? (
                    row.punches.map((punch, pIdx) => (
                      <tr key={pIdx} className={`text-sm ${punch.isIgnored ? 'bg-red-50/30' : punch.inconsistent ? 'bg-amber-50/50' : ''}`}>
                        <td className="px-6 py-4 font-medium text-slate-700">{punch.date}</td>
                        <td className="px-6 py-4 text-slate-600">{punch.inTime}</td>
                        <td className="px-6 py-4 text-slate-600">{punch.outTime || 'N/A'}</td>
                        <td className={`px-6 py-4 text-right font-mono ${punch.isIgnored ? 'text-slate-400 line-through' : ''}`}>
                          {punch.hours.toFixed(2)}
                        </td>
                        <td className={`px-6 py-4 text-right font-bold ${punch.isIgnored ? 'text-slate-400' : 'text-slate-900'}`}>
                          ${(punch.hours * row.hourlyRate).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          {punch.isIgnored ? (
                            <div className="flex items-center gap-2 text-red-600 font-bold text-[10px] uppercase tracking-tight">
                              <AlertCircle size={14} />
                              {punch.comment || 'Ignored'}
                            </div>
                          ) : punch.inconsistent ? (
                            <div className="flex items-center gap-2 text-amber-600 font-semibold text-xs">
                              <AlertCircle size={14} />
                              {punch.comment}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Verified</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                        No detailed punch data available for this employee.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* PRINT VERSION */}
      <div className="hidden print:block print-only">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-black uppercase tracking-tighter">Punch Audit Report</h1>
          <p className="text-sm font-bold text-slate-500">Week: {selectedPaysheet.weekIdentifier} | Generated: {new Date().toLocaleDateString()}</p>
        </div>
        {/* Print content is handled by the main layout being visible during print */}
      </div>
    </div>
  );
};

export default PunchAudit;
