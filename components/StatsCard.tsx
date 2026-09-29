'use client';

import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient: string;
}

export default function StatsCard({ title, value, icon: Icon, trend, gradient }: StatsCardProps) {
  const getGradientClass = (gradientType: string) => {
    switch (gradientType) {
      case 'gradient-primary':
        return 'bg-gradient-to-br from-blue-500 to-purple-600';
      case 'gradient-success':
        return 'bg-gradient-to-br from-green-500 to-emerald-600';
      case 'gradient-warning':
        return 'bg-gradient-to-br from-amber-500 to-orange-600';
      case 'gradient-info':
        return 'bg-gradient-to-br from-blue-500 to-blue-700';
      default:
        return 'bg-gradient-to-br from-gray-500 to-gray-600';
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-xl p-6 text-white card-hover ${getGradientClass(gradient)}`}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-16 w-16 rounded-full bg-white/5"></div>
      
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
            {trend && (
              <div className="flex items-center mt-2">
                <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-200' : 'text-red-200'}`}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
                <span className="text-xs text-white/60 ml-2">vs last week</span>
              </div>
            )}
          </div>
          <div className="rounded-full bg-white/20 p-3">
            <Icon className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
