import React from 'react';
import { Card } from './Card';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: 'cyan' | 'rose' | 'emerald' | 'blue' | 'violet' | 'none';
  interactive?: boolean;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  glow = 'none',
  interactive = false,
  onClick,
}) => {
  return (
    <Card
      variant="glass"
      glow={glow}
      interactive={interactive}
      onClick={onClick}
      className={className}
    >
      {children}
    </Card>
  );
};
