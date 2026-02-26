
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { Employee } from '../types';
// Fix: Added Users to the lucide-react import list
import { Plus, Search, Trash2, Edit3, Save, X, AlertCircle, Users } from 'lucide-react';

const EmployeeManager: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    employeeNumber: '',
    alias: '',
    firstName: '',
    lastName: '',
    hourlyRate: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = storageService.getEmployees();
    // Normalize old data if necessary
    const normalized = stored.map(e => ({
      ...e,
      alias: e.alias || (e as any).name || '',
      firstName: e.firstName || (e as any).name || '',
      lastName: e.lastName || ''
    }));
    setEmployees(normalized);
  }, []);

  // Auto-fill Alias from latest paysheet if employee number matches
  useEffect(() => {
    if (formData.employeeNumber && !formData.alias && !editingId) {
      const latestPaysheet = storageService.getPaysheets()[0];
      if (latestPaysheet) {
        const row = latestPaysheet.rows.find(r => r.employeeNumber === formData.employeeNumber);
        if (row) {
          setFormData(prev => ({ ...prev, alias: row.employeeName }));
        }
      }
    }
  }, [formData.employeeNumber, editingId]);

  const validate = () => {
    if (!formData.employeeNumber || !formData.alias || !formData.firstName || !formData.lastName || !formData.hourlyRate) {
      setError('All fields are mandatory');
      return false;
    }
    const rate = parseFloat(formData.hourlyRate);
    if (isNaN(rate) || rate <= 0) {
      setError('Hourly rate must be a valid number greater than 0');
      return false;
    }
    
    const existing = employees.find(e => e.employeeNumber === formData.employeeNumber && e.id !== editingId);
    if (existing) {
      setError('Employee Number must be unique');
      return false;
    }

    setError('');
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;

    let updatedEmployees: Employee[];
    const employeeData: Employee = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      employeeNumber: formData.employeeNumber,
      alias: formData.alias,
      firstName: formData.firstName,
      lastName: formData.lastName,
      hourlyRate: parseFloat(formData.hourlyRate),
      lastUpdated: new Date().toISOString()
    };

    if (editingId) {
      updatedEmployees = employees.map(e => e.id === editingId ? employeeData : e);
    } else {
      updatedEmployees = [...employees, employeeData];
    }

    setEmployees(updatedEmployees);
    storageService.saveEmployees(updatedEmployees);
    setIsSaved(true);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    resetForm();
  };

  const handleManualSave = () => {
    storageService.saveEmployees(employees);
    setIsSaved(true);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee? This will affect future calculations.')) {
      const updated = employees.filter(e => e.id !== id);
      setEmployees(updated);
      storageService.saveEmployees(updated);
      setIsSaved(true);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const resetForm = () => {
    setFormData({ employeeNumber: '', alias: '', firstName: '', lastName: '', hourlyRate: '' });
    setIsAdding(false);
    setEditingId(null);
    setError('');
  };

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setFormData({
      employeeNumber: emp.employeeNumber,
      alias: emp.alias,
      firstName: emp.firstName,
      lastName: emp.lastName,
      hourlyRate: emp.hourlyRate.toString()
    });
    setIsAdding(true);
  };

  const filteredEmployees = employees.filter(e => 
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.employeeNumber.includes(searchTerm)
  );

  const latestPaysheet = storageService.getPaysheets()[0];
  const missingEmployees = latestPaysheet?.rows.filter(r => r.status === 'missing_rate') || [];
  // Deduplicate missing employees by ID
  const uniqueMissing = Array.from(new Map(missingEmployees.map(m => [m.employeeNumber, m])).values());
  // Filter out those already in the database
  const trulyMissing = uniqueMissing.filter(m => !employees.some(e => e.employeeNumber === m.employeeNumber));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Employee Pay Database</h3>
          <p className="text-slate-500">Manage master rates and records</p>
        </div>
        <div className="flex items-center gap-3">
          {showSuccess && (
            <div className="text-green-600 text-sm font-bold flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
              <Save size={14} />
              Changes Saved
            </div>
          )}
          <button 
            onClick={handleManualSave}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${isSaved ? 'bg-slate-100 text-slate-400 cursor-default' : 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-100'}`}
            disabled={isSaved}
          >
            <Save size={18} />
            {isSaved ? 'Saved' : 'Save Changes'}
          </button>
          {!isAdding && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
            >
              <Plus size={18} />
              Add Employee
            </button>
          )}
        </div>
      </div>

      {trulyMissing.length > 0 && !isAdding && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">Unrecognized Employees Found</h4>
              <p className="text-xs text-amber-700">The last upload contains employees not in your database.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {trulyMissing.map(m => (
              <button
                key={m.employeeNumber}
                onClick={() => {
                  setIsAdding(true);
                  setFormData({
                    employeeNumber: m.employeeNumber,
                    alias: m.employeeName,
                    firstName: '',
                    lastName: '',
                    hourlyRate: ''
                  });
                }}
                className="px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-bold text-amber-700 hover:bg-amber-100 transition-all flex items-center gap-2"
              >
                <Plus size={12} />
                Add {m.employeeName} ({m.employeeNumber})
              </button>
            ))}
          </div>
        </div>
      )}

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl border-2 border-emerald-100 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold text-slate-900">
              {editingId ? 'Edit Employee Details' : 'Register New Employee'}
            </h4>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">ID Number</label>
              <input
                type="text"
                value={formData.employeeNumber}
                onChange={e => setFormData({...formData, employeeNumber: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                placeholder="EMP-001"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Alias (from file)</label>
              <input
                type="text"
                value={formData.alias}
                onChange={e => setFormData({...formData, alias: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                placeholder="Jane D"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={e => setFormData({...formData, firstName: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                placeholder="Jane"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Surname</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={e => setFormData({...formData, lastName: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                placeholder="Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Hourly Rate ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.hourlyRate}
                onChange={e => setFormData({...formData, hourlyRate: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                placeholder="25.00"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-all"
            >
              <Save size={18} />
              {editingId ? 'Update Record' : 'Save Employee'}
            </button>
            <button 
              onClick={resetForm}
              className="px-6 py-2.5 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or employee number..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none bg-white"
            />
          </div>
          <div className="text-sm font-medium text-slate-500">
            {filteredEmployees.length} Total Records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Employee ID</th>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Alias</th>
                <th className="px-6 py-4 text-right">Hourly Rate</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded text-slate-600">{emp.employeeNumber}</span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{emp.firstName} {emp.lastName}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{emp.alias}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-emerald-600 font-bold">${emp.hourlyRate.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 transition-opacity">
                      <button 
                        onClick={() => startEdit(emp)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Edit Employee"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(emp.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete Employee"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Users size={48} className="mb-4 opacity-20" />
                      <p className="text-lg font-medium">No employees found</p>
                      <p className="text-sm">Add your first employee to start payroll processing</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeManager;
