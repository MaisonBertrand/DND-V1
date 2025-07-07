import React, { useState, useEffect } from 'react';
import { initiativeTrackerService } from '../../services/initiativeTracker';

export default function DMInitiativeTracker({ partyId, partyCharacters }) {
  const [initiativeOrder, setInitiativeOrder] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [round, setRound] = useState(1);
  const [combatActive, setCombatActive] = useState(false);
  const [enemies, setEnemies] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCombatState();
  }, [partyId]);

  const loadCombatState = async () => {
    try {
      const combatState = await initiativeTrackerService.getCombatState(partyId);
      if (combatState && combatState.active) {
        setInitiativeOrder(combatState.initiativeOrder);
        setCurrentTurn(combatState.currentTurn);
        setRound(combatState.round);
        setCombatActive(true);
      }
    } catch (error) {
      console.error('Error loading combat state:', error);
    }
  };

  const handleStartCombat = async () => {
    try {
      setLoading(true);
      
      // Combine players and enemies
      const participants = [
        ...partyCharacters.map(char => ({
          id: char.id,
          name: char.name,
          type: 'player',
          initiativeModifier: char.dexterity ? Math.floor((char.dexterity - 10) / 2) : 0
        })),
        ...enemies.map(enemy => ({
          id: enemy.id,
          name: enemy.name,
          type: 'enemy',
          initiativeModifier: enemy.initiativeModifier || 0
        }))
      ];

      if (participants.length === 0) {
        alert('No participants to roll initiative for!');
        return;
      }

      const results = await initiativeTrackerService.rollInitiative(partyId, participants);
      setInitiativeOrder(results);
      setCurrentTurn(0);
      setRound(1);
      setCombatActive(true);
    } catch (error) {
      console.error('Error starting combat:', error);
      alert('Failed to start combat');
    } finally {
      setLoading(false);
    }
  };

  const handleNextTurn = async () => {
    try {
      const result = await initiativeTrackerService.nextTurn(partyId);
      setCurrentTurn(result.currentTurn);
      setRound(result.round);
    } catch (error) {
      console.error('Error advancing turn:', error);
    }
  };

  const handleEndCombat = async () => {
    try {
      await initiativeTrackerService.endCombat(partyId);
      setCombatActive(false);
      setInitiativeOrder([]);
      setCurrentTurn(0);
      setRound(1);
    } catch (error) {
      console.error('Error ending combat:', error);
    }
  };

  const addEnemy = () => {
    const newEnemy = {
      id: `enemy_${Date.now()}`,
      name: `Enemy ${enemies.length + 1}`,
      initiativeModifier: 0
    };
    setEnemies([...enemies, newEnemy]);
  };

  const removeEnemy = (enemyId) => {
    setEnemies(enemies.filter(e => e.id !== enemyId));
  };

  const updateEnemy = (enemyId, field, value) => {
    setEnemies(enemies.map(e => 
      e.id === enemyId ? { ...e, [field]: value } : e
    ));
  };

  const getCurrentParticipant = () => {
    if (initiativeOrder.length === 0 || currentTurn >= initiativeOrder.length) {
      return null;
    }
    return initiativeOrder[currentTurn];
  };

  const currentParticipant = getCurrentParticipant();

  return (
    <div className="fantasy-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-100">⚔️ Initiative Tracker</h3>
        <div className="flex gap-2">
          {!combatActive ? (
            <button
              onClick={handleStartCombat}
              disabled={loading}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-sm disabled:opacity-50"
            >
              {loading ? 'Rolling...' : '🎲 Roll Initiative'}
            </button>
          ) : (
            <>
              <button
                onClick={handleNextTurn}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
              >
                ⏭️ Next Turn
              </button>
              <button
                onClick={handleEndCombat}
                className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
              >
                🏁 End Combat
              </button>
            </>
          )}
        </div>
      </div>

      {/* Combat Status */}
      {combatActive && (
        <div className="mb-4 p-3 bg-slate-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-300">Round: </span>
              <span className="text-amber-400 font-bold">{round}</span>
            </div>
            <div>
              <span className="text-slate-300">Turn: </span>
              <span className="text-amber-400 font-bold">{currentTurn + 1}</span>
              <span className="text-slate-400"> / {initiativeOrder.length}</span>
            </div>
          </div>
          {currentParticipant && (
            <div className="mt-2 p-2 bg-slate-600 rounded">
              <span className="text-slate-300">Current: </span>
              <span className={`font-bold ${currentParticipant.type === 'player' ? 'text-blue-400' : 'text-red-400'}`}>
                {currentParticipant.name}
              </span>
              <span className="text-slate-400 ml-2">
                (Initiative: {currentParticipant.initiative})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Enemy Management */}
      {!combatActive && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-300">Enemies:</h4>
            <button
              onClick={addEnemy}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-1 px-3 rounded text-sm transition-all duration-300"
            >
              ➕ Add Enemy
            </button>
          </div>
          <div className="space-y-2">
            {enemies.map((enemy) => (
              <div key={enemy.id} className="flex items-center gap-2 bg-slate-700 p-2 rounded">
                <input
                  type="text"
                  value={enemy.name}
                  onChange={(e) => updateEnemy(enemy.id, 'name', e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-600 text-slate-100 px-2 py-1 rounded text-sm focus:border-slate-500 focus:outline-none"
                  placeholder="Enemy name"
                />
                <input
                  type="number"
                  value={enemy.initiativeModifier}
                  onChange={(e) => updateEnemy(enemy.id, 'initiativeModifier', parseInt(e.target.value) || 0)}
                  className="w-16 bg-slate-800 border border-slate-600 text-slate-100 px-2 py-1 rounded text-sm focus:border-slate-500 focus:outline-none"
                  placeholder="+0"
                />
                <button
                  onClick={() => removeEnemy(enemy.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Initiative Order */}
      {combatActive && initiativeOrder.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">Initiative Order:</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {initiativeOrder.map((participant, index) => (
              <div
                key={participant.id}
                className={`flex items-center justify-between p-2 rounded transition-colors ${
                  index === currentTurn
                    ? 'bg-amber-600/30 border border-amber-500'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    participant.type === 'player' ? 'text-blue-400' : 'text-red-400'
                  }`}>
                    {participant.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({participant.type})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {participant.roll} + {participant.modifier} = {participant.initiative}
                  </span>
                  {index === currentTurn && (
                    <span className="text-amber-400 text-sm">👑</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Player Characters */}
      {!combatActive && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">Player Characters:</h4>
          <div className="space-y-1">
            {partyCharacters.map((char) => (
              <div key={char.id} className="flex items-center justify-between bg-slate-700 p-2 rounded">
                <span className="text-blue-400 font-medium">{char.name}</span>
                <span className="text-xs text-slate-400">
                  Initiative: +{char.dexterity ? Math.floor((char.dexterity - 10) / 2) : 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 