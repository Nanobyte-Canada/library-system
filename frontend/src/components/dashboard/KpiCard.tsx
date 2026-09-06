import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import './KpiCard.css';

interface KpiCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  color: 'green' | 'amber' | 'red' | 'blue';
}

export function KpiCard({ icon, value, label, color }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <div className={cn('kpi-card-icon', color)}>{icon}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
