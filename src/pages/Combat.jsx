import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { 
  getCombatSession, 
  updateCombatSession, 
  subscribeToCombatSession,
  updateCampaignStory 
} from '../firebase/database';

export default function Combat() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [combatSession, setCombatSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user && partyId) {
      loadCombatData();
    }
  }, [user, partyId]);

  useEffect(() => {
    if (partyId) {
      const unsubscribe = subscribeToCombatSession(partyId, (session) => {
        setCombatSession(session);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [partyId]);

  const loadCombatData = async () => {
    try {
      setLoading(true);
      const session = await getCombatSession(partyId);
      if (!session) {
        // No active combat session, redirect back to story
        navigate(`/campaign-story/${partyId}`);
        return;
      }
      setCombatSession(session);
    } catch (error) {
      console.error('Error loading combat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateEnemiesFromContext = (context, partySize) => {
    const enemyTypes = {
      'goblin': { name: 'Goblin', hp: 12, ac: 14, level: 1 },
      'orc': { name: 'Orc', hp: 30, ac: 16, level: 3 },
      'troll': { name: 'Troll', hp: 84, ac: 15, level: 5 },
      'dragon': { name: 'Dragon', hp: 200, ac: 19, level: 10 },
      'bandit': { name: 'Bandit', hp: 16, ac: 12, level: 1 },
      'skeleton': { name: 'Skeleton', hp: 13, ac: 13, level: 1 },
      'zombie': { name: 'Zombie', hp: 22, ac: 8, level: 1 }
    };

    const contextLower = context.toLowerCase();
    let enemyType = 'bandit'; // default

    // Determine enemy type from context
    if (contextLower.includes('goblin')) enemyType = 'goblin';
    else if (contextLower.includes('orc')) enemyType = 'orcs';
    else if (contextLower.includes('troll')) enemyType = 'troll';
    else if (contextLower.includes('dragon')) enemyType = 'dragon';
    else if (contextLower.includes('undead') || contextLower.includes('skeleton')) enemyType = 'skeleton';
    else if (contextLower.includes('zombie')) enemyType = 'zombie';

    const baseEnemy = enemyTypes[enemyType];
    const enemyCount = Math.min(partySize + 1, 6); // Balance with party size

    const generatedEnemies = [];
    for (let i = 0; i < enemyCount; i++) {
      generatedEnemies.push({
        id: `enemy_${i}`,
        name: `${baseEnemy.name} ${i + 1}`,
        type: baseEnemy.name,
        hp: baseEnemy.hp + Math.floor(Math.random() * 10),
        maxHp: baseEnemy.hp + Math.floor(Math.random() * 10),
        ac: baseEnemy.ac + Math.floor(Math.random() * 3),
        initiative: Math.floor(Math.random() * 20) + 1,
        portrait: '/placeholder-enemy.png'
      });
    }

    return generatedEnemies;
  };

  const startCombat = async () => {
    if (!combatSession) return;
    
    // Generate enemies if not already present
    let enemies = combatSession.enemies;
    if (enemies.length === 0) {
      enemies = generateEnemiesFromContext(combatSession.storyContext, combatSession.partyMembers.length);
    }
    
    const allCombatants = [...combatSession.partyMembers, ...enemies];
    const sortedInitiative = allCombatants.sort((a, b) => b.initiative - a.initiative);
    
    await updateCombatSession(combatSession.id, {
      enemies: enemies,
      initiative: sortedInitiative,
      currentTurn: 0,
      combatState: 'active'
    });
  };

  const nextTurn = async () => {
    if (!combatSession) return;
    const newTurn = (combatSession.currentTurn + 1) % combatSession.initiative.length;
    await updateCombatSession(combatSession.id, {
      currentTurn: newTurn
    });
  };

  const previousTurn = async () => {
    if (!combatSession) return;
    const newTurn = (combatSession.currentTurn - 1 + combatSession.initiative.length) % combatSession.initiative.length;
    await updateCombatSession(combatSession.id, {
      currentTurn: newTurn
    });
  };

  const endCombat = async () => {
    if (!combatSession) return;
    
    // Mark combat session as ended
    await updateCombatSession(combatSession.id, {
      status: 'ended',
      combatState: 'ended'
    });
    
    // Return story to active state
    await updateCampaignStory(partyId, {
      status: 'storytelling',
      currentCombat: null
    });
    
    // Navigate back to story
    navigate(`/campaign-story/${partyId}`);
  };

  const updateHp = async (combatantId, newHp) => {
    if (!combatSession) return;
    
    const clampedHp = Math.max(0, newHp);
    
    if (combatantId.startsWith('enemy_')) {
      const updatedEnemies = combatSession.enemies.map(enemy => 
        enemy.id === combatantId ? { ...enemy, hp: clampedHp } : enemy
      );
      await updateCombatSession(combatSession.id, {
        enemies: updatedEnemies
      });
    } else {
      const updatedPartyMembers = combatSession.partyMembers.map(member => 
        member.id === combatantId ? { ...member, hp: clampedHp } : member
      );
      await updateCombatSession(combatSession.id, {
        partyMembers: updatedPartyMembers
      });
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <div className="text-center py-8">
            <div className="text-stone-600">Loading combat...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!combatSession) {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <div className="text-center py-8">
            <div className="text-stone-600">No active combat session found.</div>
            <button 
              onClick={() => navigate(`/campaign-story/${partyId}`)}
              className="fantasy-button mt-4"
            >
              Return to Story
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">⚔️ Battle Arena</h1>
          <div className="space-x-2">
            {combatSession.combatState === 'preparation' && (
              <button onClick={startCombat} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg">
                🚀 Start Battle
              </button>
            )}
            {combatSession.combatState === 'active' && (
              <>
                <button onClick={previousTurn} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg">
                  ⬅️ Previous
                </button>
                <button onClick={nextTurn} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg">
                  Next ➡️
                </button>
                <button onClick={endCombat} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg">
                  🏁 End Battle
                </button>
              </>
            )}
            {combatSession.storyContext && (
              <button 
                onClick={() => navigate(`/campaign-story/${partyId}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg"
              >
                📖 Return to Story
              </button>
            )}
          </div>
        </div>

        {/* Story Context */}
        {combatSession.storyContext && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 mb-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Battle Context</h2>
            <p className="text-gray-700 italic">{combatSession.storyContext}</p>
          </div>
        )}

        {/* Pokemon-Style Battle Arena */}
        <div className="bg-gradient-to-b from-green-300 via-green-400 to-green-500 rounded-2xl p-6 shadow-2xl border-4 border-green-600">
          {/* Battle Field */}
          <div className="relative h-96 mb-6">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-b from-green-200 to-green-300 rounded-xl"></div>
            
            {/* Party Side (Left) */}
            <div className="absolute left-4 bottom-4 w-1/2">
              <div className="grid grid-cols-2 gap-4">
                {combatSession.partyMembers.map((member, index) => (
                  <div key={member.id} className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border-2 border-blue-300">
                    <div className="flex items-center space-x-2">
                      <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center border-2 border-blue-400">
                        <span className="text-blue-800 font-bold text-sm">
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-800 text-sm">{member.name}</div>
                        <div className="text-xs text-gray-600">{member.class}</div>
                        <div className="mt-1">
                          <div className="bg-red-200 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(member.hp / member.maxHp) * 100}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            HP: {member.hp}/{member.maxHp}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Enemy Side (Right) */}
            <div className="absolute right-4 top-4 w-1/2">
              <div className="grid grid-cols-2 gap-4">
                {combatSession.enemies.map((enemy, index) => (
                  <div key={enemy.id} className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border-2 border-red-300">
                    <div className="flex items-center space-x-2">
                      <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center border-2 border-red-400">
                        <span className="text-red-800 font-bold text-sm">
                          {enemy.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-800 text-sm">{enemy.name}</div>
                        <div className="text-xs text-gray-600">{enemy.type}</div>
                        <div className="mt-1">
                          <div className="bg-red-200 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            HP: {enemy.hp}/{enemy.maxHp}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Battle Center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-4xl text-white drop-shadow-lg font-bold">
                ⚔️ VS ⚔️
              </div>
            </div>
          </div>

          {/* Initiative Tracker */}
          {combatSession.combatState === 'active' && (
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 mb-3">🎯 Turn Order</h3>
              <div className="flex flex-wrap gap-2">
                {combatSession.initiative.map((combatant, index) => (
                  <div
                    key={combatant.id}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      index === combatSession.currentTurn
                        ? 'bg-yellow-400 text-yellow-900 shadow-lg scale-105'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-bold">#{index + 1}</span>
                      <span>{combatant.name}</span>
                      <span className="text-xs opacity-75">({combatant.class || combatant.type})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detailed Stats Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Party Stats */}
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">👥 Your Party</h3>
            <div className="space-y-3">
              {combatSession.partyMembers.map(member => (
                <div key={member.id} className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-800">{member.name}</div>
                      <div className="text-sm text-gray-600">Level {member.level} {member.class}</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-700">HP:</span>
                        <input
                          type="number"
                          value={member.hp}
                          onChange={(e) => updateHp(member.id, parseInt(e.target.value))}
                          className="w-16 bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                          min="0"
                          max={member.maxHp}
                        />
                        <span className="text-sm text-gray-600">/ {member.maxHp}</span>
                      </div>
                      <div className="text-sm text-gray-600">AC: {member.ac}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enemy Stats */}
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">👹 Enemies</h3>
            <div className="space-y-3">
              {combatSession.enemies.map(enemy => (
                <div key={enemy.id} className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-800">{enemy.name}</div>
                      <div className="text-sm text-gray-600">{enemy.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-700">HP:</span>
                        <input
                          type="number"
                          value={enemy.hp}
                          onChange={(e) => updateHp(enemy.id, parseInt(e.target.value))}
                          className="w-16 bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                          min="0"
                          max={enemy.maxHp}
                        />
                        <span className="text-sm text-gray-600">/ {enemy.maxHp}</span>
                      </div>
                      <div className="text-sm text-gray-600">AC: {enemy.ac}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Combat Status */}
        {combatSession.combatState === 'preparation' && (
          <div className="mt-6 text-center py-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-2">🎮 Battle Preparation</h3>
              <p className="text-gray-600">Your party is ready! Click "Start Battle" to begin the epic confrontation.</p>
            </div>
          </div>
        )}

        {combatSession.combatState === 'ended' && (
          <div className="mt-6 text-center py-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-2">🏆 Battle Concluded</h3>
              <p className="text-gray-600">The epic battle has ended. Return to your adventure!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 