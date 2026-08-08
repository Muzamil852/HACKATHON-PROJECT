export default function Skeleton({ variant = 'text', className = '' }) {
  const variants = {
    text: 'h-4 w-3/4 rounded-md',
    circle: 'h-10 w-10 rounded-full',
    card: 'h-32 w-full rounded-xl',
    kpi: 'h-24 w-full rounded-xl',
  };

  return (
    <div className={`animate-pulse bg-slate-800 ${variants[variant]} ${className}`} />
  );
}
