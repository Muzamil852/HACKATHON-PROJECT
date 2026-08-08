import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

export default function KpiCard({ label, value, icon: Icon, color = '#2563eb', trend, trendLabel, primary = false, isSelected = false }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const isNumber = typeof value === 'number';
    if (isNumber) {
      const controls = animate(count, value, { duration: 1.0, ease: "easeOut" });
      return controls.stop;
    }
  }, [value, count]);

  useEffect(() => {
    return rounded.on("change", (v) => setDisplayValue(v));
  }, [rounded]);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`h-[180px] p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
        isSelected 
          ? 'bg-blue-50/40 border-2 border-blue-500/80 shadow-xs' 
          : primary
          ? 'bg-white border-blue-200 shadow-2xs hover:border-blue-300'
          : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs'
      }`}
    >
      {/* Top: Label + Icon */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-slate-500 text-xs sm:text-[13px] font-bold uppercase tracking-wider leading-snug line-clamp-2">
          {label}
        </span>
        {Icon && (
          <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${color}15`, color }}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Middle: Large Number (Strongest Visual Element) */}
      <div className="my-auto pt-1">
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-mono">
            {typeof value === 'number' ? displayValue : value}
          </span>
          {trend && (
            <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend === 'up' ? '↑' : '↓'} {trendLabel}
            </span>
          )}
        </div>
      </div>

      {/* Bottom: Small Clickable Action Link */}
      <div className="flex items-center justify-between text-xs font-medium text-slate-400 group-hover:text-blue-600 transition-colors pt-2 border-t border-slate-100/80">
        <span>View reports</span>
        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
      </div>
    </motion.div>
  );
}
