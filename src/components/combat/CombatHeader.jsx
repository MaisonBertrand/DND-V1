import React, { memo } from 'react';

const CombatHeader = memo(({ currentCombatant, combatSession }) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="fantasy-title mb-0">⚔️ Combat Arena</h1>
        {currentCombatant && (
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-400">
              🎲 {currentCombatant.name}'s Turn
            </div>
            <div className="text-sm text-gray-400">
              Round {combatSession?.round || 1} • Turn {(combatSession?.currentTurn || 0) + 1}
            </div>
          </div>
        )}
      </div>

      {combatSession.storyContext && (
        <div className="fantasy-card mb-4 bg-gray-800/50 border-gray-600">
          <h3 className="font-bold text-gray-100 mb-2">📖 Story Context</h3>
          <p className="text-gray-300 italic">{combatSession.storyContext}</p>
        </div>
      )}
    </div>
  );
});

CombatHeader.displayName = 'CombatHeader';

export default CombatHeader; 