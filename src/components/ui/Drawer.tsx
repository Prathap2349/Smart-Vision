import React from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-aurora-elevated border-l border-white/15 h-full flex flex-col shadow-2xl shadow-black/50 text-text-primary">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-aurora-surface/80">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-xl hover:bg-white/10 transition"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-6">{children}</div>
      </div>
    </div>
  );
};
