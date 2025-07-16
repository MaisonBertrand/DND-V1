import React, { memo } from 'react';

const TurnOrder = memo(({ initiativeOrder, currentTurn, round, onTurnClick }) => {
  if (!initiativeOrder || initiativeOrder.length === 0) {
    return null;
  }

  return (
    <div className="fantasy-card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-100">🎯 Turn Order</h3>
        <div className="text-sm text-slate-400">
          Round {round} • Turn {currentTurn + 1} of {initiativeOrder.length}
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {initiativeOrder.map((participant, index) => (
          <div
            key={participant.id}
            onClick={() => onTurnClick && onTurnClick(index)}
            className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
              index === currentTurn
                ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                : index < currentTurn
                ? 'border-slate-600 bg-slate-700/30 text-slate-400'
                : 'border-slate-500 bg-slate-700/20 text-slate-300 hover:border-slate-400 hover:bg-slate-700/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  participant.type === 'player' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}>
                  {participant.type === 'player' ? '👤' : '👹'}
                </div>
                <span className="font-medium truncate">{participant.name}</span>
              </div>
              <div className="text-xs text-slate-400">
                {participant.initiative || 'N/A'}
              </div>
            </div>
            
            {index === currentTurn && (
              <div className="mt-2 text-xs text-amber-300 font-medium">
                ⭐ Current Turn
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

TurnOrder.displayName = 'TurnOrder';

export default TurnOrder; 