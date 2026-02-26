
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Upload, 
  FileText, 
  LogOut, 
  ShieldCheck, 
  Wallet, 
  Info,
  Menu,
  X,
  ChevronRight,
  Clock,
  Sparkles,
  Receipt
} from 'lucide-react';
import { User, UserRole, TimeClockEntry } from './types';
import Login from './components/Login';
import EmployeeManager from './components/EmployeeManager';
import PayrollUploader from './components/PayrollUploader';
import PaysheetReview from './components/PaysheetReview';
import PunchAudit from './components/PunchAudit';
import TimeclockCleaner from './components/TimeclockCleaner';
import PayslipGenerator from './components/PayslipGenerator';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'rates' | 'upload' | 'review' | 'audit' | 'cleaner' | 'payslips'>('cleaner');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cleanedData, setCleanedData] = useState<TimeClockEntry[]>([]);

  // Initialize view based on role
  useEffect(() => {
    if (user) {
      if (user.role === UserRole.PAYMASTER) {
        setActiveTab('review');
      } else {
        setActiveTab('cleaner');
      }
    }
  }, [user]);

  const handleLogout = () => {
    setUser(null);
    setIsSidebarOpen(false);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'cleaner':
        return (
          <TimeclockCleaner 
            onCleaned={(data) => {
              setCleanedData(data);
              setActiveTab('upload');
            }} 
          />
        );
      case 'rates':
        return <EmployeeManager />;
      case 'upload':
        return <PayrollUploader preLoadedData={cleanedData} onGenerated={() => setActiveTab('review')} />;
      case 'review':
        return (
          <PaysheetReview 
            isReadOnly={user.role === UserRole.PAYMASTER} 
            onNavigateToPayslips={() => setActiveTab('payslips')}
          />
        );
      case 'audit':
        return <PunchAudit user={user} />;
      case 'payslips':
        return <PayslipGenerator />;
      default:
        return null;
    }
  };

  const navItems = [
    { 
      id: 'cleaner', 
      label: 'Raw Import', 
      icon: Sparkles, 
      roles: [UserRole.ADMIN],
      description: 'Clean raw timeclock data'
    },
    { 
      id: 'upload', 
      label: 'Upload & Process', 
      icon: Upload, 
      roles: [UserRole.ADMIN],
      description: 'Import Excel timeclock data'
    },
    { 
      id: 'rates', 
      label: 'Pay Rates', 
      icon: Users, 
      roles: [UserRole.ADMIN],
      description: 'Manage employee database'
    },
    { 
      id: 'review', 
      label: 'Paysheet Review', 
      icon: FileText, 
      roles: [UserRole.ADMIN, UserRole.PAYMASTER],
      description: 'View and export generated sheets'
    },
    { 
      id: 'audit', 
      label: 'Punch Audit', 
      icon: Clock, 
      roles: [UserRole.ADMIN, UserRole.PAYMASTER],
      description: 'Detailed timeclock verification'
    },
    { 
      id: 'payslips', 
      label: 'Payslips', 
      icon: Receipt, 
      roles: [UserRole.ADMIN, UserRole.PAYMASTER],
      description: 'Generate employee payslips'
    }
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex-1 flex justify-center overflow-hidden">
              <img 
                src="https://lh3.googleusercontent.com/d/1fg2BABmvaRKwLov5mdubhuWFCn-9wjnZ" 
                alt="Atherlys Logo" 
                className="w-full h-auto max-h-20 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <button className="lg:hidden text-slate-400 ml-4" onClick={() => setIsSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Main Menu
            </div>
            {filteredNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setIsSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                  ${activeTab === item.id 
                    ? 'bg-emerald-50 text-emerald-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                `}
              >
                <item.icon size={20} className={activeTab === item.id ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'} />
                <div className="text-left">
                  <div className="text-sm">{item.label}</div>
                </div>
                {activeTab === item.id && <ChevronRight size={16} className="ml-auto" />}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{user.username}</div>
                  <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">{user.role}</div>
                </div>
              </div>
            </div>
            <div className="px-4 mb-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Version</div>
              <div className="text-xs text-slate-500">v.Feb 22, 2026</div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Log Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 lg:px-8">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-slate-500" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-semibold text-slate-800">
              {filteredNavItems.find(n => n.id === activeTab)?.label}
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-4 text-slate-400">
            {/* Fix: Wrapped Info icon with span to handle the title tooltip */}
            <span title="Local Access: Connect via IP">
              <Info size={18} className="cursor-help" />
            </span>
            <div className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">Local Server Ready</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
