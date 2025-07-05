import React, { useState, useEffect } from 'react';

export default function PlayerDeath({ deadPlayer, combatSession, onSpectate }) {
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const alivePartyMembers = combatSession?.partyMembers?.filter(member => member.hp > 0) || [];
  const aliveEnemies = combatSession?.enemies?.filter(enemy => enemy.hp > 0) || [];

  return (
    <div className="fantasy-container py-8">
      <div className="fantasy-card bg-red-50 border-red-200">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">💀</div>
          <h1 className="text-3xl font-bold text-red-800 mb-4">Character Death</h1>
          <div className="text-xl text-red-700 mb-6">
            {deadPlayer.name} has fallen in battle...
          </div>
          
          {/* Fallen Hero Details */}
          <div className="bg-white p-6 rounded-lg border border-red-300 mb-6">
            <h2 className="text-lg font-semibold text-stone-800 mb-2">Fallen Hero</h2>
            <p className="text-stone-600 mb-2">
              <strong>Name:</strong> {deadPlayer.name}
            </p>
            <p className="text-stone-600 mb-2">
              <strong>Class:</strong> {deadPlayer.class}
            </p>
            <p className="text-stone-600 mb-2">
              <strong>Level:</strong> {deadPlayer.level}
            </p>
            <p className="text-stone-600 mb-2">
              <strong>Final HP:</strong> {deadPlayer.hp}/{deadPlayer.maxHp}
            </p>
            <p className="text-stone-600">
              <strong>Time of Death:</strong> {formatTime(timeElapsed)}
            </p>
          </div>

          {/* Combat Status */}
          <div className="bg-gray-100 p-6 rounded-lg border border-gray-300 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Combat Status</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <p className="font-semibold text-green-700">Alive Allies</p>
                <p className="text-2xl font-bold text-green-600">{alivePartyMembers.length}</p>
                <div className="text-xs text-gray-600 mt-1">
                  {alivePartyMembers.map(member => member.name).join(', ')}
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold text-red-700">Remaining Enemies</p>
                <p className="text-2xl font-bold text-red-600">{aliveEnemies.length}</p>
                <div className="text-xs text-gray-600 mt-1">
                  {aliveEnemies.map(enemy => enemy.name).join(', ')}
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">What happens next?</h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• You must wait for combat to end</li>
                <li>• If your allies win, you'll create a new character</li>
                <li>• If all allies die, the campaign ends</li>
                <li>• Your new character will join the story where it left off</li>
              </ul>
            </div>
            
            <button
              onClick={onSpectate}
              className="fantasy-button bg-gray-600 hover:bg-gray-700 text-white"
            >
              Spectate Combat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 