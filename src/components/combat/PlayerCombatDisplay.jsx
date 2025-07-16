import React, { useState, useEffect } from 'react';
import { manualCombatService } from '../../services/manualCombat';
import DiceRollModal from './DiceRollModal';

export default function PlayerCombatDisplay({ combatData, currentUserId, partyId }) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [availableActions, setAvailableActions] = useState([]);
  const [validTargets, setValidTargets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastCombatResult, setLastCombatResult] = useState(null);
  const [showDiceModal, setShowDiceModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Update combat options when it's the player's turn - moved to top level
  useEffect(() => {
    if (!combatData) return;
    
    const currentParticipant = combatData?.initiativeOrder?.[combatData?.currentTurn];
    const isMyTurn = currentParticipant?.id === currentUserId;
    
    if (isMyTurn && currentParticipant) {
      updateCombatOptions();
    }
  }, [combatData?.currentTurn, combatData?.initiativeOrder, currentUserId, combatData]);

  // Define functions early to avoid hoisting issues
  const handleDiceRollComplete = async (rollResult) => {
    if (!pendingAction) return;

    try {
      setLoading(true);
      
      // Determine what type of roll this is
      const isAttack = !pendingAction.action.name.includes('Move');
      let customRolls = null;
      
      if (isAttack) {
        // For attacks, we need both attack and damage rolls
        customRolls = {
          attack: rollResult.total
        };
        
        // If it's a hit, we'll need damage roll too
        const targetAC = pendingAction.target.ac || 10;
        const isHit = rollResult.total >= targetAC;
        
        if (isHit) {
          // Show damage roll modal
          setPendingAction(prev => ({
            ...prev,
            attackRoll: rollResult.total,
            isHit: true
          }));
          setShowDiceModal(false);
          // We'll handle damage roll in the next modal
          return;
        }
      }

      // Get the current participant from combat data
      const currentParticipant = combatData?.initiativeOrder?.[combatData?.currentTurn];
      const combatantId = pendingAction.combatant?.id || currentParticipant?.id;

      const result = await manualCombatService.performAction(
        partyId,
        combatantId,
        pendingAction.target.id,
        pendingAction.action.name,
        customRolls
      );
      
      setLastCombatResult(result);
      setSelectedAction(null);
      setSelectedTarget(null);
      setPendingAction(null);
    } catch (error) {
      console.error('Error performing action:', error);
      alert('Failed to perform action');
    } finally {
      setLoading(false);
    }
  };

  const handleDamageRollComplete = async (rollResult) => {
    if (!pendingAction) return;

    try {
      setLoading(true);
      
      const customRolls = {
        attack: pendingAction.attackRoll,
        damage: rollResult.total
      };

      // Get the current participant from combat data
      const currentParticipant = combatData?.initiativeOrder?.[combatData?.currentTurn];
      const combatantId = pendingAction.combatant?.id || currentParticipant?.id;

      const result = await manualCombatService.performAction(
        partyId,
        combatantId,
        pendingAction.target.id,
        pendingAction.action.name,
        customRolls
      );
      
      setLastCombatResult(result);
      setSelectedAction(null);
      setSelectedTarget(null);
      setPendingAction(null);
    } catch (error) {
      console.error('Error performing action:', error);
      alert('Failed to perform action');
    } finally {
      setLoading(false);
    }
  };

  // If no combat data, show a waiting message
  if (!combatData) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">⚔️</div>
        <h3 className="text-lg font-semibold text-slate-200 mb-2">No Combat Data</h3>
        <p className="text-slate-400">Waiting for combat to begin...</p>
      </div>
    );
  }

  // Handle setup phase
  if (combatData.setup && !combatData.active) {
    return (
      <div className="space-y-6">
        {/* Setup Status */}
        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-slate-200">⚔️ Combat Setup</h3>
            <span className="text-amber-400 font-bold">Setup Phase</span>
          </div>
          <p className="text-slate-300 mb-4">
            The Dungeon Master is setting up the combat encounter. You'll see the combat grid and initiative order once combat begins.
          </p>
        </div>

        {/* Combat Grid */}
        <div>
          <h4 className="text-lg font-semibold text-slate-200 mb-3">🗺️ Combat Grid</h4>
          <div className="bg-slate-900 border border-slate-600 rounded-lg p-4 overflow-auto">
            <div className="inline-block">
              {Array.from({ length: 8 }, (_, y) => (
                <div key={y} className="flex">
                  {Array.from({ length: 12 }, (_, x) => {
                    const combatant = combatData.initiativeOrder?.find(p => 
                      p.position && p.position.x === x && p.position.y === y
                    );
                    
                    return (
                      <div
                        key={`${x}-${y}`}
                        className={`w-12 h-12 border border-slate-600 flex items-center justify-center text-sm ${
                          combatant 
                            ? combatant.type === 'player' 
                              ? 'bg-blue-600/50 border-blue-500' 
                              : 'bg-red-600/50 border-red-500'
                            : 'bg-slate-800'
                        } ${
                          combatant?.id === currentUserId ? 'ring-2 ring-blue-400' : ''
                        }`}
                        title={`${x}, ${y}${combatant ? ` - ${combatant.name}` : ''}`}
                      >
                        {combatant ? (
                          <div className="text-center">
                            <div className="text-lg">
                              {combatant.type === 'player' ? '👤' : '👹'}
                            </div>
                            <div className="text-xs text-slate-300">
                              {combatant.name.substring(0, 3)}
                            </div>
                            {combatant.id === currentUserId && (
                              <div className="text-xs text-blue-400">(You)</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">·</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          
          {/* Grid Legend */}
          <div className="mt-3 flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-600/50 border border-blue-500 rounded"></div>
              <span className="text-slate-300">Players</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-600/50 border border-red-500 rounded"></div>
              <span className="text-slate-300">Enemies</span>
            </div>
          </div>
        </div>

        {/* Combatants List */}
        {combatData.initiativeOrder && combatData.initiativeOrder.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-slate-200 mb-3">📋 Combatants</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {combatData.initiativeOrder.map((participant) => (
                <div
                  key={participant.id}
                  className={`flex items-center justify-between p-3 rounded transition-colors ${
                    participant.id === currentUserId ? 'ring-2 ring-blue-500 bg-slate-700' : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      participant.type === 'player' ? 'text-blue-400' : 'text-red-400'
                    }`}>
                      {participant.name}
                    </span>
                    {participant.id === currentUserId && (
                      <span className="text-blue-400 text-xs">(You)</span>
                    )}
                    <span className="text-xs text-slate-400">
                      ({participant.type})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      HP: {participant.hp}/{participant.maxHp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Setup Message */}
        <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-slate-200 mb-2">⏳ Setup in Progress</h4>
          <p className="text-slate-300">
            The Dungeon Master is positioning combatants and preparing the encounter. 
            Combat will begin once initiative is rolled.
          </p>
        </div>
      </div>
    );
  }

  if (!combatData.active) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">⚔️</div>
        <h3 className="text-lg font-semibold text-slate-200 mb-2">Combat Ended</h3>
        <p className="text-slate-400">The combat has concluded.</p>
      </div>
    );
  }

  const currentParticipant = combatData.initiativeOrder?.[combatData.currentTurn];
  const isMyTurn = currentParticipant?.id === currentUserId;

  // Create a 12x8 combat grid
  const createCombatGrid = () => {
    const grid = [];
    for (let y = 0; y < 8; y++) {
      const row = [];
      for (let x = 0; x < 12; x++) {
        row.push(null);
      }
      grid.push(row);
    }

    // Place combatants on the grid
    if (combatData.initiativeOrder) {
      combatData.initiativeOrder.forEach(participant => {
        if (participant.position) {
          const { x, y } = participant.position;
          if (x >= 0 && x < 12 && y >= 0 && y < 8) {
            grid[y][x] = participant;
          }
        }
      });
    }

    return grid;
  };

  const combatGrid = createCombatGrid();

  const updateCombatOptions = async () => {
    try {
      // Get the current participant from combat data
      const currentParticipant = combatData?.initiativeOrder?.[combatData?.currentTurn];
      
      if (!currentParticipant) {
        console.warn('No current participant found for combat options');
        return;
      }

      const [actions, targets] = await Promise.all([
        manualCombatService.getAvailableActions(partyId, currentParticipant.id),
        manualCombatService.getValidTargets(partyId, currentParticipant.id, selectedAction?.name)
      ]);
      setAvailableActions(actions);
      setValidTargets(targets);
    } catch (error) {
      console.error('Error updating combat options:', error);
    }
  };

  const handleActionSelect = async (action) => {
    setSelectedAction(action);
    setSelectedTarget(null);
    
    // Get the current participant from combat data
    const currentParticipant = combatData?.initiativeOrder?.[combatData?.currentTurn];
    
    if (currentParticipant) {
      try {
        const targets = await manualCombatService.getValidTargets(partyId, currentParticipant.id, action.name);
        setValidTargets(targets);
      } catch (error) {
        console.error('Error getting targets for action:', error);
      }
    }
  };

  const performAction = async () => {
    if (!selectedAction || !selectedTarget) {
      alert('Please select both an action and a target.');
      return;
    }

    // Get the current participant from combat data
    const currentParticipant = combatData?.initiativeOrder?.[combatData?.currentTurn];

    // For movement actions, execute immediately without dice rolls
    if (selectedAction.name === 'Move') {
      try {
        setLoading(true);
        
        const result = await manualCombatService.performAction(
          partyId,
          currentParticipant.id,
          selectedTarget.id,
          selectedAction.name,
          null
        );
        
        setLastCombatResult(result);
        setSelectedAction(null);
        setSelectedTarget(null);
      } catch (error) {
        console.error('Error performing movement:', error);
        alert('Failed to perform movement');
      } finally {
        setLoading(false);
      }
      return;
    }

    // For attack actions, show dice modal
    setPendingAction({
      action: selectedAction,
      target: selectedTarget,
      combatant: currentParticipant
    });
    setShowDiceModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Combat Status */}
      <div className="bg-slate-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-slate-300">Round: </span>
            <span className="text-amber-400 font-bold">{combatData.round}</span>
          </div>
          <div>
            <span className="text-slate-300">Turn: </span>
            <span className="text-amber-400 font-bold">{combatData.currentTurn + 1}</span>
            <span className="text-slate-400"> / {combatData.initiativeOrder?.length || 0}</span>
          </div>
        </div>
        
        {currentParticipant && (
          <div className={`p-3 rounded border-2 ${
            isMyTurn 
              ? 'bg-amber-600/30 border-amber-500' 
              : 'bg-slate-600 border-slate-500'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-300">Current: </span>
                <span className={`font-bold ${currentParticipant.type === 'player' ? 'text-blue-400' : 'text-red-400'}`}>
                  {currentParticipant.name}
                </span>
                <span className="text-slate-400 ml-2">
                  (Initiative: {currentParticipant.initiative})
                </span>
              </div>
              {isMyTurn && (
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-lg">👑</span>
                  <span className="text-amber-400 font-semibold">Your Turn!</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Combat Grid */}
      <div>
        <h4 className="text-lg font-semibold text-slate-200 mb-3">🗺️ Combat Grid</h4>
        <div className="bg-slate-900 border border-slate-600 rounded-lg p-4 overflow-auto">
          <div className="inline-block">
            {combatGrid.map((row, y) => (
              <div key={y} className="flex">
                {row.map((combatant, x) => (
                  <div
                    key={`${x}-${y}`}
                    className={`w-12 h-12 border border-slate-600 flex items-center justify-center text-sm ${
                      combatant 
                        ? combatant.type === 'player' 
                          ? 'bg-blue-600/50 border-blue-500' 
                          : 'bg-red-600/50 border-red-500'
                        : 'bg-slate-800'
                    } ${
                      combatant?.id === currentUserId ? 'ring-2 ring-blue-400' : ''
                    } ${
                      combatant?.id === currentParticipant?.id ? 'ring-2 ring-amber-400' : ''
                    }`}
                    title={`${x}, ${y}${combatant ? ` - ${combatant.name}` : ''}`}
                  >
                    {combatant ? (
                      <div className="text-center">
                        <div className="text-lg">
                          {combatant.type === 'player' ? '👤' : '👹'}
                        </div>
                        <div className="text-xs text-slate-300">
                          {combatant.name.substring(0, 3)}
                        </div>
                        {combatant.id === currentUserId && (
                          <div className="text-xs text-blue-400">(You)</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500">·</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        
        {/* Grid Legend */}
        <div className="mt-3 flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-600/50 border border-blue-500 rounded"></div>
            <span className="text-slate-300">Players</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-600/50 border border-red-500 rounded"></div>
            <span className="text-slate-300">Enemies</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 ring-2 ring-amber-400 bg-transparent rounded"></div>
            <span className="text-slate-300">Current Turn</span>
          </div>
        </div>
      </div>

      {/* Initiative Order */}
      {combatData.initiativeOrder && combatData.initiativeOrder.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-slate-200 mb-3">📋 Initiative Order:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {combatData.initiativeOrder.map((participant, index) => (
              <div
                key={participant.id}
                className={`flex items-center justify-between p-3 rounded transition-colors ${
                  index === combatData.currentTurn
                    ? 'bg-amber-600/30 border border-amber-500'
                    : 'bg-slate-700 hover:bg-slate-600'
                } ${participant.id === currentUserId ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    participant.type === 'player' ? 'text-blue-400' : 'text-red-400'
                  }`}>
                    {participant.name}
                  </span>
                  {participant.id === currentUserId && (
                    <span className="text-blue-400 text-xs">(You)</span>
                  )}
                  <span className="text-xs text-slate-400">
                    ({participant.type})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    HP: {participant.hp}/{participant.maxHp}
                  </span>
                  {index === combatData.currentTurn && (
                    <span className="text-amber-400 text-sm">👑</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Player Action Controls */}
      {isMyTurn && (
        <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-blue-300 mb-4">🎯 Your Turn!</h4>
          
          {/* Action Selection */}
          <div className="mb-4">
            <h5 className="text-sm font-semibold text-blue-200 mb-2">Select Action:</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableActions.map((action) => (
                <button
                  key={action.name}
                  onClick={() => handleActionSelect(action)}
                  className={`p-2 rounded text-sm transition-colors ${
                    selectedAction?.name === action.name
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-600 hover:bg-slate-500 text-slate-200'
                  }`}
                >
                  {action.name}
                </button>
              ))}
            </div>
          </div>

          {/* Target Selection */}
          {selectedAction && (
            <div className="mb-4">
              <h5 className="text-sm font-semibold text-blue-200 mb-2">
                {selectedAction.name === 'Move' ? 'Select Position:' : 'Select Target:'}
              </h5>
              {validTargets.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {validTargets.map((target) => (
                    <button
                      key={target.id}
                      onClick={() => setSelectedTarget(target)}
                      className={`p-2 rounded text-sm transition-colors ${
                        selectedTarget?.id === target.id
                          ? 'bg-green-500 text-white'
                          : 'bg-slate-600 hover:bg-slate-500 text-slate-200'
                      }`}
                    >
                      <div className="font-medium">{target.name}</div>
                      {target.type === 'position' && (
                        <div className="text-xs text-slate-400">
                          ({target.x}, {target.y})
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-red-600/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-300 text-sm">
                    {selectedAction.name === 'Basic Attack' 
                      ? 'No enemies within melee range (1 square). Move closer to attack.'
                      : selectedAction.name === 'Ranged Attack'
                      ? 'No enemies within ranged attack range (3 squares). Move closer to attack.'
                      : 'No valid targets available.'
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          {selectedAction && selectedTarget && (
            <div className="mb-4">
              <button
                onClick={performAction}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50"
              >
                {loading ? 'Performing Action...' : `Perform ${selectedAction.name}`}
              </button>
            </div>
          )}

          {/* Range Information */}
          {selectedAction && !selectedAction.name.includes('Move') && (
            <div className="mt-3 p-2 bg-slate-700/50 rounded border border-slate-600/50">
              <div className="text-xs text-slate-300">
                <span className="font-semibold">Range:</span> {
                  selectedAction.name === 'Basic Attack' 
                    ? 'Melee (1 square)'
                    : selectedAction.name === 'Ranged Attack'
                    ? 'Ranged (3 squares)'
                    : selectedAction.range || 'Melee (1 square)'
                }
              </div>
            </div>
          )}

          {/* Combat Result */}
          {lastCombatResult && (
            <div className="mt-4 p-3 bg-slate-700 rounded border border-slate-600">
              <h5 className="text-sm font-semibold text-slate-200 mb-2">Combat Result:</h5>
              <div className="text-sm text-slate-300 space-y-1">
                <div><span className="text-slate-400">Action:</span> {lastCombatResult.action}</div>
                <div><span className="text-slate-400">Target:</span> {lastCombatResult.target}</div>
                {lastCombatResult.attackRoll && (
                  <div><span className="text-slate-400">Attack Roll:</span> {lastCombatResult.attackRoll}</div>
                )}
                {lastCombatResult.damage && (
                  <div><span className="text-slate-400">Damage:</span> {lastCombatResult.damage}</div>
                )}
                {lastCombatResult.targetNewHp !== undefined && (
                  <div><span className="text-slate-400">Target HP:</span> {lastCombatResult.targetNewHp}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Waiting Message */}
      {!isMyTurn && currentParticipant && (
        <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-slate-200 mb-2">⏳ Waiting...</h4>
          <p className="text-slate-300">
            {currentParticipant.type === 'player' 
              ? `Waiting for ${currentParticipant.name} to take their turn...`
              : `The ${currentParticipant.name} is taking their turn...`
            }
          </p>
        </div>
      )}

      {/* Dice Roll Modal */}
      <DiceRollModal
        isOpen={showDiceModal}
        onClose={() => {
          setShowDiceModal(false);
          setPendingAction(null);
        }}
        onRollComplete={pendingAction?.isHit ? handleDamageRollComplete : handleDiceRollComplete}
        diceNotation={
          pendingAction?.isHit 
            ? pendingAction.action.damage || '1d6'
            : '1d20'
        }
        rollType={
          pendingAction?.isHit 
            ? 'Damage Roll'
            : pendingAction?.action.name.includes('Move')
            ? 'Movement'
            : 'Attack Roll'
        }
        modifier={
          pendingAction?.isHit 
            ? 0
            : pendingAction?.action.name.includes('Move')
            ? 0
            : Math.floor(((combatData?.initiativeOrder?.[combatData?.currentTurn]?.character?.dexterity || 10) - 10) / 2)
        }
      />
    </div>
  );
} 