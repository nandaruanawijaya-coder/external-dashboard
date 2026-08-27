'use client';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="mb-10">
      <div className="flex gap-2 bg-white/50 backdrop-blur rounded-xl p-1 border border-white/60 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`py-2 px-5 rounded-lg font-medium text-sm transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
