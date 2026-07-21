import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

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
  primary: 'bg-gradient-to-r from-teal-500 to-teal-700 text-white hover:from-teal-400 hover:to-teal-600 border border-white/30',
  secondary: 'bg-gradient-to-r from-gold-400 to-gold-600 text-sand-900 hover:from-gold-300 hover:to-gold-500 border border-white/40',
  success: 'bg-gradient-to-r from-emerald-500 to-emerald-700 text-white hover:from-emerald-400 hover:to-emerald-600 border border-white/30',
  danger: 'bg-gradient-to-r from-coral-400 to-coral-600 text-white hover:from-coral-300 hover:to-coral-500 border border-white/30',
  warning: 'bg-gradient-to-r from-gold-400 to-gold-600 text-sand-900 hover:from-gold-300 hover:to-gold-500 border border-white/40',
  outline: 'bg-white/90 border-2 border-sand-200 text-sand-800 hover:border-teal-400 hover:bg-teal-50/60',
};

const sizeClasses = {
  sm: 'px-4 py-2.5 text-sm min-h-11',
  md: 'px-6 py-3 text-base min-h-11',
  lg: 'px-8 py-4 text-lg min-h-12',
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
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled || reduceMotion ? undefined : { y: -2, scale: 1.01 }}
      whileTap={disabled || reduceMotion ? undefined : { y: 1, scale: 0.985 }}
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        rounded-3xl font-bold transition-all duration-200 transition-bouncy
        shadow-card hover:shadow-panel active:shadow-sm active:translate-y-0.5
        interactive-focus touch-target
        ${disabled ? 'opacity-50 cursor-not-allowed shadow-none active:translate-y-0' : 'cursor-pointer'}
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
};
