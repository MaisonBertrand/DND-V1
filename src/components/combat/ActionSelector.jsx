import React from 'react';

export default function ActionSelector({ 
  currentCombatant, 
  availableActions, 
  selectedAction, 
  setSelectedAction,
  selectedTarget,
  setSelectedTarget,
  getValidTargetsForAction,
  executeAction,
  processingTurn,
  isCurrentUserTurn
}) {
  if (!currentCombatant) return null;

  return (
    <div className="fantasy-card bg-gray-800/50 border-gray-600">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-amber-400 mb-1">
          🎲 {currentCombatant.name}'s Turn
        </h2>
        <p className="text-gray-300 text-sm">
          {isCurrentUserTurn ? 'Select your action below' : 'Waiting for this player to act'}
        </p>
      </div>
      
      {isCurrentUserTurn ? (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-100 mb-3 text-center">⚔️ Available Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedAction(action)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 text-left hover:scale-105 ${
                    selectedAction?.type === action.type
                      ? 'border-amber-500 bg-amber-900/30 shadow-lg shadow-amber-500/20'
                      : 'border-gray-600 bg-gray-700 hover:border-gray-500 hover:bg-gray-600'
                  }`}
                >
                  <div className="font-bold text-sm text-gray-100 mb-1">{action.name}</div>
                  <div className="text-xs text-gray-300 mb-1">{action.description}</div>
                  <div className="text-xs text-gray-400 bg-gray-800 px-1 py-0.5 rounded inline-block">
                    {action.priority}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedAction && (
            <div>
              <h3 className="text-lg font-bold text-gray-100 mb-3 text-center">🎯 Select Target</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {getValidTargetsForAction(selectedAction.type).map(target => (
                  <button
                    key={target.id}
                    onClick={() => setSelectedTarget(target)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                      selectedTarget?.id === target.id
                        ? 'border-red-500 bg-red-900/30 shadow-lg shadow-red-500/20'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500 hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-bold text-sm text-gray-100 mb-1">{target.name}</div>
                    <div className="text-xs text-gray-300 mb-1">
                      HP: {target.hp}/{target.maxHp} | AC: {target.ac}
                    </div>
                    <div className={`text-xs px-1 py-0.5 rounded inline-block ${
                      target.id.startsWith('enemy_') 
                        ? 'bg-red-900 text-red-200' 
                        : 'bg-blue-900 text-blue-200'
                    }`}>
                      {target.id.startsWith('enemy_') ? '👹 Enemy' : '🛡️ Ally'}
                    </div>
                  </button>
                ))}
              </div>
              {getValidTargetsForAction(selectedAction.type).length === 0 && (
                <div className="text-center p-4 bg-gray-700 border border-gray-600 rounded-lg">
                  <p className="text-gray-300">No valid targets for this action.</p>
                </div>
              )}
            </div>
          )}

          {selectedAction && selectedTarget && (
            <div className="text-center pt-6">
              <button
                onClick={() => executeAction(selectedAction.type, selectedTarget.id)}
                disabled={processingTurn}
                className="fantasy-button bg-amber-600 hover:bg-amber-700 text-xl font-bold px-8 py-4 shadow-lg hover:scale-105 transition-all duration-200"
              >
                {processingTurn ? '⚡ Executing...' : `⚔️ Execute ${selectedAction.name}`}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h3 className="text-2xl font-bold text-blue-300 mb-4">
            Waiting for {currentCombatant.name} to act
          </h3>
          <p className="text-blue-200 text-lg">
            Please wait for the current player to make their move.
          </p>
        </div>
      )}
    </div>
  );
} 