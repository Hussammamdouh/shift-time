'use client';
type Tab = 'watch' | 'manual' | 'report' | 'sync' | 'settings';

export default function Navbar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string; icon: string; description: string; color: string }[] = [
    { 
      key: 'watch', 
      label: 'Stopwatch', 
      icon: '⏱️', 
      description: 'Track active shifts',
      color: 'from-green-500 to-emerald-500'
    },
    { 
      key: 'manual', 
      label: 'Manual Entry', 
      icon: '📝', 
      description: 'Add past shifts',
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      key: 'report', 
      label: 'Reports', 
      icon: '📊', 
      description: 'View history & analytics',
      color: 'from-purple-500 to-pink-500'
    },
    { 
      key: 'sync', 
      label: 'Sync', 
      icon: '🔄', 
      description: 'Share across devices',
      color: 'from-orange-500 to-red-500'
    },
    { 
      key: 'settings', 
      label: 'Settings', 
      icon: '⚙️', 
      description: 'Configure preferences',
      color: 'from-gray-500 to-slate-500'
    },
  ];

  return (
    <nav className="space-y-2">
      {tabs.map(({ key, label, icon, description, color }) => (
        <button
          key={key}
          className={`group relative w-full text-left px-4 py-3 rounded-xl font-medium transition-all duration-200 
                     ${tab === key 
                       ? 'bg-gradient-to-r ' + color + ' text-white shadow-lg scale-[1.02]' 
                       : 'hover:bg-gray-800/50 hover:text-white text-gray-300 hover:scale-[1.01]'
                     }`}
          onClick={() => setTab(key)}
          title={description}
        >
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg
                          ${tab === key 
                            ? 'bg-white/20 backdrop-blur-sm' 
                            : 'bg-gray-700/50 group-hover:bg-gray-600/50'
                          }`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{label}</div>
              <div className={`text-xs ${tab === key ? 'text-white/80' : 'text-gray-500 group-hover:text-gray-400'}`}>
                {description}
              </div>
            </div>
            
            {/* Active indicator */}
            {tab === key && (
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            )}
          </div>
          
          {/* Hover effect */}
          <div className={`absolute inset-0 rounded-xl transition-all duration-200 
                        ${tab === key 
                          ? 'ring-2 ring-white/20' 
                          : 'group-hover:ring-1 group-hover:ring-gray-600/50'
                        }`}>
          </div>
        </button>
      ))}
    </nav>
  );
}
