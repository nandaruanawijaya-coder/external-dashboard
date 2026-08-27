'use client';

interface MetricsSelectorProps {
  metric: string;
  onMetricChange: (metric: string) => void;
}

export default function MetricsSelector({ metric, onMetricChange }: MetricsSelectorProps) {
  const metrics = [
    { value: 'transactions', label: 'Transactions' },
    { value: 'transaction_value', label: 'Transaction Value' },
    { value: 'settlement_value', label: 'Settlement Value' },
    { value: 'settlement_days', label: 'Settlement Days' },
  ];

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700">Metric:</label>
      <select
        value={metric}
        onChange={(e) => onMetricChange(e.target.value)}
        className="px-4 py-2 border border-white/60 rounded-xl text-sm font-medium bg-white/70 backdrop-blur hover:bg-white/90 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
      >
        {metrics.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}
