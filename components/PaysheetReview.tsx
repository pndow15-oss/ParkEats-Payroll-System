
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { Paysheet, PaysheetRow } from '../types';
import { 
  FileDown, 
  Printer, 
  Search, 
  ChevronDown, 
  Calendar, 
  DollarSign, 
  Clock, 
  Download,
  Filter,
  AlertTriangle,
  History,
  Trash2,
  ExternalLink,
  Receipt
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface PaysheetReviewProps {
  isReadOnly: boolean;
  onNavigateToPayslips?: () => void;
}

const PaysheetReview: React.FC<PaysheetReviewProps> = ({ isReadOnly, onNavigateToPayslips }) => {
  const [paysheets, setPaysheets] = useState<Paysheet[]>([]);
  const [selectedPaysheet, setSelectedPaysheet] = useState<Paysheet | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'anomaly' | 'missing'>('all');

  useEffect(() => {
    const history = storageService.getPaysheets();
    setPaysheets(history);
    if (history.length > 0) {
      setSelectedPaysheet(history[0]);
    }
  }, []);

  const exportToExcel = () => {
    if (!selectedPaysheet) return;

    const exportData = selectedPaysheet.rows.map(row => ({
      'Employee Name': row.employeeName,
      'Employee Number': row.employeeNumber,
      'Week ID': row.weekIdentifier,
      'Hours Worked': row.hoursWorked,
      'Hourly Rate': row.hourlyRate,
      'Amount to Pay': row.amountToPay,
      'Status': row.status === 'valid' ? 'Normal' : row.warningMessage
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Paysheet");
    XLSX.writeFile(wb, `Paysheet_${selectedPaysheet.weekIdentifier}_${selectedPaysheet.id.substr(0, 4)}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  const deleteSelected = () => {
    if (!selectedPaysheet || isReadOnly) return;
    if (window.confirm('Delete this generated paysheet permanently?')) {
      storageService.deletePaysheet(selectedPaysheet.id);
      const updated = storageService.getPaysheets();
      setPaysheets(updated);
      setSelectedPaysheet(updated.length > 0 ? updated[0] : null);
    }
  };

  const filteredRows = selectedPaysheet?.rows.filter(row => {
    const matchesSearch = 
      row.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.employeeNumber.includes(searchTerm);
    
    if (filter === 'anomaly') return matchesSearch && row.status === 'anomaly';
    if (filter === 'missing') return matchesSearch && row.status === 'missing_rate';
    return matchesSearch;
  }) || [];

  if (!selectedPaysheet) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <History size={64} className="mb-6 opacity-20" />
        <h3 className="text-xl font-bold">No Paysheets Found</h3>
        <p className="max-w-xs text-center mt-2">Generate a paysheet from the upload section to view history here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6 no-print">
        <div className="w-full lg:w-72 space-y-4">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Select Pay Period</label>
          <div className="relative">
            <select 
              value={selectedPaysheet.id}
              onChange={(e) => setSelectedPaysheet(paysheets.find(p => p.id === e.target.value) || null)}
              className="w-full appearance-none bg-white border border-slate-200 px-4 py-3 rounded-2xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer pr-10"
            >
              {paysheets.map(p => (
                <option key={p.id} value={p.id}>
                  Week: {p.weekIdentifier} ({new Date(p.generationDate).toLocaleDateString()})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Payroll</div>
                  <div className="text-xl font-bold">${selectedPaysheet.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                  <Clock size={20} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Hours</div>
                  <div className="text-xl font-bold">{selectedPaysheet.totalHours.toFixed(1)} hrs</div>
                </div>
             </div>
          </div>

          {!isReadOnly && (
            <button 
              onClick={deleteSelected}
              className="w-full flex items-center justify-center gap-2 text-red-500 bg-white border border-red-100 py-3 rounded-2xl hover:bg-red-50 transition-all font-semibold"
            >
              <Trash2 size={16} />
              Delete Report
            </button>
          )}
        </div>

        <div className="flex-1 w-full space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-3xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold text-sm transition-all"
              >
                <FileDown size={16} />
                Excel
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold text-sm transition-all"
              >
                <Printer size={16} />
                Print PDF
              </button>
              {onNavigateToPayslips && (
                <button 
                  onClick={onNavigateToPayslips}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold text-sm transition-all shadow-lg shadow-emerald-200"
                >
                  <Receipt size={16} />
                  Generate Payslips
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
              <button 
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilter('anomaly')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'anomaly' ? 'bg-amber-100 text-amber-700' : 'text-slate-400'}`}
              >
                Alerts
              </button>
              <button 
                onClick={() => setFilter('missing')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'missing' ? 'bg-red-100 text-red-700' : 'text-slate-400'}`}
              >
                Missing
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Filter by name/ID..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white text-sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Week ID</th>
                    <th className="px-6 py-4 text-right">Hours</th>
                    <th className="px-6 py-4 text-right">Rate</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{row.employeeName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{row.employeeNumber}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{row.weekIdentifier}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-700">{row.hoursWorked}</td>
                      <td className="px-6 py-4 text-right text-slate-500 text-sm">${row.hourlyRate.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-slate-900">${row.amountToPay.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4">
                        {row.status === 'valid' ? (
                          <div className="w-2 h-2 rounded-full bg-green-400 ml-auto mr-4" />
                        ) : (
                          <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-1 rounded-full ${row.status === 'anomaly' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                            <AlertTriangle size={12} />
                            {row.status === 'anomaly' ? 'High Hrs' : 'No Rate'}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRows.length === 0 && (
                <div className="p-10 text-center text-slate-400 text-sm">
                  No records match the current filters.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PRINT VERSION ONLY */}
      <div className="hidden print:block print-only">
        <div className="mb-8 border-b-2 border-slate-900 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">OFFICIAL PAYSHEET</h1>
            <p className="text-sm font-bold text-slate-500">PAYROLL AUDIT RECORD</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase text-slate-400 tracking-widest">Generation Timestamp</div>
            <div className="text-lg font-bold">{new Date(selectedPaysheet.generationDate).toLocaleString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8 mb-8">
           <div className="bg-slate-50 p-4 border border-slate-200">
             <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Period Identifier</div>
             <div className="text-xl font-bold">{selectedPaysheet.weekIdentifier}</div>
           </div>
           <div className="bg-slate-50 p-4 border border-slate-200">
             <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Net Payroll</div>
             <div className="text-xl font-bold">${selectedPaysheet.totalAmount.toFixed(2)}</div>
           </div>
           <div className="bg-slate-50 p-4 border border-slate-200">
             <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Man-Hours</div>
             <div className="text-xl font-bold">{selectedPaysheet.totalHours.toFixed(1)} hrs</div>
           </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-300">
              <th className="py-2 text-left text-xs font-black uppercase">Employee</th>
              <th className="py-2 text-left text-xs font-black uppercase">ID</th>
              <th className="py-2 text-right text-xs font-black uppercase">Hours</th>
              <th className="py-2 text-right text-xs font-black uppercase">Rate</th>
              <th className="py-2 text-right text-xs font-black uppercase">Total</th>
              <th className="py-2 text-center text-xs font-black uppercase">Sign.</th>
            </tr>
          </thead>
          <tbody>
            {selectedPaysheet.rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-3 text-sm font-bold">{row.employeeName}</td>
                <td className="py-3 text-xs font-mono">{row.employeeNumber}</td>
                <td className="py-3 text-right text-sm">{row.hoursWorked}</td>
                <td className="py-3 text-right text-sm">${row.hourlyRate.toFixed(2)}</td>
                <td className="py-3 text-right text-sm font-black">${row.amountToPay.toFixed(2)}</td>
                <td className="py-3 border-l border-slate-100 pl-4">
                  <div className="w-32 h-6 border-b border-slate-300" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-20 grid grid-cols-2 gap-20">
          <div className="border-t border-slate-900 pt-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prepared By (Administrator)</div>
            <div className="mt-4 text-xs font-medium text-slate-400 italic">Signature / Date</div>
          </div>
          <div className="border-t border-slate-900 pt-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Verified By (Paymaster)</div>
            <div className="mt-4 text-xs font-medium text-slate-400 italic">Signature / Date</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaysheetReview;
