'use client';

import { useState, useEffect } from 'react';

interface DateRangeSelectorProps {
  fromDate: string;
  toDate: string;
  onDateRangeChange: (from: string, to: string) => void;
}

export default function DateRangeSelector({
  fromDate,
  toDate,
  onDateRangeChange,
}: DateRangeSelectorProps) {
  const [localFromDate, setLocalFromDate] = useState(fromDate);
  const [localToDate, setLocalToDate] = useState(toDate);
  const [error, setError] = useState('');

  useEffect(() => {
    setLocalFromDate(fromDate);
    setLocalToDate(toDate);
  }, [fromDate, toDate]);

  const today = new Date().toISOString().split('T')[0];

  const validateAndUpdate = (from: string, to: string) => {
    setError('');

    // Prevent future dates
    if (from > today) {
      setError('Start date cannot be in the future');
      return;
    }
    if (to > today) {
      setError('End date cannot be in the future');
      return;
    }

    // Validate range
    if (from && to && from > to) {
      setError('Start date must be before end date');
      return;
    }

    onDateRangeChange(from, to);
  };

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFrom = e.target.value;
    setLocalFromDate(newFrom);
    validateAndUpdate(newFrom, localToDate);
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTo = e.target.value;
    setLocalToDate(newTo);
    validateAndUpdate(localFromDate, newTo);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-3 bg-gradient-to-r from-white/50 to-white/30 backdrop-blur rounded-xl p-3 border border-white/60 w-fit flex-col sm:flex-row">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1">
              From
            </label>
            <input
              type="date"
              value={localFromDate}
              onChange={handleFromDateChange}
              max={today}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <span className="text-gray-400 hidden sm:inline">→</span>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1">
              To
            </label>
            <input
              type="date"
              value={localToDate}
              onChange={handleToDateChange}
              max={today}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 font-medium flex items-center gap-1">
          <span>⚠</span>
          {error}
        </div>
      )}
    </div>
  );
}
