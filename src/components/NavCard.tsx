import React from 'react';
import Link from 'next/link';

interface NavCardProps {
  href: string;
  icon: string;
  title: string;
  description: string;
  color: 'blue' | 'green' | 'yellow' | 'pink' | 'purple' | 'orange';
  comingSoon?: boolean;
}

const colorClasses = {
  blue: 'bg-blue-100 border-blue-300 hover:shadow-blue-300',
  green: 'bg-green-100 border-green-300 hover:shadow-green-300',
  yellow: 'bg-yellow-100 border-yellow-300 hover:shadow-yellow-300',
  pink: 'bg-pink-100 border-pink-300 hover:shadow-pink-300',
  purple: 'bg-purple-100 border-purple-300 hover:shadow-purple-300',
  orange: 'bg-orange-100 border-orange-300 hover:shadow-orange-300',
};

export const NavCard: React.FC<NavCardProps> = ({
  href,
  icon,
  title,
  description,
  color,
  comingSoon = false
}) => {
  const content = (
    <div className={`${colorClasses[color]} border-4 rounded-3xl p-6 transition-all duration-300 shadow-kids hover:shadow-kids-hover hover:-translate-y-1 cursor-pointer h-full`}>
      <div className="text-6xl mb-4 filter drop-shadow-sm">{icon}</div>
      <h3 className="text-2xl font-bold text-islamic-dark mb-2">{title}</h3>
      <p className="text-lg text-gray-700 font-medium">{description}</p>
      {comingSoon && (
        <div className="mt-4 inline-block bg-gray-400 text-white px-3 py-1 rounded-full text-xs font-bold">
          Coming Soon
        </div>
      )}
    </div>
  );

  if (comingSoon) {
    return <div className="cursor-not-allowed opacity-60">{content}</div>;
  }

  return <Link href={href}>{content}</Link>;
};
