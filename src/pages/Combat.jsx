import { useState } from 'react';
import { useParams } from 'react-router-dom';

export default function Combat() {
  const { partyId } = useParams();
  const [combatState, setCombatState] = useState('preparation'); // preparation, active, ended
  const [initiative, setInitiative] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);

  // Mock data - replace with real data from Firebase
  const partyMembers = [
    {
      id: 1,
      name: 'Thorin Ironfist',
      class: 'Fighter',
      level: 5,
      hp: 45,
      maxHp: 45,
      ac: 18,
      initiative: 15,
      portrait: '/placeholder-character.png'
    },
    {
      id: 2,
      name: 'Elara Moonwhisper',
      class: 'Wizard',
      level: 5,
      hp: 28,
      maxHp: 28,
      ac: 14,
      initiative: 12,
      portrait: '/placeholder-character.png'
    }
  ];

  const enemies = [
    {
      id: 1,
      name: 'Goblin Scout',
      type: 'Goblin',
      hp: 12,
      maxHp: 12,
      ac: 14,
      initiative: 8,
      portrait: '/placeholder-enemy.png'
    },
    {
      id: 2,
      name: 'Orc Warrior',
      type: 'Orc',
      hp: 30,
      maxHp: 30,
      ac: 16,
      initiative: 10,
      portrait: '/placeholder-enemy.png'
    }
  ];

  const startCombat = () => {
    const allCombatants = [...partyMembers, ...enemies];
    const sortedInitiative = allCombatants.sort((a, b) => b.initiative - a.initiative);
    setInitiative(sortedInitiative);
    setCombatState('active');
    setCurrentTurn(0);
  };

  const nextTurn = () => {
    setCurrentTurn((prev) => (prev + 1) % initiative.length);
  };

  const previousTurn = () => {
    setCurrentTurn((prev) => (prev - 1 + initiative.length) % initiative.length);
  };

  const endCombat = () => {
    setCombatState('ended');
  };

  const updateHp = (combatantId, newHp) => {
    // TODO: Update HP in Firebase
    console.log(`Updating HP for ${combatantId} to ${newHp}`);
  };

  return (
    <div className="fantasy-container py-8">
      <div className="fantasy-card">
        <div className="flex justify-between items-center mb-6">
          <h1 className="fantasy-title mb-0">Combat Tracker</h1>
          <div className="space-x-2">
            {combatState === 'preparation' && (
              <button onClick={startCombat} className="fantasy-button">
                Start Combat
              </button>
            )}
            {combatState === 'active' && (
              <>
                <button onClick={previousTurn} className="fantasy-button bg-stone-600 hover:bg-stone-700">
                  Previous Turn
                </button>
                <button onClick={nextTurn} className="fantasy-button">
                  Next Turn
                </button>
                <button onClick={endCombat} className="fantasy-button bg-red-600 hover:bg-red-700">
                  End Combat
                </button>
              </>
            )}
          </div>
        </div>

        {/* Initiative Tracker */}
        {combatState === 'active' && (
          <div className="fantasy-card bg-amber-50 mb-6">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Initiative Order</h2>
            <div className="space-y-2">
              {initiative.map((combatant, index) => (
                <div
                  key={combatant.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    index === currentTurn
                      ? 'bg-amber-200 border-2 border-amber-600'
                      : 'bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-stone-800">#{index + 1}</span>
                    <div className="w-8 h-8 bg-stone-300 rounded-full flex items-center justify-center">
                      <span className="text-xs text-stone-600">IMG</span>
                    </div>
                    <div>
                      <div className="font-medium text-stone-800">{combatant.name}</div>
                      <div className="text-sm text-stone-600">
                        {combatant.class || combatant.type} • Initiative: {combatant.initiative}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-stone-800">
                      HP: {combatant.hp}/{combatant.maxHp}
                    </div>
                    <div className="text-sm text-stone-600">AC: {combatant.ac}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Combat Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Party Members */}
          <div>
            <h2 className="text-2xl font-bold text-stone-800 mb-4">Party Members</h2>
            <div className="space-y-4">
              {partyMembers.map(member => (
                <div key={member.id} className="fantasy-card bg-green-50">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-stone-300 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-stone-600">IMG</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-stone-800">{member.name}</h3>
                      <p className="text-sm text-stone-600">
                        Level {member.level} {member.class}
                      </p>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-stone-700">HP:</span>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={member.hp}
                              onChange={(e) => updateHp(member.id, parseInt(e.target.value))}
                              className="w-16 fantasy-input text-sm"
                              min="0"
                              max={member.maxHp}
                            />
                            <span className="text-sm text-stone-600">/ {member.maxHp}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-stone-700">AC:</span>
                          <span className="text-sm font-medium">{member.ac}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-stone-700">Initiative:</span>
                          <span className="text-sm font-medium">{member.initiative}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enemies */}
          <div>
            <h2 className="text-2xl font-bold text-stone-800 mb-4">Enemies</h2>
            <div className="space-y-4">
              {enemies.map(enemy => (
                <div key={enemy.id} className="fantasy-card bg-red-50">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-stone-300 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-stone-600">IMG</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-stone-800">{enemy.name}</h3>
                      <p className="text-sm text-stone-600">{enemy.type}</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-stone-700">HP:</span>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={enemy.hp}
                              onChange={(e) => updateHp(enemy.id, parseInt(e.target.value))}
                              className="w-16 fantasy-input text-sm"
                              min="0"
                              max={enemy.maxHp}
                            />
                            <span className="text-sm text-stone-600">/ {enemy.maxHp}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-stone-700">AC:</span>
                          <span className="text-sm font-medium">{enemy.ac}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-stone-700">Initiative:</span>
                          <span className="text-sm font-medium">{enemy.initiative}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Combat Controls */}
        {combatState === 'preparation' && (
          <div className="mt-6 text-center py-8 text-stone-600">
            <p>Prepare your party and enemies, then click "Start Combat" to begin.</p>
          </div>
        )}

        {combatState === 'ended' && (
          <div className="mt-6 text-center py-8">
            <h3 className="text-xl font-bold text-stone-800 mb-2">Combat Ended</h3>
            <p className="text-stone-600">The battle has concluded.</p>
          </div>
        )}
      </div>
    </div>
  );
} 