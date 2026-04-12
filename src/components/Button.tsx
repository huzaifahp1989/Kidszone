import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const variantClasses = {
  primary: 'bg-kids-primary hover:bg-red-400 text-white',
  secondary: 'bg-kids-secondary hover:bg-teal-300 text-white',
  success: 'bg-islamic-green hover:bg-green-300 text-white',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  warning: 'bg-kids-accent hover:bg-yellow-300 text-islamic-dark',
  outline: 'bg-transparent border-2 border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50',
};

const sizeClasses = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        rounded-3xl font-bold transition-all duration-200
        shadow-kids hover:shadow-kids-hover active:shadow-kids-active active:translate-y-1
        ${disabled ? 'opacity-50 cursor-not-allowed shadow-none active:translate-y-0' : 'cursor-pointer'}
        ${className}
      `}
    >
      {children}
    </button>
  );
};
