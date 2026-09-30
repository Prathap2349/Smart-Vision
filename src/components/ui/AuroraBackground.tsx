import React from 'react';

interface AuroraBackgroundProps {
  children: React.ReactNode;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({ children }) => {
  return (
    <div className="relative min-h-screen bg-aurora-bg text-text-primary overflow-x-hidden">
      {/* Subtle Aurora Ambient Radial Glows (Calm, slow, background only) */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden" 
        aria-hidden="true"
      >
        {/* Top-left Blue/Cyan radial glow */}
        <div 
          className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-gradient-to-br from-brand-cyan/10 via-brand-blue/8 to-transparent blur-[120px] animate-aurora-1"
        />
        {/* Bottom-right Violet radial glow */}
        <div 
          className="absolute top-[40%] -right-[15%] w-[65vw] h-[65vw] max-w-[900px] max-h-[900px] rounded-full bg-gradient-to-tl from-brand-violet/12 via-brand-blue/6 to-transparent blur-[140px] animate-aurora-2"
        />
        {/* Subtle center depth mesh */}
        <div 
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-aurora-surface/40 via-transparent to-transparent opacity-60"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
