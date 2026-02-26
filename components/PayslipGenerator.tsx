
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { Paysheet, PaysheetRow } from '../types';
import { 
  FileText, 
  ChevronDown, 
  Search, 
  Printer, 
  Download, 
  User, 
  Calendar, 
  Wallet,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Hash,
  Clock,
  DollarSign,
  ShieldCheck
} from 'lucide-react';

const PayslipGenerator: React.FC = () => {
  const [paysheets, setPaysheets] = useState<Paysheet[]>([]);
  const [selectedPaysheet, setSelectedPaysheet] = useState<Paysheet | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [viewingSlip, setViewingSlip] = useState<PaysheetRow | null>(null);

  useEffect(() => {
    const history = storageService.getPaysheets();
    setPaysheets(history);
    if (history.length > 0) {
      setSelectedPaysheet(history[0]);
    }
  }, []);

  const toggleSelection = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (!selectedPaysheet) return;
    if (selectedRows.length === selectedPaysheet.rows.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(selectedPaysheet.rows.map(r => r.employeeNumber));
    }
  };

  const handlePrintBatch = () => {
    if (selectedRows.length === 0) return;
    window.print();
  };

  const filteredRows = selectedPaysheet?.rows.filter(row => 
    row.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.employeeNumber.includes(searchTerm)
  ) || [];

  if (!selectedPaysheet) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <FileText size={64} className="mb-6 opacity-20" />
        <h3 className="text-xl font-bold">No Paysheets Found</h3>
        <p className="max-w-xs text-center mt-2">Generate a paysheet first to create employee payslips.</p>
      </div>
    );
  }

  if (viewingSlip) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
        <button 
          onClick={() => setViewingSlip(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium"
        >
          <ArrowLeft size={18} />
          Back to Selection
        </button>

        <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Payslip Preview</h3>
            <p className="text-sm text-slate-500">Reviewing payslip for {viewingSlip.employeeName}</p>
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 font-bold transition-all shadow-lg shadow-emerald-200"
          >
            <Printer size={18} />
            Print / Save as PDF
          </button>
        </div>

        {/* PAYSLIP PREVIEW CARD */}
        <div className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-2xl rounded-sm overflow-hidden p-8 slip-container">
          <div className="flex justify-between items-start border-b border-slate-900 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center overflow-hidden p-1">
                <img 
                  src="https://picsum.photos/seed/atherlys/100/100" 
                  alt="Atherlys" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h1 className="text-lg font-black uppercase tracking-tighter leading-none">Atherlys</h1>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Local Payroll Pro</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">Weekly Payslip</h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Week Ending: {viewingSlip.weekEndingDate || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8 mb-6">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Employee Details</label>
              <p className="text-sm font-bold text-slate-900">{viewingSlip.employeeName}</p>
              <p className="text-xs font-mono text-slate-500">ID: {viewingSlip.employeeNumber}</p>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Pay Period</label>
              <p className="text-sm font-bold text-slate-900">Week {viewingSlip.weekIdentifier}</p>
              <p className="text-xs text-slate-500">Ending: {viewingSlip.weekEndingDate}</p>
            </div>
            <div className="text-right">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Payment Date</label>
              <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-6">
            <div className="border border-slate-100 rounded-lg overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="text-left px-3 py-2">Earnings</th>
                    <th className="text-right px-3 py-2">Rate</th>
                    <th className="text-right px-3 py-2">Qty</th>
                    <th className="text-right px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <tr>
                    <td className="px-3 py-2 font-bold text-slate-700">Basic Pay</td>
                    <td className="px-3 py-2 text-right text-slate-500">${viewingSlip.hourlyRate.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{viewingSlip.hoursWorked.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900">${viewingSlip.amountToPay.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="border border-slate-100 rounded-lg overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="text-left px-3 py-2">Deductions</th>
                    <th className="text-right px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <tr>
                    <td className="px-3 py-2 font-bold text-slate-700">NIS Contribution</td>
                    <td className="px-3 py-2 text-right font-bold text-red-600">-${viewingSlip.nisDeduction.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-400 italic">No other deductions</td>
                    <td className="px-3 py-2 text-right text-slate-400">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-lg">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Net Pay to be Paid</p>
              <p className="text-xs text-slate-300 italic">Direct Deposit / Cash</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black tracking-tighter text-emerald-400">${viewingSlip.netPay.toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-6 flex justify-between items-center opacity-40">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Authorized Payroll Record</p>
            <div className="flex gap-4">
              <ShieldCheck size={16} />
              <Building2 size={16} />
            </div>
          </div>
        </div>

        {/* PRINT ONLY VERSION (HIDDEN IN UI) */}
        <div className="hidden print:block print-only">
           <div className="slip-print-page">
              <div className="landscape-slip border border-slate-300 p-8 h-[5.2in] flex flex-col justify-between bg-white overflow-hidden">
                <div className="flex justify-between border-b border-slate-900 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white border border-slate-100 rounded flex items-center justify-center overflow-hidden p-0.5">
                      <img 
                        src="https://picsum.photos/seed/atherlys/100/100" 
                        alt="Atherlys" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <h1 className="text-base font-black uppercase tracking-tighter leading-none">Atherlys</h1>
                      <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Local Payroll Pro</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Weekly Payslip</h2>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Week Ending: {viewingSlip.weekEndingDate}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 my-4">
                  <div>
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Employee</label>
                    <p className="text-xs font-bold text-slate-900">{viewingSlip.employeeName}</p>
                    <p className="text-[10px] font-mono text-slate-500">ID: {viewingSlip.employeeNumber}</p>
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Period</label>
                    <p className="text-xs font-bold text-slate-900">Week {viewingSlip.weekIdentifier}</p>
                  </div>
                  <div className="text-right">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Payment Date</label>
                    <p className="text-xs font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 flex-1">
                  <div className="border border-slate-100 rounded overflow-hidden h-fit">
                    <table className="w-full text-[10px]">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">
                          <th className="text-left px-2 py-1">Earnings</th>
                          <th className="text-right px-2 py-1">Rate</th>
                          <th className="text-right px-2 py-1">Qty</th>
                          <th className="text-right px-2 py-1">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        <tr>
                          <td className="px-2 py-1 font-bold">Basic Pay</td>
                          <td className="px-2 py-1 text-right">${viewingSlip.hourlyRate.toFixed(2)}</td>
                          <td className="px-2 py-1 text-right">{viewingSlip.hoursWorked.toFixed(2)}</td>
                          <td className="px-2 py-1 text-right font-bold">${viewingSlip.amountToPay.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="border border-slate-100 rounded overflow-hidden h-fit">
                    <table className="w-full text-[10px]">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">
                          <th className="text-left px-2 py-1">Deductions</th>
                          <th className="text-right px-2 py-1">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        <tr>
                          <td className="px-2 py-1 font-bold">NIS Contribution</td>
                          <td className="px-2 py-1 text-right font-bold text-red-600">-${viewingSlip.nisDeduction.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-900 text-white p-3 rounded mt-4">
                  <div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Net Pay to be Paid</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black tracking-tighter text-emerald-400">${viewingSlip.netPay.toFixed(2)}</p>
                  </div>
                </div>
              </div>
           </div>
        </div>
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
              onChange={(e) => {
                setSelectedPaysheet(paysheets.find(p => p.id === e.target.value) || null);
                setSelectedRows([]);
              }}
              className="w-full appearance-none bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer pr-10 text-sm"
            >
              {paysheets.map(p => (
                <option key={p.id} value={p.id}>
                  Week: {p.weekIdentifier} ({new Date(p.generationDate).toLocaleDateString()})
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
            disabled={selectedRows.length === 0}
            onClick={handlePrintBatch}
            className={`
              flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg
              ${selectedRows.length === 0 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'}
            `}
          >
            <Printer size={16} />
            Print Batch ({selectedRows.length})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={selectAll}
              className="w-5 h-5 rounded border border-slate-300 flex items-center justify-center transition-colors hover:border-emerald-500"
            >
              {selectedRows.length === selectedPaysheet.rows.length && (
                <div className="w-3 h-3 bg-emerald-600 rounded-sm" />
              )}
            </button>
            <h4 className="text-lg font-bold text-slate-900">Select Employees for Payslips</h4>
          </div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {selectedRows.length} of {selectedPaysheet.rows.length} Selected
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Gross Pay</th>
                <th className="px-6 py-4">NIS</th>
                <th className="px-6 py-4">Net Pay</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr 
                  key={row.employeeNumber} 
                  className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedRows.includes(row.employeeNumber) ? 'bg-emerald-50/30' : ''}`}
                  onClick={() => toggleSelection(row.employeeNumber)}
                >
                  <td className="px-6 py-4">
                    <div className={`w-5 h-5 rounded border transition-colors flex items-center justify-center ${selectedRows.includes(row.employeeNumber) ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'}`}>
                      {selectedRows.includes(row.employeeNumber) && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{row.employeeName}</div>
                    <div className="text-xs text-slate-500 font-mono">ID: {row.employeeNumber}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700">${row.amountToPay.toFixed(2)}</td>
                  <td className="px-6 py-4 font-semibold text-red-600">-${row.nisDeduction.toFixed(2)}</td>
                  <td className="px-6 py-4 font-bold text-emerald-600">${row.netPay.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingSlip(row);
                      }}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      title="View Payslip"
                    >
                      <FileText size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BATCH PRINT VERSION (HIDDEN IN UI) */}
      <div className="hidden print:block print-only">
        {selectedPaysheet.rows
          .filter(r => selectedRows.includes(r.employeeNumber))
          .reduce((acc: PaysheetRow[][], curr, idx) => {
            const chunkIndex = Math.floor(idx / 2);
            if (!acc[chunkIndex]) acc[chunkIndex] = [];
            acc[chunkIndex].push(curr);
            return acc;
          }, [])
          .map((pair, pageIdx) => (
            <div key={pageIdx} className="slip-print-page h-[11in] flex flex-col justify-start gap-4">
              {pair.map((row, rowIdx) => (
                <div key={rowIdx} className="landscape-slip border border-slate-300 p-8 h-[5.2in] flex flex-col justify-between bg-white overflow-hidden">
                  <div className="flex justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-white border border-slate-100 rounded flex items-center justify-center overflow-hidden p-0.5">
                        <img 
                          src="https://picsum.photos/seed/atherlys/100/100" 
                          alt="Atherlys" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <h1 className="text-base font-black uppercase tracking-tighter leading-none">Atherlys</h1>
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Local Payroll Pro</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Weekly Payslip</h2>
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Week Ending: {row.weekEndingDate}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 my-4">
                    <div>
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Employee</label>
                      <p className="text-xs font-bold text-slate-900">{row.employeeName}</p>
                      <p className="text-[10px] font-mono text-slate-500">ID: {row.employeeNumber}</p>
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Period</label>
                      <p className="text-xs font-bold text-slate-900">Week {row.weekIdentifier}</p>
                    </div>
                    <div className="text-right">
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Payment Date</label>
                      <p className="text-xs font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 flex-1">
                    <div className="border border-slate-100 rounded overflow-hidden h-fit">
                      <table className="w-full text-[10px]">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">
                            <th className="text-left px-2 py-1">Earnings</th>
                            <th className="text-right px-2 py-1">Rate</th>
                            <th className="text-right px-2 py-1">Qty</th>
                            <th className="text-right px-2 py-1">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          <tr>
                            <td className="px-2 py-1 font-bold">Basic Pay</td>
                            <td className="px-2 py-1 text-right">${row.hourlyRate.toFixed(2)}</td>
                            <td className="px-2 py-1 text-right">{row.hoursWorked.toFixed(2)}</td>
                            <td className="px-2 py-1 text-right font-bold">${row.amountToPay.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="border border-slate-100 rounded overflow-hidden h-fit">
                      <table className="w-full text-[10px]">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">
                            <th className="text-left px-2 py-1">Deductions</th>
                            <th className="text-right px-2 py-1">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          <tr>
                            <td className="px-2 py-1 font-bold">NIS Contribution</td>
                            <td className="px-2 py-1 text-right font-bold text-red-600">-${row.nisDeduction.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-900 text-white p-3 rounded mt-4">
                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Net Pay to be Paid</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black tracking-tighter text-emerald-400">${row.netPay.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
};

export default PayslipGenerator;
