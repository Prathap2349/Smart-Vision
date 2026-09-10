import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, ArrowRight, X, Phone, Mail } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, loginWithGoogle } = useAuth();
  const [identifier, setIdentifier] = useState('8838523456');
  const [password, setPassword] = useState('••••••••••••');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(identifier, password);
    onClose();
  };

  const handleGoogleLogin = () => {
    loginWithGoogle();
    onClose();
  };

  const handleDemoAccess = () => {
    login();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative border-cyan-500/30">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Sign In to Smart Vision
            </h2>
            <p className="text-xs text-slate-400">Use Mobile Number, Email, or Gmail Account</p>
          </div>
        </div>

        {/* 1-Click Sign in with Google (Gmail Integration) */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2.5"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Sign In Automatically with Google (Gmail)</span>
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex-1 h-px bg-slate-800" />
          <span>or sign in with phone / email</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Form accepting Phone Number or Email */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
              <span>Mobile Phone / Email / Account ID</span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Phone className="w-3 h-3 text-cyan-400" /> Phone Numbers Supported
              </span>
            </label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="e.g. 8838523456 or name@gmail.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 group"
          >
            <span>Sign In to Dashboard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Instant Demo Shortcut */}
        <div className="pt-3 border-t border-slate-800 text-center space-y-2">
          <button
            onClick={handleDemoAccess}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-bold border border-slate-700 rounded-xl text-xs transition"
          >
            Open Interactive Demo Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
};
