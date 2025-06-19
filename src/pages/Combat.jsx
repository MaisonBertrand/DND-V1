import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { getPartyCharacters, getCampaignStory, updateCampaignStory } from '../firebase/database';

export default function Combat() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [combatState, setCombatState] = useState('preparation'); // preparation, active, ended
  const [initiative, setInitiative] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [partyMembers, setPartyMembers] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [storyContext, setStoryContext] = useState('');
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

  const loadCombatData = async () => {
    try {
      setLoading(true);
      
      // Load party characters
      const characters = await getPartyCharacters(partyId);
      setPartyMembers(characters.map(char => ({
        id: char.id,
        name: char.name,
        class: char.class,
        level: char.level,
        hp: char.hp || 10 + (char.constitution - 10) * 2,
        maxHp: char.hp || 10 + (char.constitution - 10) * 2,
        ac: char.ac || 10,
        initiative: Math.floor(Math.random() * 20) + 1 + Math.floor((char.dexterity - 10) / 2),
        portrait: char.portrait || '/placeholder-character.png',
        userId: char.userId
      })));

      // Load story context if combat was initiated from story
      const story = await getCampaignStory(partyId);
      if (story?.currentCombat?.initiated) {
        setStoryContext(story.currentCombat.storyContext);
        generateEnemiesFromContext(story.currentCombat.storyContext, characters.length);
      } else {
        generateRandomEnemies(characters.length);
      }
      
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

    setEnemies(generatedEnemies);
  };

  const generateRandomEnemies = (partySize) => {
    const enemyTypes = [
      { name: 'Goblin', hp: 12, ac: 14 },
      { name: 'Orc', hp: 30, ac: 16 },
      { name: 'Bandit', hp: 16, ac: 12 },
      { name: 'Skeleton', hp: 13, ac: 13 },
      { name: 'Wolf', hp: 11, ac: 13 }
    ];

    const enemyCount = Math.min(partySize + 1, 6);
    const generatedEnemies = [];

    for (let i = 0; i < enemyCount; i++) {
      const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      generatedEnemies.push({
        id: `enemy_${i}`,
        name: `${enemyType.name} ${i + 1}`,
        type: enemyType.name,
        hp: enemyType.hp + Math.floor(Math.random() * 10),
        maxHp: enemyType.hp + Math.floor(Math.random() * 10),
        ac: enemyType.ac + Math.floor(Math.random() * 3),
        initiative: Math.floor(Math.random() * 20) + 1,
        portrait: '/placeholder-enemy.png'
      });
    }

    setEnemies(generatedEnemies);
  };

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

  const endCombat = async () => {
    setCombatState('ended');
    
    // If combat was initiated from story, return to story
    if (storyContext) {
      try {
        await updateCampaignStory(partyId, {
          status: 'storytelling',
          currentCombat: null
        });
        navigate(`/campaign-story/${partyId}`);
      } catch (error) {
        console.error('Error returning to story:', error);
      }
    }
  };

  const updateHp = (combatantId, newHp) => {
    // Update HP in local state
    if (combatantId.startsWith('enemy_')) {
      setEnemies(prev => prev.map(enemy => 
        enemy.id === combatantId ? { ...enemy, hp: Math.max(0, newHp) } : enemy
      ));
    } else {
      setPartyMembers(prev => prev.map(member => 
        member.id === combatantId ? { ...member, hp: Math.max(0, newHp) } : member
      ));
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
            {storyContext && (
              <button 
                onClick={() => navigate(`/campaign-story/${partyId}`)}
                className="fantasy-button bg-blue-600 hover:bg-blue-700"
              >
                Return to Story
              </button>
            )}
          </div>
        </div>

        {/* Story Context */}
        {storyContext && (
          <div className="fantasy-card bg-blue-50 mb-6">
            <h2 className="text-xl font-bold text-stone-800 mb-2">Story Context</h2>
            <p className="text-stone-700">{storyContext}</p>
          </div>
        )}

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