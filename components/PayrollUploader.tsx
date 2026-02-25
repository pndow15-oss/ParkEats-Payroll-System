
import React, { useState, useRef } from 'react';
import { storageService } from '../services/storage';
import { TimeClockEntry, Paysheet, PaysheetRow, Employee } from '../types';
import { NIS_TABLE_2026, calculateNISContribution } from '../constants';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Calculator, Info, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface PayrollUploaderProps {
  onGenerated: () => void;
  preLoadedData?: TimeClockEntry[];
}

const PayrollUploader: React.FC<PayrollUploaderProps> = ({ onGenerated, preLoadedData }) => {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<TimeClockEntry[]>(preLoadedData || []);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync data if preLoadedData changes
  React.useEffect(() => {
    if (preLoadedData && preLoadedData.length > 0) {
      setData(preLoadedData);
    }
  }, [preLoadedData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setError('Only Excel files (.xlsx, .xls) are supported');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      parseExcel(selectedFile);
    }
  };

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bstr = e.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const json = XLSX.utils.sheet_to_json(ws) as any[];

        // Map and Validate Columns
        const rawJson = json as any[];
        const aggregatedMap = new Map<string, TimeClockEntry>();

        rawJson.forEach((row, index) => {
          const employeeName = row['Employee Name'] || row['Name'];
          const employeeNumber = (row['Employee Number'] || row['ID'] || row['Employee ID'])?.toString();
          
          // Try to get punch details
          const date = row['Date'] || row['Work Date'];
          const inTime = row['In'] || row['Punch In'] || row['Start Time'];
          const outTime = row['Out'] || row['Punch Out'] || row['End Time'];
          
          let hoursWorked = parseFloat(row['Hours Worked'] || row['Hours'] || '0');
          
          // If we have in/out but no hours, try to calculate
          if (isNaN(hoursWorked) || hoursWorked === 0) {
            if (inTime && outTime) {
              // Simple time diff if they are strings like "08:00"
              // For a real app, we'd use a robust date-time parser
              // Here we'll assume standard formats or just trust the 'Hours' column if present
            }
          }

          const weekIdentifier = row['Week Number'] || row['Week Date'] || row['Date'] || 'N/A';

          if (!employeeName || !employeeNumber) {
            return; // Skip invalid rows
          }

          const key = employeeNumber;
          
          if (!aggregatedMap.has(key)) {
            aggregatedMap.set(key, {
              employeeName,
              employeeNumber,
              hoursWorked: 0,
              weekIdentifier: weekIdentifier.toString(),
              punches: []
            });
          }

          const entry = aggregatedMap.get(key)!;
          entry.hoursWorked += isNaN(hoursWorked) ? 0 : hoursWorked;
          
          if (date && inTime && outTime) {
            const punchHours = isNaN(hoursWorked) ? 0 : hoursWorked;
            
            // Basic inconsistency check: if hours > 14 in a single punch or negative
            const inconsistent = punchHours > 14 || punchHours < 0;
            const comment = inconsistent ? 'Manual recheck recommended: Unusual shift duration.' : undefined;

            entry.punches?.push({
              date: date.toString(),
              inTime: inTime.toString(),
              outTime: outTime.toString(),
              hours: punchHours,
              inconsistent,
              comment
            });
          }
        });

        const mappedData = Array.from(aggregatedMap.values());

        if (mappedData.length === 0) {
          throw new Error("No valid employee data found in the Excel file.");
        }

        setData(mappedData);
        setPreviewOpen(true);
      } catch (err: any) {
        setError(err.message || 'Error parsing Excel file. Ensure columns match requirements.');
        setData([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const calculateNIS = (gross: number): number => {
    return calculateNISContribution(gross);
  };

  const generatePayroll = async () => {
    if (data.length === 0) return;
    setIsProcessing(true);
    
    // Artificial delay for feedback
    await new Promise(resolve => setTimeout(resolve, 800));

    const masterRates = storageService.getEmployees();
    const rows: PaysheetRow[] = data.map(entry => {
      const rateInfo = masterRates.find(r => r.employeeNumber === entry.employeeNumber);
      
      let status: 'valid' | 'missing_rate' | 'anomaly' = 'valid';
      let warningMessage = undefined;

      if (!rateInfo) {
        status = 'missing_rate';
        warningMessage = 'No pay rate found in database';
      } else if (entry.hoursWorked > 60) {
        status = 'anomaly';
        warningMessage = 'Unusually high hours reported';
      }

      const hourlyRate = rateInfo ? rateInfo.hourlyRate : 0;
      const amountToPay = entry.hoursWorked * hourlyRate;
      const nisDeduction = calculateNIS(amountToPay);
      const netPay = amountToPay - nisDeduction;

      return {
        ...entry,
        hourlyRate,
        amountToPay,
        nisDeduction,
        netPay,
        status,
        warningMessage
      };
    });

    const totalHours = rows.reduce((acc, curr) => acc + curr.hoursWorked, 0);
    const totalAmount = rows.reduce((acc, curr) => acc + curr.amountToPay, 0);

    const newPaysheet: Paysheet = {
      id: Math.random().toString(36).substr(2, 9),
      generationDate: new Date().toISOString(),
      weekIdentifier: data[0]?.weekIdentifier || 'N/A',
      rows,
      totalHours,
      totalAmount,
      generatedBy: 'Administrator'
    };

    storageService.savePaysheet(newPaysheet);
    setIsProcessing(false);
    onGenerated();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Step 1: Upload Timeclock Data</h3>
            <p className="text-slate-500">Import your weekly time tracking Excel file</p>
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
              accept=".xlsx,.xls" 
            />
            
            <div className="flex flex-col items-center justify-center text-center">
              <div className={`
                w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all
                ${file ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 group-hover:text-emerald-500 group-hover:bg-emerald-50'}
              `}>
                <FileSpreadsheet size={32} />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-1">
                {file ? file.name : 'Click to select Excel file'}
              </h4>
              <p className="text-sm text-slate-500">
                Supports .xlsx and .xls formats
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <h5 className="flex items-center gap-2 font-bold text-slate-800 mb-4">
              <Info size={18} className="text-emerald-500" />
              Column Requirements
            </h5>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5"></div>
                <span><strong>Employee Name:</strong> Full name of the staff member</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5"></div>
                <span><strong>Employee Number:</strong> Unique ID for database matching</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5"></div>
                <span><strong>Hours Worked:</strong> Numeric value (e.g., 40.5)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5"></div>
                <span><strong>Week Date/Number:</strong> Reference for the pay period</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="w-full md:w-80 space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Calculator className="text-emerald-400" />
              Process Ready
            </h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Status</span>
                <span className={`font-bold ${file ? 'text-green-400' : 'text-slate-500'}`}>
                  {file ? 'File Loaded' : 'Waiting...'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Entries</span>
                <span className="font-bold text-white">{data.length}</span>
              </div>
            </div>

            <button
              disabled={(data.length === 0 && !file) || isProcessing}
              onClick={generatePayroll}
              className={`
                w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all
                ${(data.length === 0 && !file) 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 shadow-lg shadow-emerald-600/20'}
              `}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator size={20} />
                  Generate Paysheet
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

          {data.length > 0 && !error && (
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white">
                <CheckCircle2 />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Validation Passed</p>
                <p className="text-sm font-semibold text-emerald-900">Data is ready for calculation.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollUploader;
