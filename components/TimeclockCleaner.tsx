
import React, { useState, useRef } from 'react';
import { FileSpreadsheet, Sparkles, ArrowRight, AlertCircle, CheckCircle2, Loader2, Info, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CleanedPayrollRow } from '../types';

interface TimeclockCleanerProps {
  onCleaned: (data: CleanedPayrollRow[]) => void;
}

const TimeclockCleaner: React.FC<TimeclockCleanerProps> = ({ onCleaned }) => {
  const [file, setFile] = useState<File | null>(null);
  const [cleanedData, setCleanedData] = useState<CleanedPayrollRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      processFile(selectedFile);
    }
  };

  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  };

  const getISOWeek = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bstr = e.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        // Find the "Logs" sheet specifically
        const logsSheetName = wb.SheetNames.find(name => name.toLowerCase() === 'logs');
        if (!logsSheetName) {
          throw new Error("Could not find a tab labelled 'Logs' in the uploaded file.");
        }
        
        const ws = wb.Sheets[logsSheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        // 1. Extract Duration and Week Info
        let durationStr = "";
        for (const row of rows) {
          if (row[0] === "Duration:") {
            durationStr = row[2] || "";
            break;
          }
        }

        if (!durationStr) throw new Error("Could not find 'Duration:' header in file.");

        // Format: "2026/01/23 ~ 01/31 ( atherlys )"
        const dateMatch = durationStr.match(/(\d{4}\/\d{2}\/\d{2})\s*~\s*(\d{2}\/\d{2})/);
        if (!dateMatch) throw new Error("Invalid Duration format.");

        const startDateStr = dateMatch[1]; // 2026/01/23
        const endDatePart = dateMatch[2]; // 01/31
        
        const startDate = new Date(startDateStr);
        const endDate = new Date(startDate.getFullYear(), parseInt(endDatePart.split('/')[0]) - 1, parseInt(endDatePart.split('/')[1]));
        
        const weekNumber = getISOWeek(endDate);
        const weekEndingDateStr = `${endDate.getDate().toString().padStart(2, '0')}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}/${endDate.getFullYear()}`;

        // 2. Find Date Header Row (the one with numbers like 23, 24...)
        let dateHeaderRowIndex = -1;
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].some(cell => typeof cell === 'number' || (typeof cell === 'string' && /^\d+$/.test(cell)))) {
            dateHeaderRowIndex = i;
            break;
          }
        }

        if (dateHeaderRowIndex === -1) throw new Error("Could not find date header row.");
        const dateHeaders = rows[dateHeaderRowIndex];

        // 3. Process Employees
        const results: CleanedPayrollRow[] = [];
        
        for (let i = dateHeaderRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (row[0] === "No:") {
            const employeeNumber = row[2]?.toString() || "";
            const employeeName = row[10]?.toString() || ""; // Based on CSV structure
            const punchRow = rows[i + 1];
            
            if (!punchRow) continue;

            let totalHours = 0;
            let flags: string[] = [];
            let allPunches: any[] = [];

            // Process day by day
            const dailyPunches: string[][] = [];
            const dayDates: string[] = [];
            
            // Map date headers to actual dates if possible, or just use the header
            for (let j = 0; j < dateHeaders.length; j++) {
              if (dateHeaders[j]) {
                const cellContent = punchRow[j]?.toString() || "";
                const punches = cellContent.split(/[\n\s]+/).filter(p => p.trim() !== "");
                dailyPunches.push(punches);
                
                // Construct date string for the punch
                const dayNum = dateHeaders[j].toString().padStart(2, '0');
                const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
                const year = startDate.getFullYear();
                dayDates.push(`${dayNum}/${month}/${year}`);
              }
            }

            let pendingClockIn: { time: number, timeStr: string, date: string } | null = null;

            for (let d = 0; d < dailyPunches.length; d++) {
              const punches = dailyPunches[d];
              const currentDate = dayDates[d];
              let pIdx = 0;

              // Rule: If first punch <= 04:00, it's an OUT for a pending clock-in
              if (punches.length > 0) {
                const firstPunchTimeStr = punches[0];
                const firstPunchTime = parseTime(firstPunchTimeStr);
                
                if (firstPunchTime <= 4) {
                  if (pendingClockIn !== null) {
                    let outTime = firstPunchTime;
                    if (outTime < pendingClockIn.time) outTime += 24;
                    const duration = outTime - pendingClockIn.time;
                    
                    if (duration > 18) {
                      flags.push("Invalid Shift");
                      allPunches.push({
                        date: pendingClockIn.date,
                        inTime: pendingClockIn.timeStr,
                        outTime: firstPunchTimeStr,
                        hours: 0,
                        isIgnored: true,
                        comment: "Invalid Shift - Review (>18h)"
                      });
                    } else {
                      totalHours += duration;
                      allPunches.push({
                        date: pendingClockIn.date,
                        inTime: pendingClockIn.timeStr,
                        outTime: firstPunchTimeStr,
                        hours: parseFloat(duration.toFixed(2))
                      });
                    }
                    pendingClockIn = null;
                  } else {
                    // Unpaired OUT before 04:00
                    allPunches.push({
                      date: currentDate,
                      inTime: "N/A",
                      outTime: firstPunchTimeStr,
                      hours: 0,
                      isIgnored: true,
                      comment: "Ignored: Unpaired OUT <= 04:00"
                    });
                  }
                  pIdx = 1; // Move to next punch
                } else {
                  // If we had a pending clock-in but the first punch today is > 04:00,
                  // the previous shift was incomplete
                  if (pendingClockIn !== null) {
                    flags.push("Incomplete Shift");
                    allPunches.push({
                      date: pendingClockIn.date,
                      inTime: pendingClockIn.timeStr,
                      outTime: "MISSING",
                      hours: 0,
                      isIgnored: true,
                      comment: "Incomplete Shift - Review"
                    });
                    pendingClockIn = null;
                  }
                }
              } else if (pendingClockIn !== null) {
                // No punches today, but we had a pending clock-in
                // Check if this is the last day
                if (d === dailyPunches.length - 1) {
                   flags.push("Incomplete Shift");
                   allPunches.push({
                     date: pendingClockIn.date,
                     inTime: pendingClockIn.timeStr,
                     outTime: "MISSING",
                     hours: 0,
                     isIgnored: true,
                     comment: "Incomplete Shift - Review"
                   });
                   pendingClockIn = null;
                }
              }

              // Process remaining punches for the day
              while (pIdx < punches.length) {
                const inTimeStr = punches[pIdx++];
                const inTime = parseTime(inTimeStr);
                
                if (pIdx < punches.length) {
                  const outTimeStr = punches[pIdx++];
                  let outTime = parseTime(outTimeStr);
                  
                  if (outTime < inTime) outTime += 24;
                  const duration = outTime - inTime;
                  
                  if (duration > 18) {
                    flags.push("Invalid Shift");
                    allPunches.push({
                      date: currentDate,
                      inTime: inTimeStr,
                      outTime: outTimeStr,
                      hours: 0,
                      isIgnored: true,
                      comment: "Invalid Shift - Review (>18h)"
                    });
                  } else {
                    totalHours += duration;
                    allPunches.push({
                      date: currentDate,
                      inTime: inTimeStr,
                      outTime: outTimeStr,
                      hours: parseFloat(duration.toFixed(2))
                    });
                  }
                } else {
                  // Unpaired punch at the end of the day
                  // Check next day's first punch
                  const nextDayPunches = dailyPunches[d + 1];
                  if (nextDayPunches && nextDayPunches.length > 0) {
                    const nextFirst = parseTime(nextDayPunches[0]);
                    if (nextFirst <= 4) {
                      // Will be handled in the next day's iteration
                      pendingClockIn = { time: inTime, timeStr: inTimeStr, date: currentDate };
                    } else {
                      flags.push("Incomplete Shift");
                      allPunches.push({
                        date: currentDate,
                        inTime: inTimeStr,
                        outTime: "MISSING",
                        hours: 0,
                        isIgnored: true,
                        comment: "Incomplete Shift - Review"
                      });
                    }
                  } else {
                    flags.push("Incomplete Shift");
                    allPunches.push({
                      date: currentDate,
                      inTime: inTimeStr,
                      outTime: "MISSING",
                      hours: 0,
                      isIgnored: true,
                      comment: "Incomplete Shift - Review"
                    });
                  }
                }
              }
            }

            // Final check for pending clock-in
            if (pendingClockIn !== null) {
               flags.push("Incomplete Shift");
               allPunches.push({
                 date: pendingClockIn.date,
                 inTime: pendingClockIn.timeStr,
                 outTime: "MISSING",
                 hours: 0,
                 isIgnored: true,
                 comment: "Incomplete Shift - Review"
               });
            }

            const uniqueFlags = Array.from(new Set(flags));
            
            results.push({
              employeeName,
              employeeNumber,
              hoursWorked: parseFloat(totalHours.toFixed(2)),
              weekIdentifier: weekNumber.toString(),
              weekEndingDate: weekEndingDateStr,
              comments: uniqueFlags.length > 0 ? `${uniqueFlags.join(" - ")} - Review` : "",
              punches: allPunches
            });

            i++; // Skip the punch row
          }
        }

        setCleanedData(results);
        setIsProcessing(false);
      } catch (err: any) {
        setError(err.message || "Failed to process file. Please check the format.");
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleProceed = () => {
    onCleaned(cleanedData);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Raw Timeclock Cleaning</h3>
            <p className="text-slate-500">Upload the raw export from your restaurant system to transform it into payroll-ready data.</p>
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative group cursor-pointer p-10 border-2 border-dashed rounded-3xl transition-all
              ${file ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'}
            `}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv" 
            />
            
            <div className="flex flex-col items-center justify-center text-center">
              <div className={`
                w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all
                ${file ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 group-hover:text-emerald-500 group-hover:bg-emerald-50'}
              `}>
                <Sparkles size={32} />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-1">
                {file ? file.name : 'Select Raw Export File'}
              </h4>
              <p className="text-sm text-slate-500">
                Supports .xlsx, .xls, and .csv formats
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <h5 className="flex items-center gap-2 font-bold text-slate-800 mb-4">
              <Info size={18} className="text-emerald-500" />
              Cleaning Logic Applied
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 mb-1">04:00 Rollover Rule</p>
                Punches before 4 AM are attributed to the previous day's shift.
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 mb-1">Midnight Shifts</p>
                Automatically pairs late-night clock-ins with early-morning clock-outs.
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 mb-1">Anomaly Detection</p>
                Flags shifts longer than 18 hours or incomplete punch pairs.
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 mb-1">ISO Week Mapping</p>
                Derives correct payroll week number from the report duration.
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-96 space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-400" />
              Cleaned Results
            </h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Employees Processed</span>
                <span className="font-bold text-white">{cleanedData.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Total Hours</span>
                <span className="font-bold text-white">
                  {cleanedData.reduce((acc, curr) => acc + curr.hoursWorked, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Anomalies Found</span>
                <span className={`font-bold ${cleanedData.some(d => d.comments) ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {cleanedData.filter(d => d.comments).length}
                </span>
              </div>
            </div>

            <button
              disabled={cleanedData.length === 0 || isProcessing}
              onClick={handleProceed}
              className={`
                w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all
                ${cleanedData.length === 0 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 shadow-lg shadow-emerald-600/20'}
              `}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Cleaning Data...
                </>
              ) : (
                <>
                  <ArrowRight size={20} />
                  Proceed to Payroll
                </>
              )}
            </button>
            
            {error && (
              <div className="mt-4 p-4 bg-red-900/30 border border-red-900/50 rounded-2xl text-red-200 text-xs flex gap-2">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {cleanedData.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h4 className="text-lg font-bold text-slate-900">Transformed Payroll Table</h4>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Week {cleanedData[0].weekIdentifier} | Ending {cleanedData[0].weekEndingDate}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Employee Name</th>
                  <th className="px-6 py-4">Employee Number</th>
                  <th className="px-6 py-4 text-right">Hours Worked</th>
                  <th className="px-6 py-4">Comments/Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cleanedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{row.employeeName}</td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-500">{row.employeeNumber}</td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600">{row.hoursWorked.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      {row.comments ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase">
                          <AlertCircle size={12} />
                          {row.comments}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs italic">Clean</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeclockCleaner;
