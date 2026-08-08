import { AlertCircle, AlertTriangle, Info, CheckCircle, Clock, UserCheck, PlayCircle, CheckCircle2 } from 'lucide-react';

const PRIORITY_COLORS = {
  CRITICAL: 'bg-red-50 text-red-700 border-red-200 font-semibold',
  HIGH: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200 font-semibold',
  LOW: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
};

const STATUS_COLORS = {
  OPEN: 'bg-slate-100 text-slate-700 border-slate-200 font-medium',
  ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200 font-medium',
  IN_PROGRESS: 'bg-amber-50 text-amber-800 border-amber-200 font-medium',
  RESOLVED: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium',
};

const CATEGORY_COLORS = {
  WATER: 'bg-blue-50 text-blue-700 border-blue-200',
  ROAD: 'bg-slate-100 text-slate-800 border-slate-200',
  WASTE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  ELECTRICITY: 'bg-amber-50 text-amber-800 border-amber-200',
  SAFETY: 'bg-red-50 text-red-700 border-red-200',
  PUBLIC_INFRASTRUCTURE: 'bg-purple-50 text-purple-700 border-purple-200',
  DRAINAGE: 'bg-teal-50 text-teal-800 border-teal-200',
  OTHER: 'bg-slate-100 text-slate-700 border-slate-200',
};

const ICONS = {
  CRITICAL: AlertCircle,
  HIGH: AlertTriangle,
  MEDIUM: Info,
  LOW: CheckCircle,
  OPEN: Clock,
  ASSIGNED: UserCheck,
  IN_PROGRESS: PlayCircle,
  RESOLVED: CheckCircle2,
};

export default function Badge({ type = 'CRITICAL', variant = 'priority', className = '' }) {
  const colors = variant === 'category' ? CATEGORY_COLORS : (variant === 'status' ? STATUS_COLORS : PRIORITY_COLORS);
  const colorClass = colors[type] || 'bg-slate-100 text-slate-700 border-slate-200';
  const Icon = ICONS[type] || Info;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${colorClass} ${className}`}>
      {variant !== 'category' && <Icon className="w-3 h-3 mr-1" />}
      {type.replace('_', ' ')}
    </span>
  );
}
