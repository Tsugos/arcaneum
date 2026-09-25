import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  glass = true,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'rounded-xl border border-arcane-800/60 p-4 transition-all duration-200',
          glass ? 'bg-arcane-900/60 backdrop-blur-md shadow-xl' : 'bg-arcane-900',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
