import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';
import './button.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn('btn', `btn-${variant}`, size !== 'md' && `btn-${size}`, className)}
      {...props}
    >
      {children}
    </button>
  );
}
