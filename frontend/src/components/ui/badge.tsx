import { cn } from '../../lib/utils';
import './badge.css';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

export function Badge({ variant = 'neutral', className, children }: { variant?: BadgeVariant; className?: string; children: React.ReactNode }) {
  return <span className={cn('badge', `badge-${variant}`, className)}>{children}</span>;
}
