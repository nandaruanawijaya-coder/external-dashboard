'use client';

interface PeriodSelectorProps {
  period: string;
  onPeriodChange: (period: string) => void;
}

export default function PeriodSelector({ period, onPeriodChange }: PeriodSelectorProps) {
  const periods = [
    { value: 'mtd', label: 'Month to Date' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'custom', label: 'Custom Range' },
  ];

  return (
    <div className="flex gap-3 bg-gradient-to-r from-white/50 to-white/30 backdrop-blur rounded-xl p-1 border border-white/60 w-fit">
      {periods.map((p) => (
        <button
          key={p.value}
          onClick={() => onPeriodChange(p.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
            period === p.value
              ? 'bg-white text-blue-600 shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
