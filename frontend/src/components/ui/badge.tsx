import { ReactNode } from 'react';

type BadgeVariant = 'healthy' | 'normal' | 'degrading' | 'critical' | 'default';

const variantClasses: Record<BadgeVariant, string> = {
  healthy: 'bg-green-500/20 text-green-400 border-green-500/30',
  normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  degrading: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  default: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function getRiskBadgeVariant(riskLevel: string): BadgeVariant {
  switch (riskLevel) {
    case 'LOW': return 'healthy';
    case 'MEDIUM': return 'normal';
    case 'HIGH': return 'degrading';
    case 'CRITICAL': return 'critical';
    default: return 'default';
  }
}

export function getHealthBadgeVariant(score: number): BadgeVariant {
  if (score >= 90) return 'healthy';
  if (score >= 70) return 'normal';
  if (score >= 40) return 'degrading';
  return 'critical';
}
