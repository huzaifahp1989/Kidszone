import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

interface NavCardProps {
  href: string;
  icon: string;
  title: string;
  description: string;
  color: 'blue' | 'green' | 'yellow' | 'pink' | 'purple' | 'orange';
  comingSoon?: boolean;
}

const colorClasses = {
  blue: 'from-cyan-50 via-white to-teal-50 border-teal-200',
  green: 'from-emerald-50 via-white to-teal-50 border-emerald-200',
  yellow: 'from-amber-50 via-white to-yellow-50 border-amber-200',
  pink: 'from-rose-50 via-white to-orange-50 border-rose-200',
  purple: 'from-indigo-50 via-white to-sky-50 border-indigo-200',
  orange: 'from-orange-50 via-white to-amber-50 border-orange-200',
};

export const NavCard: React.FC<NavCardProps> = ({
  href,
  icon,
  title,
  description,
  color,
  comingSoon = false
}) => {
  const reduceMotion = useReducedMotion();

  const content = (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.015 }}
      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
      className={`${colorClasses[color]} surface-card surface-card-hover bg-gradient-to-br border rounded-3xl p-6 transition-all duration-300 transition-bouncy cursor-pointer h-full interactive-focus touch-target`}
    >
      <div className="text-6xl mb-4 filter drop-shadow-sm">{icon}</div>
      <h3 className="font-heading mb-2 text-2xl font-bold text-sand-900">{title}</h3>
      <p className="text-lg font-medium text-sand-700">{description}</p>
      {comingSoon && (
        <div className="mt-4 inline-block bg-[#1e1b4b]/80 text-white px-3 py-1 rounded-full text-xs font-bold">
          Coming Soon
        </div>
      )}
    </motion.div>
  );

  if (comingSoon) {
    return <div className="cursor-not-allowed opacity-60">{content}</div>;
  }

  return <Link href={href} className="block rounded-3xl">{content}</Link>;
};
