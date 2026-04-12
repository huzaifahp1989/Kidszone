import React from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-sky-100 text-sky-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  purple: 'bg-purple-100 text-purple-700',
};

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon, color }) => {
  return (
    <div className={`${colorClasses[color]} rounded-3xl p-6 text-center shadow-kids transform hover:scale-105 transition-transform duration-200 border-2 border-white/50`}>
      <div className="text-5xl mb-3 filter drop-shadow-sm">{icon}</div>
      <p className="text-base font-bold mb-2 opacity-80">{label}</p>
      <p className="text-4xl font-black">{value}</p>
    </div>
  );
};
