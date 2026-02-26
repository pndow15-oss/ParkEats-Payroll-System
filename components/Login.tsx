
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Lock, User as UserIcon, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter all credentials');
      return;
    }

    // Standard business simulation: any password works for demo, 
    // but in production, this would be validated against a local salt/hash
    onLogin({
      id: Math.random().toString(36).substr(2, 9),
      username,
      role
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-5xl mb-4 flex flex-col items-center">
        <img 
          src="https://lh3.googleusercontent.com/d/1fg2BABmvaRKwLov5mdubhuWFCn-9wjnZ" 
          alt="Atherlys Logo" 
          className="w-2/3 h-auto max-h-48 object-contain"
          referrerPolicy="no-referrer"
        />
        <p className="text-slate-500 mt-4 font-bold uppercase tracking-widest text-sm">Local Payroll Pro v.Feb 26, 2026</p>
      </div>

      <div className="max-w-md w-full">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Login Role</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole(UserRole.ADMIN)}
                  className={`py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                    role === UserRole.ADMIN 
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700' 
                    : 'border-slate-100 text-slate-500 hover:border-slate-200'
                  }`}
                >
                  <Lock size={20} />
                  <span className="text-xs font-bold uppercase tracking-wider">Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole(UserRole.PAYMASTER)}
                  className={`py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                    role === UserRole.PAYMASTER 
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700' 
                    : 'border-slate-100 text-slate-500 hover:border-slate-200'
                  }`}
                >
                  <UserIcon size={20} />
                  <span className="text-xs font-bold uppercase tracking-wider">Paymaster</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
            >
              Sign In to Dashboard
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-3">
             <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-bold tracking-widest">
               <ShieldCheck size={14} />
               Local Connection Only
             </div>
             <p className="text-[10px] text-slate-400 text-center leading-relaxed">
               This application runs locally. Ensure your device is on the same Wi-Fi network to access from mobile. No data leaves this PC.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
