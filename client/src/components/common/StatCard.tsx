import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  colorScheme?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky';
}

const colorMaps = {
  indigo: {
    bg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    iconBg: 'bg-indigo-600 text-white shadow-indigo-200',
  },
  emerald: {
    bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    iconBg: 'bg-emerald-600 text-white shadow-emerald-200',
  },
  amber: {
    bg: 'bg-amber-50 text-amber-600 border-amber-100',
    iconBg: 'bg-amber-600 text-white shadow-amber-200',
  },
  rose: {
    bg: 'bg-rose-50 text-rose-600 border-rose-100',
    iconBg: 'bg-rose-600 text-white shadow-rose-200',
  },
  sky: {
    bg: 'bg-sky-50 text-sky-600 border-sky-100',
    iconBg: 'bg-sky-600 text-white shadow-sky-200',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorScheme = 'indigo',
}) => {
  const scheme = colorMaps[colorScheme];

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-card transition-all">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md ${scheme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs">
          <span
            className={`font-semibold ${
              trend.isPositive ? 'text-emerald-600' : 'text-slate-500'
            }`}
          >
            {trend.value}
          </span>
          <span className="text-slate-400">vs previous period</span>
        </div>
      )}
    </div>
  );
};

