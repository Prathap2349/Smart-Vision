import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSecurity } from '../../context/SecurityContext';
import { Shield, ArrowRight, X, Camera } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, loginWithGoogle } = useAuth();
  const { setDeviceCameraModalOpen } = useSecurity();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-aurora-elevated border border-white/15 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-black/50 space-y-5 relative text-text-primary">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-violet flex items-center justify-center shadow-lg shadow-brand-blue/25 shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary leading-tight">
              Sign In to Smart Vision
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Use your mobile number, email, or Google account</p>
          </div>
        </div>

        {/* 1-Click Sign in with Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/15 text-text-primary font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2.5"
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
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3 text-xs text-text-muted">
          <div className="flex-1 h-px bg-white/10" />
          <span>or sign in with phone / email</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Mobile Phone or Email
            </label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="e.g. 8838523456 or name@gmail.com"
              className="w-full bg-aurora-bg border border-white/15 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-cyan/50 focus:outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-aurora-bg border border-white/15 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-cyan/50 focus:outline-none transition"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-brand-blue hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition shadow-blue-glow flex items-center justify-center gap-2 group"
          >
            <span>Sign In to Dashboard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Device Camera Test Section */}
        <div className="pt-2 border-t border-white/10 space-y-2 text-center">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
            Try Without Logging In
          </span>

          <button
            type="button"
            onClick={() => {
              onClose();
              setDeviceCameraModalOpen(true);
            }}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 text-text-secondary font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4 text-brand-cyan" />
            <span>Test with Device Camera</span>
          </button>
        </div>
      </div>
    </div>
  );
};
