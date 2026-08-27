'use client';

import { useEffect, useRef, useState } from 'react';

interface StoreSelectorProps {
  store: string;
  onStoreChange: (store: string) => void;
  period?: string;
}

export default function StoreSelector({ store, onStoreChange, period = 'mtd' }: StoreSelectorProps) {
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/dashboard/stores?period=${period}`);
        if (!res.ok) throw new Error('Failed to fetch stores');
        const json = await res.json();
        setStores(json.stores || []);
      } catch (err) {
        console.error('Failed to fetch stores:', err);
        setStores([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, [period]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStores = stores.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStore = stores.find((s) => s.id === store);

  const handleSelect = (id: string) => {
    onStoreChange(id);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-3" ref={containerRef}>
      <label className="text-sm font-medium text-gray-700">Store:</label>
      <div className="relative w-56">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className="w-full px-4 py-2 border border-white/60 rounded-xl text-sm font-medium bg-white/70 backdrop-blur hover:bg-white/90 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 text-left flex justify-between items-center"
        >
          <span>{selectedStore?.name || 'All Stores'}</span>
          <span className={`ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-white/60 rounded-xl shadow-xl z-50">
            <input
              type="text"
              placeholder="Search stores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border-b border-gray-200 text-sm rounded-t-xl focus:outline-none"
              autoFocus
            />
            <div className="max-h-56 overflow-y-auto">
              <div
                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                onClick={() => handleSelect('')}
              >
                All Stores
              </div>
              {filteredStores.map((s) => (
                <div
                  key={s.id}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                  onClick={() => handleSelect(s.id)}
                >
                  {s.name}
                </div>
              ))}
              {filteredStores.length === 0 && searchTerm && (
                <div className="px-4 py-2 text-sm text-gray-500">No stores found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
