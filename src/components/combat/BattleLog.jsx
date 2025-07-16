import React from 'react';

export default function BattleLog({ battleLog }) {
  const scrollLog = (direction) => {
    const logContainer = document.getElementById('battle-log-container');
    if (logContainer) {
      logContainer.scrollTop += direction === 'up' ? -50 : 50;
    }
  };

  return (
    <div className="fantasy-card">
      <h3 className="text-sm font-semibold mb-2 text-yellow-400">📜 Battle Log</h3>
      <div className="relative">
        {/* Scroll Up Button */}
        <button 
          onClick={() => scrollLog('up')}
          className="absolute top-0 right-0 z-10 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs px-2 py-1 rounded-t transition-colors"
        >
          ↑
        </button>
        
        {/* Battle Log Content */}
        <div 
          id="battle-log-container"
          className="h-32 overflow-y-auto space-y-1 text-xs pr-8 scrollbar-hide"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {battleLog.length === 0 ? (
            <p className="text-gray-400">No actions recorded yet...</p>
          ) : (
            battleLog.slice(-8).map((entry) => (
              <div key={entry.id} className="border-l-2 border-gray-600 pl-2 py-1">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-blue-400">R{entry.round}</span>
                </div>
                <div className={`${
                  entry.type === 'damage' ? 'text-red-400' :
                  entry.type === 'healing' ? 'text-green-400' :
                  entry.type === 'death' ? 'text-red-500 font-semibold' :
                  entry.type === 'status_effect' ? 'text-purple-400' :
                  entry.type === 'action_failed' ? 'text-orange-400' :
                  entry.type === 'error' ? 'text-red-500' :
                  'text-gray-200'
                }`}>
                  {entry.description}
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Scroll Down Button */}
        <button 
          onClick={() => scrollLog('down')}
          className="absolute bottom-0 right-0 z-10 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs px-2 py-1 rounded-b transition-colors"
        >
          ↓
        </button>
      </div>
    </div>
  );
} 