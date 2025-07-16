import React from 'react';

export default function CombatStatus({ combatants, currentCombatant }) {
  const partyMembers = combatants.filter(c => !c.id.startsWith('enemy_'));
  const enemies = combatants.filter(c => c.id.startsWith('enemy_'));

  const getHealthStatus = (combatant) => {
    if (combatant.hp <= 0) return 'dead';
    if (combatant.hp < combatant.maxHp * 0.5) return 'low';
    return 'healthy';
  };

  const getStatusStyles = (combatant) => {
    const status = getHealthStatus(combatant);
    const isCurrentTurn = currentCombatant?.id === combatant.id;
    
    const baseStyles = `p-2 rounded border text-xs ${isCurrentTurn ? 'ring-1 ring-amber-400' : ''}`;
    
    switch (status) {
      case 'dead':
        return `${baseStyles} bg-red-900/20 border-red-600`;
      case 'low':
        return `${baseStyles} bg-yellow-900/20 border-yellow-600`;
      default:
        return `${baseStyles} bg-blue-900/20 border-blue-600`;
    }
  };

  const getHealthColor = (combatant) => {
    const status = getHealthStatus(combatant);
    switch (status) {
      case 'dead': return 'text-red-400';
      case 'low': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  return (
    <div className="fantasy-card">
      <h3 className="font-bold text-gray-100 mb-3 text-sm">⚔️ Combat Status</h3>
      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-blue-300 mb-2 text-xs">🛡️ Party</h4>
          <div className="space-y-1">
            {partyMembers.map(combatant => (
              <div key={combatant.id} className={getStatusStyles(combatant)}>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-100 truncate">
                    {combatant.name}
                    {currentCombatant?.id === combatant.id && (
                      <span className="ml-1 text-amber-400">🎲</span>
                    )}
                  </span>
                  <span className={`text-xs ${getHealthColor(combatant)}`}>
                    {combatant.hp}/{combatant.maxHp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-red-300 mb-2 text-xs">👹 Enemies</h4>
          <div className="space-y-1">
            {enemies.map(combatant => (
              <div key={combatant.id} className={getStatusStyles(combatant)}>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-100 truncate">
                    {combatant.name}
                    {currentCombatant?.id === combatant.id && (
                      <span className="ml-1 text-amber-400">🎲</span>
                    )}
                  </span>
                  <span className={`text-xs ${getHealthColor(combatant)}`}>
                    {combatant.hp}/{combatant.maxHp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 