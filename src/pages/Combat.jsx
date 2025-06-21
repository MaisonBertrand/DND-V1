import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { 
  getCombatSession, 
  updateCombatSession, 
  subscribeToCombatSession,
  updateCampaignStory,
  getPartyCharacters
} from '../firebase/database';

export default function Combat() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [combatSession, setCombatSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [partyCharacters, setPartyCharacters] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

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
      const characters = await getPartyCharacters(partyId);
      setPartyCharacters(characters);
      
      if (!session) {
        // No active combat session, redirect back to story
        console.log('No combat session found, navigating to story with partyId:', partyId);
        try {
          navigate(`/campaign-story/${partyId}`);
        } catch (error) {
          console.error('Navigation error in loadCombatData:', error);
          navigate('/dashboard');
        }
        return;
      }
      
      // Check if there are enemies to fight
      if (session.enemies && session.enemies.length === 0) {
        // No enemies to fight, show message and redirect
        setCombatSession({ ...session, status: 'no_enemies' });
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
      'goblin': { name: 'Goblin', hp: 12, ac: 14, level: 1, charisma: 8 },
      'orc': { name: 'Orc', hp: 30, ac: 16, level: 3, charisma: 12 },
      'troll': { name: 'Troll', hp: 84, ac: 15, level: 5, charisma: 7 },
      'dragon': { name: 'Dragon', hp: 200, ac: 19, level: 10, charisma: 19 },
      'bandit': { name: 'Bandit', hp: 16, ac: 12, level: 1, charisma: 10 },
      'skeleton': { name: 'Skeleton', hp: 13, ac: 13, level: 1, charisma: 5 },
      'zombie': { name: 'Zombie', hp: 22, ac: 8, level: 1, charisma: 3 }
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
        charisma: baseEnemy.charisma,
        portrait: '/placeholder-enemy.png'
      });
    }

    return generatedEnemies;
  };

  const startCombat = async () => {
    if (!combatSession) return;
    
    // Generate enemies if not already present
    let enemies = combatSession.enemies;
    if (!enemies || enemies.length === 0) {
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
    setSelectedAction(null);
    setSelectedTarget(null);
    setActionMessage('');
  };

  const previousTurn = async () => {
    if (!combatSession) return;
    const newTurn = (combatSession.currentTurn - 1 + combatSession.initiative.length) % combatSession.initiative.length;
    await updateCombatSession(combatSession.id, {
      currentTurn: newTurn
    });
    setSelectedAction(null);
    setSelectedTarget(null);
    setActionMessage('');
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
    try {
      console.log('Ending combat, navigating to story with partyId:', partyId);
      navigate(`/campaign-story/${partyId}`);
    } catch (error) {
      console.error('Navigation error in endCombat:', error);
      navigate('/dashboard');
    }
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

  const getCurrentCombatant = () => {
    if (!combatSession?.initiative || combatSession.currentTurn === undefined) return null;
    return combatSession.initiative[combatSession.currentTurn];
  };

  const isCurrentUserTurn = () => {
    const currentCombatant = getCurrentCombatant();
    return currentCombatant && currentCombatant.userId === user?.uid;
  };

  const getCurrentUserCharacter = () => {
    return partyCharacters.find(char => char.userId === user?.uid);
  };

  const handleAttack = async (weapon, target) => {
    if (!combatSession || !weapon || !target) return;
    
    const currentChar = getCurrentUserCharacter();
    if (!currentChar) return;
    
    // Simple attack calculation
    const attackRoll = Math.floor(Math.random() * 20) + 1;
    const attackBonus = Math.floor((currentChar.strength - 10) / 2);
    const totalAttack = attackRoll + attackBonus;
    
    let message = `${currentChar.name} attacks ${target.name} with ${weapon}...\n`;
    message += `Attack roll: ${attackRoll} + ${attackBonus} = ${totalAttack} vs AC ${target.ac}\n`;
    
    if (totalAttack >= target.ac) {
      // Hit! Calculate damage
      const damage = Math.floor(Math.random() * 8) + 1 + attackBonus; // Simple damage calculation
      const newHp = Math.max(0, target.hp - damage);
      
      message += `HIT! Deals ${damage} damage. ${target.name} HP: ${target.hp} → ${newHp}`;
      
      await updateHp(target.id, newHp);
    } else {
      message += `MISS! The attack misses.`;
    }
    
    setActionMessage(message);
    setTimeout(() => {
      setActionMessage('');
      nextTurn();
    }, 3000);
  };

  const handleSpell = async (spell, target) => {
    if (!combatSession || !spell || !target) return;
    
    const currentChar = getCurrentUserCharacter();
    if (!currentChar) return;
    
    let message = `${currentChar.name} casts ${spell.name} on ${target.name}...\n`;
    message += `${spell.description}\n`;
    
    // Simple spell effect
    const damage = Math.floor(Math.random() * 6) + 1;
    const newHp = Math.max(0, target.hp - damage);
    
    message += `Deals ${damage} damage. ${target.name} HP: ${target.hp} → ${newHp}`;
    
    await updateHp(target.id, newHp);
    
    setActionMessage(message);
    setTimeout(() => {
      setActionMessage('');
      nextTurn();
    }, 3000);
  };

  const handlePersuade = async (target) => {
    if (!combatSession || !target) return;
    
    const currentChar = getCurrentUserCharacter();
    if (!currentChar) return;
    
    // Calculate persuasion based on charisma
    const charismaMod = Math.floor((currentChar.charisma - 10) / 2);
    const persuasionRoll = Math.floor(Math.random() * 20) + 1 + charismaMod;
    const targetDC = target.charisma + 10; // Target's charisma + 10 as DC
    
    let message = `${currentChar.name} attempts to persuade ${target.name}...\n`;
    message += `Charisma modifier: ${charismaMod}\n`;
    message += `Persuasion roll: ${persuasionRoll} vs DC ${targetDC}\n`;
    
    if (persuasionRoll >= targetDC) {
      message += `SUCCESS! ${target.name} is persuaded and may consider peaceful resolution.`;
      // Could implement actual peaceful resolution logic here
    } else {
      message += `FAILURE! ${target.name} is not persuaded and remains hostile.`;
    }
    
    setActionMessage(message);
    setTimeout(() => {
      setActionMessage('');
      nextTurn();
    }, 3000);
  };

  const handleInventoryUse = async (item, target) => {
    if (!combatSession || !item || !target) return;
    
    const currentChar = getCurrentUserCharacter();
    if (!currentChar) return;
    
    let message = `${currentChar.name} uses ${item} on ${target.name}...\n`;
    
    // Simple item effects
    if (item.toLowerCase().includes('healing') || item.toLowerCase().includes('potion')) {
      const healing = Math.floor(Math.random() * 8) + 1;
      const newHp = Math.min(target.maxHp, target.hp + healing);
      message += `Heals ${healing} HP. ${target.name} HP: ${target.hp} → ${newHp}`;
      await updateHp(target.id, newHp);
    } else {
      message += `Uses ${item} but it has no combat effect.`;
    }
    
    setActionMessage(message);
    setTimeout(() => {
      setActionMessage('');
      nextTurn();
    }, 3000);
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <div className="text-center py-8">
            <div className="text-stone-600 mb-4">⚔️ Setting up battle arena...</div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-600 mx-auto"></div>
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
              onClick={async () => {
                // Resume the story from where it was paused
                await updateCampaignStory(partyId, {
                  status: 'storytelling',
                  currentCombat: null
                });
                
                // Navigate back to story
                try {
                  console.log('Returning to story from no combat session, partyId:', partyId);
                  navigate(`/campaign-story/${partyId}`);
                } catch (error) {
                  console.error('Navigation error in return to story:', error);
                  navigate('/dashboard');
                }
              }}
              className="fantasy-button mt-4"
            >
              Return to Story
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no enemies to fight
  if (combatSession.status === 'no_enemies' || (combatSession.enemies && combatSession.enemies.length === 0)) {
    const [returning, setReturning] = useState(false);
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🕊️</div>
            <h2 className="text-2xl font-bold text-stone-800 mb-4">No Enemies to Fight</h2>
            <p className="text-stone-600 mb-6">
              There are no enemies present in this area. Combat cannot begin.
            </p>
            <div className="space-y-3">
              <button 
                onClick={async () => {
                  if (returning) return;
                  setReturning(true);
                  try {
                    // Resume the story from where it was paused
                    await updateCampaignStory(partyId, {
                      status: 'storytelling',
                      currentCombat: null
                    });
                    // Navigate back to story
                    navigate(`/campaign-story/${partyId}`);
                  } catch (error) {
                    console.error('Error returning to story:', error);
                    // Fallback: try to navigate anyway
                    try {
                      navigate(`/campaign-story/${partyId}`);
                    } catch (navError) {
                      console.error('Navigation also failed:', navError);
                      navigate('/dashboard');
                    }
                  } finally {
                    setReturning(false);
                  }
                }}
                className="fantasy-button"
                disabled={returning}
              >
                {returning ? 'Returning...' : 'Return to Story'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentCombatant = getCurrentCombatant();
  const isUserTurn = isCurrentUserTurn();
  const currentUserChar = getCurrentUserCharacter();

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
                onClick={async () => {
                  // Resume the story from where it was paused
                  await updateCampaignStory(partyId, {
                    status: 'storytelling',
                    currentCombat: null
                  });
                  
                  // Navigate back to story
                  try {
                    console.log('Returning to story from combat header, partyId:', partyId);
                    navigate(`/campaign-story/${partyId}`);
                  } catch (error) {
                    console.error('Navigation error in return to story:', error);
                    navigate('/dashboard');
                  }
                }}
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

        {/* Turn Order Display */}
        {combatSession.combatState === 'active' && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 mb-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-3">🎯 Turn Order</h3>
            <div className="flex flex-wrap gap-3">
              {combatSession.initiative.map((combatant, index) => (
                <div
                  key={combatant.id}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    index === combatSession.currentTurn
                      ? 'bg-yellow-400 text-yellow-900 shadow-lg scale-105'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    combatant.userId ? 'bg-blue-200 border-blue-400' : 'bg-red-200 border-red-400'
                  }`}>
                    <span className="font-bold text-xs">
                      {combatant.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-bold">#{index + 1}</div>
                    <div className="text-xs">{combatant.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Turn Display */}
        {combatSession.combatState === 'active' && currentCombatant && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 mb-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-3">
              {isUserTurn ? '🎮 Your Turn!' : '⏳ Waiting...'}
            </h3>
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 ${
                currentCombatant.userId ? 'bg-blue-200 border-blue-400' : 'bg-red-200 border-red-400'
              }`}>
                <span className="font-bold text-xl">
                  {currentCombatant.name.charAt(0)}
                </span>
              </div>
              <div>
                <div className="font-bold text-xl">{currentCombatant.name}</div>
                <div className="text-gray-600">{currentCombatant.class || currentCombatant.type}</div>
                <div className="text-sm text-gray-500">HP: {currentCombatant.hp}/{currentCombatant.maxHp}</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Interface - Only show to current player */}
        {isUserTurn && currentUserChar && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 mb-6 shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Choose Your Action</h3>
            
            {!selectedAction ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Attack Option */}
                <button
                  onClick={() => setSelectedAction('attack')}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-6 rounded-lg shadow-lg transition-colors"
                >
                  ⚔️ Attack
                </button>
                
                {/* Inventory Option */}
                <button
                  onClick={() => setSelectedAction('inventory')}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-lg shadow-lg transition-colors"
                >
                  🎒 Inventory
                </button>
                
                {/* Speak/Persuade Option */}
                <button
                  onClick={() => setSelectedAction('persuade')}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-lg shadow-lg transition-colors"
                >
                  💬 Speak/Persuade
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Action Details */}
                {selectedAction === 'attack' && (
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3">⚔️ Choose Your Attack</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Weapons */}
                      <div>
                        <h5 className="font-semibold text-gray-700 mb-2">Weapons:</h5>
                        <div className="space-y-2">
                          {currentUserChar.equipment?.filter(item => 
                            item.toLowerCase().includes('sword') || 
                            item.toLowerCase().includes('axe') || 
                            item.toLowerCase().includes('bow') ||
                            item.toLowerCase().includes('dagger') ||
                            item.toLowerCase().includes('mace') ||
                            item.toLowerCase().includes('spear')
                          ).map(weapon => (
                            <button
                              key={weapon}
                              onClick={() => setSelectedTarget({ type: 'weapon', item: weapon })}
                              className="w-full text-left bg-gray-100 hover:bg-gray-200 p-2 rounded transition-colors"
                            >
                              {weapon}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Spells */}
                      <div>
                        <h5 className="font-semibold text-gray-700 mb-2">Spells:</h5>
                        <div className="space-y-2">
                          {currentUserChar.spells?.map(spell => (
                            <button
                              key={spell.name}
                              onClick={() => setSelectedTarget({ type: 'spell', item: spell })}
                              className="w-full text-left bg-purple-100 hover:bg-purple-200 p-2 rounded transition-colors"
                            >
                              {spell.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedAction === 'inventory' && (
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3">🎒 Choose Item to Use</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      {currentUserChar.equipment?.map(item => (
                        <button
                          key={item}
                          onClick={() => setSelectedTarget({ type: 'item', item: item })}
                          className="bg-green-100 hover:bg-green-200 p-3 rounded transition-colors"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAction === 'persuade' && (
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3">💬 Choose Target to Persuade</h4>
                    <p className="text-gray-600 mb-4">
                      Your Charisma: {currentUserChar.charisma} (Modifier: {Math.floor((currentUserChar.charisma - 10) / 2)})
                    </p>
                  </div>
                )}

                {/* Target Selection */}
                {selectedTarget && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-semibold text-gray-800 mb-3">Select Target:</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {combatSession.enemies.map(enemy => (
                        <button
                          key={enemy.id}
                          onClick={() => {
                            if (selectedAction === 'attack') {
                              if (selectedTarget.type === 'weapon') {
                                handleAttack(selectedTarget.item, enemy);
                              } else if (selectedTarget.type === 'spell') {
                                handleSpell(selectedTarget.item, enemy);
                              }
                            } else if (selectedAction === 'inventory') {
                              handleInventoryUse(selectedTarget.item, enemy);
                            } else if (selectedAction === 'persuade') {
                              handlePersuade(enemy);
                            }
                          }}
                          className="bg-red-100 hover:bg-red-200 p-3 rounded transition-colors text-left"
                        >
                          <div className="font-semibold">{enemy.name}</div>
                          <div className="text-sm text-gray-600">HP: {enemy.hp}/{enemy.maxHp}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Back Button */}
                <button
                  onClick={() => {
                    setSelectedAction(null);
                    setSelectedTarget(null);
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
                >
                  ← Back
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action Message */}
        {actionMessage && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 mb-6 shadow-lg">
            <h4 className="font-bold text-gray-800 mb-2">Action Result:</h4>
            <pre className="whitespace-pre-wrap text-gray-700 bg-gray-100 p-3 rounded">{actionMessage}</pre>
          </div>
        )}

        {/* Battle Arena */}
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