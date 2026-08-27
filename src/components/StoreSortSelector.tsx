'use client';

interface StoreSortSelectorProps {
  sort: string;
  onSortChange: (sort: string) => void;
}

export default function StoreSortSelector({ sort, onSortChange }: StoreSortSelectorProps) {
  const sorts = [
    { id: 'transactions_desc', label: 'Transactions (High to Low)' },
    { id: 'transactions_asc', label: 'Transactions (Low to High)' },
    { id: 'value_desc', label: 'Value (High to Low)' },
    { id: 'value_asc', label: 'Value (Low to High)' },
    { id: 'settlement_value_desc', label: 'Settlement Value (High to Low)' },
    { id: 'settlement_value_asc', label: 'Settlement Value (Low to High)' },
    { id: 'settlement_days_desc', label: 'Settlement Days (High to Low)' },
    { id: 'settlement_days_asc', label: 'Settlement Days (Low to High)' },
  ];

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700">Sort:</label>
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="px-4 py-2 border border-white/60 rounded-xl text-sm font-medium bg-white/70 backdrop-blur hover:bg-white/90 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
      >
        {sorts.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
