import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className={`${sizeClasses[size]} w-full bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center px-4 py-4 sm:p-6 border-b-4 border-islamic-blue">
          <h2 className="text-lg sm:text-2xl font-bold text-islamic-dark">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 transition"
          >
            <X size={28} />
          </button>
        </div>
        <div className="px-4 py-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
