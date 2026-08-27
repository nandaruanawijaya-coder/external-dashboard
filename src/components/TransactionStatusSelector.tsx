'use client';

interface TransactionStatusSelectorProps {
  status: string;
  onStatusChange: (status: string) => void;
}

export default function TransactionStatusSelector({ status, onStatusChange }: TransactionStatusSelectorProps) {
  const statuses = [
    { id: '', label: 'All Status' },
    { id: 'SUCCESS', label: 'Success' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'FAILED', label: 'Failed' },
  ];

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700">Status:</label>
      <div className="flex gap-1 bg-white/50 backdrop-blur rounded-xl p-1 border border-white/60">
        {statuses.map((s) => (
          <button
            key={s.id}
            onClick={() => onStatusChange(s.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              status === s.id
                ? 'bg-white text-blue-600 shadow-md'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
