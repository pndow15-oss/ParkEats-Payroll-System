
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { Paysheet, PunchDetail, User as UserType, UserRole } from '../types';
import { calculateNISContribution } from '../constants';
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
  FileDown,
  Plus,
  X,
  Save
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface PunchAuditProps {
  user: UserType;
}

const PunchAudit: React.FC<PunchAuditProps> = ({ user }) => {
  const [paysheets, setPaysheets] = useState<Paysheet[]>([]);
  const [selectedPaysheet, setSelectedPaysheet] = useState<Paysheet | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const parseDate = (dateStr: string) => {
    if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/').map(Number);
      return new Date(y, m - 1, d);
    }
    // Handles YYYY-MM-DD
    return new Date(dateStr);
  };

  const formatDate = (dateStr: string) => {
    const date = parseDate(dateStr);
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  // Manual Entry Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [newPunch, setNewPunch] = useState({
    date: new Date().toISOString().split('T')[0],
    inTime: '08:00',
    outTime: '16:00',
    hours: 8
  });

  useEffect(() => {
    const history = storageService.getPaysheets();
    setPaysheets(history);
    if (history.length > 0) {
      setSelectedPaysheet(history[0]);
    }
  }, []);

  const handleCalculateHours = (inTime: string, outTime: string) => {
    try {
      const [inH, inM] = inTime.split(':').map(Number);
      const [outH, outM] = outTime.split(':').map(Number);
      
      let diff = (outH + outM / 60) - (inH + inM / 60);
      if (diff < 0) diff += 24; // Handle overnight shifts if any
      return parseFloat(diff.toFixed(2));
    } catch {
      return 0;
    }
  };

  const handleAddManualPunch = () => {
    if (!selectedPaysheet || !selectedEmployeeId) return;

    const updatedPaysheet = { ...selectedPaysheet };
    const rowIndex = updatedPaysheet.rows.findIndex(r => r.employeeNumber === selectedEmployeeId);
    
    if (rowIndex === -1) return;

    const row = updatedPaysheet.rows[rowIndex];
    const hours = handleCalculateHours(newPunch.inTime, newPunch.outTime);
    
    const timestamp = new Date().toLocaleString();
    const [y, m, d] = newPunch.date.split('-').map(Number);
    const formattedDate = `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;

    const manualPunch: PunchDetail = {
      date: formattedDate,
      inTime: newPunch.inTime,
      outTime: newPunch.outTime,
      hours: hours,
      isManualEntry: true,
      comment: `Added by ${user.username} on ${timestamp}`
    };

    if (!row.punches) row.punches = [];
    row.punches.push(manualPunch);
    
    // Recalculate row totals
    row.hoursWorked += hours;
    row.amountToPay = row.hoursWorked * row.hourlyRate;
    row.nisDeduction = calculateNISContribution(row.amountToPay);
    row.netPay = row.amountToPay - row.nisDeduction;

    // Recalculate paysheet totals
    updatedPaysheet.totalHours = updatedPaysheet.rows.reduce((acc, r) => acc + r.hoursWorked, 0);
    updatedPaysheet.totalAmount = updatedPaysheet.rows.reduce((acc, r) => acc + r.amountToPay, 0);

    storageService.updatePaysheet(updatedPaysheet);
    setSelectedPaysheet(updatedPaysheet);
    setPaysheets(prev => prev.map(p => p.id === updatedPaysheet.id ? updatedPaysheet : p));
    setIsAddModalOpen(false);
    setSelectedEmployeeId('');
  };

  const handlePrint = () => {
    window.print();
  };

  const exportAuditToExcel = () => {
    if (!selectedPaysheet) return;

    const exportData: any[] = [];
    selectedPaysheet.rows.forEach(row => {
      const sortedPunches = [...(row.punches || [])].sort((a, b) => {
        const dateA = parseDate(a.date).getTime();
        const dateB = parseDate(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.inTime.localeCompare(b.inTime);
      });

      if (sortedPunches.length > 0) {
        sortedPunches.forEach(punch => {
          exportData.push({
            'Employee Name': row.employeeName,
            'Employee ID': row.employeeNumber,
            'Date': formatDate(punch.date),
            'Punch In': punch.inTime,
            'Punch Out': punch.outTime || 'N/A',
            'Hours': punch.hours.toFixed(2),
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
          'Hours': row.hoursWorked.toFixed(2),
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
          {user.role === UserRole.PAYMASTER && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold text-sm transition-all shadow-lg shadow-indigo-200"
            >
              <Plus size={16} />
              Add Entry
            </button>
          )}
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

      {/* Add Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Add Manual Punch</h3>
                  <p className="text-xs text-slate-500">Create a new entry for an employee</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Employee</label>
                <select 
                  value={selectedEmployeeId}
                  onChange={e => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white text-sm font-medium"
                >
                  <option value="">Choose an employee...</option>
                  {selectedPaysheet.rows.map(row => (
                    <option key={row.employeeNumber} value={row.employeeNumber}>
                      {row.employeeName} ({row.employeeNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</label>
                <input 
                  type="date"
                  value={newPunch.date}
                  onChange={e => setNewPunch(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Punch In</label>
                  <input 
                    type="time"
                    value={newPunch.inTime}
                    onChange={e => setNewPunch(prev => ({ ...prev, inTime: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Punch Out</label>
                  <input 
                    type="time"
                    value={newPunch.outTime}
                    onChange={e => setNewPunch(prev => ({ ...prev, outTime: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white text-sm"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calculated Hours</div>
                <div className="text-lg font-black text-indigo-600">
                  {handleCalculateHours(newPunch.inTime, newPunch.outTime).toFixed(2)} hrs
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-white transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddManualPunch}
                disabled={!selectedEmployeeId}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}

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
                    [...(row.punches || [])]
                      .sort((a, b) => {
                        const dateA = parseDate(a.date).getTime();
                        const dateB = parseDate(b.date).getTime();
                        if (dateA !== dateB) return dateA - dateB;
                        return a.inTime.localeCompare(b.inTime);
                      })
                      .map((punch, pIdx) => (
                        <tr key={pIdx} className={`text-sm ${punch.isIgnored ? 'bg-red-50/30' : punch.inconsistent ? 'bg-amber-50/50' : ''}`}>
                          <td className="px-6 py-4 font-medium text-slate-700">{formatDate(punch.date)}</td>
                          <td className="px-6 py-4 text-slate-600">{punch.inTime}</td>
                        <td className="px-6 py-4 text-slate-600">{punch.outTime || 'N/A'}</td>
                        <td className={`px-6 py-4 text-right font-mono ${punch.isIgnored ? 'text-slate-400 line-through' : ''}`}>
                          {punch.hours.toFixed(2)}
                        </td>
                        <td className={`px-6 py-4 text-right font-bold ${punch.isIgnored ? 'text-slate-400' : 'text-slate-900'}`}>
                          ${(punch.hours * row.hourlyRate).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          {punch.isManualEntry ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-indigo-600 font-bold text-[10px] uppercase tracking-tight">
                                <Plus size={14} />
                                Added by Paymaster
                              </div>
                              <div className="text-[10px] text-slate-500 italic leading-tight">
                                {punch.comment}
                              </div>
                            </div>
                          ) : punch.isIgnored ? (
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
