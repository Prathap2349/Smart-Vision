import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Lock, ArrowRight, X } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('prathap.s@rathinam.edu.in');
  const [password, setPassword] = useState('••••••••••••');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
    onClose();
  };

  const handleDemoAccess = () => {
    login();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 relative border-cyan-500/20">
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
            <p className="text-xs text-slate-400">Access your security dashboard &amp; camera controls</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email / Account ID</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
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
        <div className="pt-4 border-t border-slate-800 text-center space-y-2">
          <p className="text-xs text-slate-400">Evaluating for residential installation?</p>
          <button
            onClick={handleDemoAccess}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-bold border border-slate-700 rounded-xl text-xs transition"
          >
            Open Interactive Demo Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
};
