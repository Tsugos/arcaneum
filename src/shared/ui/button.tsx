import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-arcane-accent/50 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary: 'bg-arcane-accent hover:bg-arcane-accent-glow text-white shadow-lg shadow-arcane-accent/20 active:scale-[0.98]',
    secondary: 'bg-arcane-800 hover:bg-arcane-700 text-slate-200 border border-arcane-700/50',
    outline: 'border border-arcane-700 hover:bg-arcane-800/50 text-slate-300 hover:text-white',
    ghost: 'hover:bg-arcane-800/40 text-slate-400 hover:text-slate-200',
    danger: 'bg-arcane-rose/90 hover:bg-arcane-rose text-white shadow-md shadow-arcane-rose/20',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
