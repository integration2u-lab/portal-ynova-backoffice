import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color?: 'blue' | 'orange' | 'green' | 'purple';
}

export default function KpiCard({ title, value, icon: Icon, color = 'blue' }: KpiCardProps) {
  const colorClasses = {
    blue: 'bg-yn-blue/10 text-yn-blue',
    orange: 'bg-yn-orange/10 text-yn-orange',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  } as const;

  return (
    <div className="bg-white dark:bg-[#1a1f24] rounded-lg p-6 shadow-sm border border-gray-200 dark:border-[#2b3238]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-600 dark:text-white mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}
