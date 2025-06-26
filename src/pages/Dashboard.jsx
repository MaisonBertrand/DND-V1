import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { 
  getUserParties, 
  getUserProfile, 
  getUserProfiles,
  getUserCharacterPresets,
  deleteCharacterPreset,
  createCombatSession,
  updateCombatSession,
  getCombatSession
} from '../firebase/database';
import { combatService } from '../services/combat';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [parties, setParties] = useState([]);
  const [partyMemberProfiles, setPartyMemberProfiles] = useState({});
  const [characterPresets, setCharacterPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [combatLoading, setCombatLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
      loadUserData(user.uid);
    });
    return () => unsubscribe();
  }, [navigate]);

  const loadUserData = async (userId) => {
    try {
      const [userParties, profile, presets] = await Promise.all([
        getUserParties(userId),
        getUserProfile(userId),
        getUserCharacterPresets(userId)
      ]);
      setParties(userParties);
      setUserProfile(profile);
      setCharacterPresets(presets);
      
      // Load user profiles for all party members
      await loadPartyMemberProfiles(userParties);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPartyMemberProfiles = async (parties) => {
    try {
      // Collect all unique user IDs from all parties
      const allUserIds = new Set();
      parties.forEach(party => {
        if (party.members && Array.isArray(party.members)) {
          party.members.forEach(memberId => allUserIds.add(memberId));
        }
      });

      if (allUserIds.size === 0) return;

      // Get all user profiles
      const profiles = await getUserProfiles(Array.from(allUserIds));
      
      // Create a map of userId to profile
      const profileMap = {};
      profiles.forEach(profile => {
        profileMap[profile.userId] = profile;
      });

      // Create a map of partyId to member profiles
      const partyProfiles = {};
      parties.forEach(party => {
        if (party.members && Array.isArray(party.members)) {
          partyProfiles[party.id] = party.members.map(memberId => ({
            userId: memberId,
            profile: profileMap[memberId] || null
          }));
        }
      });

      setPartyMemberProfiles(partyProfiles);
    } catch (error) {
      console.error('Error loading party member profiles:', error);
    }
  };

  const handleDeletePreset = async (presetId) => {
    if (confirm('Are you sure you want to delete this character preset? This action cannot be undone.')) {
      try {
        await deleteCharacterPreset(user.uid, presetId);
        // Reload presets
        const updatedPresets = await getUserCharacterPresets(user.uid);
        setCharacterPresets(updatedPresets);
        alert('Character preset deleted successfully!');
      } catch (error) {
        console.error('Error deleting preset:', error);
        alert('Failed to delete preset. Please try again.');
      }
    }
  };

  // Clean up existing test combat sessions
  const cleanupTestCombatSessions = async () => {
    try {
      // Mark any existing test combat sessions as ended
      const testSession = await getCombatSession('test-combat-party');
      if (testSession) {
        await updateCombatSession(testSession.id, {
          status: 'ended',
          combatState: 'ended'
        });
      }
    } catch (error) {
      console.log('No existing test combat session to clean up');
    }
  };

  const handleTestCombat = async () => {
    if (!user) return;
    
    setCombatLoading(true);
    try {
      // Clean up any existing test combat sessions
      await cleanupTestCombatSessions();
      
      // Create test party members with unique IDs and all required properties
      const testPartyMembers = [
        {
          id: 'test-warrior-' + Date.now(),
          name: 'Test Warrior',
          class: 'Fighter',
          race: 'Human',
          level: 3,
          hp: 28,
          maxHp: 28,
          armorClass: 16,
          strength: 16,
          dexterity: 14,
          constitution: 15,
          intelligence: 10,
          wisdom: 12,
          charisma: 8,
          userId: user.uid,
          statusEffects: [],
          cooldowns: {},
          turnCount: 0,
          lastAction: null
        },
        {
          id: 'test-wizard-' + Date.now(),
          name: 'Test Wizard',
          class: 'Wizard',
          race: 'Elf',
          level: 3,
          hp: 18,
          maxHp: 18,
          armorClass: 12,
          strength: 8,
          dexterity: 14,
          constitution: 12,
          intelligence: 16,
          wisdom: 14,
          charisma: 10,
          userId: user.uid,
          statusEffects: [],
          cooldowns: {},
          turnCount: 0,
          lastAction: null
        }
      ];

      // Create test enemies with equipment and enhanced stats
      const testEnemies = [
        {
          id: 'enemy_goblin1',
          name: 'Goblin Warrior',
          class: 'Warrior',
          level: 3,
          hp: 18,
          maxHp: 18,
          armorClass: 15,
          strength: 14,
          dexterity: 12,
          constitution: 13,
          intelligence: 8,
          wisdom: 10,
          charisma: 6,
          statusEffects: [],
          cooldowns: {},
          turnCount: 0,
          lastAction: null,
          equipment: {
            weapon: { name: 'Rusty Sword', damageBonus: 2 },
            armor: { name: 'Leather Armor', defenseBonus: 1 },
            accessory: { name: 'Lucky Charm', bonus: 1 }
          }
        },
        {
          id: 'enemy_goblin2',
          name: 'Goblin Archer',
          class: 'Archer',
          level: 2,
          hp: 12,
          maxHp: 12,
          armorClass: 13,
          strength: 10,
          dexterity: 16,
          constitution: 9,
          intelligence: 8,
          wisdom: 12,
          charisma: 6,
          statusEffects: [],
          cooldowns: {},
          turnCount: 0,
          lastAction: null,
          equipment: {
            weapon: { name: 'Short Bow', damageBonus: 1 },
            armor: { name: 'Hide Armor', defenseBonus: 0 },
            accessory: { name: 'Sharp Arrow', bonus: 1 }
          }
        },
        {
          id: 'enemy_goblin3',
          name: 'Goblin Shaman',
          class: 'Mage',
          level: 4,
          hp: 16,
          maxHp: 16,
          armorClass: 11,
          strength: 8,
          dexterity: 10,
          constitution: 11,
          intelligence: 15,
          wisdom: 14,
          charisma: 8,
          statusEffects: [],
          cooldowns: {},
          turnCount: 0,
          lastAction: null,
          equipment: {
            weapon: { name: 'Ritual Staff', damageBonus: 1 },
            armor: { name: 'Robe', defenseBonus: 0 },
            accessory: { name: 'Magic Crystal', bonus: 2 }
          }
        }
      ];

      // Create story context for the combat
      const storyContext = "The party encounters a group of goblins in a dark forest clearing. The goblins have set up an ambush, using the dense underbrush and fallen logs for cover. The air is thick with tension as both sides prepare for battle.";

      // Initialize combat with Pokemon-style mechanics
      const initializedCombat = combatService.initializeCombat(testPartyMembers, testEnemies, storyContext);
      
      console.log('Initialized combat data:', initializedCombat);
      
      // Create combat session in database with test party ID
      const combatSession = await createCombatSession('test-combat-party', {
        storyContext: storyContext,
        partyMembers: initializedCombat.combatants.filter(c => !c.id.startsWith('enemy_')),
        enemies: initializedCombat.combatants.filter(c => c.id.startsWith('enemy_')),
        initiative: initializedCombat.combatants,
        environmentalFeatures: initializedCombat.environmentalFeatures || [],
        teamUpOpportunities: initializedCombat.teamUpOpportunities || [],
        narrativeElements: initializedCombat.narrativeElements || [],
        combatState: 'active', // Start combat immediately
        currentTurn: 0, // Start with first combatant
        round: 1,
        phase: 'active'
      });
      
      console.log('Test combat session created:', combatSession);
      
      // Navigate directly to combat page
      navigate(`/combat/test-combat-party`);
    } catch (error) {
      console.error('Error starting test combat:', error);
      alert('Failed to start test combat. Please try again.');
    } finally {
      setCombatLoading(false);
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
            <div className="text-stone-600">Loading your parties...</div>
          </div>
        </div>
      </div>
    );
  }

  const displayName = userProfile?.username || user.email;

  return (
    <div className="fantasy-container py-8">
      <div className="fantasy-card">
        <div className="flex justify-between items-center mb-6">
          <h1 className="fantasy-title mb-0">Welcome, {displayName}</h1>
        </div>
        
        {/* Combat Test Section */}
        <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-xl font-bold text-stone-800 mb-4">⚔️ Combat Testing</h2>
          <p className="text-stone-600 mb-4">
            Test the new combat system with pre-made characters and goblin enemies.
          </p>
          <button
            onClick={handleTestCombat}
            disabled={combatLoading}
            className="fantasy-button bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {combatLoading ? 'Starting Combat...' : 'Start Test Combat'}
          </button>
        </div>
        
        {/* Your Parties */}
        <div>
          <h2 className="text-2xl font-bold text-stone-800 mb-6">Your Parties</h2>
          {parties.length === 0 ? (
            <div className="text-center py-8 text-stone-600">
              <p>You haven't joined any parties yet.</p>
              <p className="text-sm mt-2">Go to the Parties tab to create or join a party!</p>
              <button
                onClick={() => navigate('/party-management')}
                className="fantasy-button mt-4"
              >
                Go to Parties
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {parties.map(party => {
                const memberProfiles = partyMemberProfiles[party.id] || [];
                
                return (
                  <div key={party.id} className="fantasy-card bg-amber-50">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-stone-800">{party.name}</h3>
                        <p className="text-stone-600 mt-1">{party.description}</p>
                        <p className="text-sm text-stone-500 mt-2">
                          {party.members?.length || 1}/{party.maxPlayers} members
                        </p>
                      </div>
                    </div>
                    
                    {/* Party Members */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-stone-700 mb-2">Party Members:</h4>
                      <div className="space-y-1">
                        {memberProfiles.map((member, index) => {
                          const username = member.profile?.username || `User ${index + 1}`;
                          const isDM = member.userId === party.dmId;
                          
                          return (
                            <div key={member.userId} className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="text-stone-600">{username}</span>
                                {isDM && (
                                  <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                    DM
                                  </span>
                                )}
                              </div>
                              {member.userId === user?.uid && (
                                <span className="text-blue-600 text-xs font-medium">(You)</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/campaign-story/${party.id}`)}
                        className="fantasy-button flex-1"
                      >
                        View Campaign
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Your Characters */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-stone-800 mb-6">
            Your Characters ({characterPresets.length})
          </h2>
          {characterPresets.length === 0 ? (
            <div className="text-center py-8 text-stone-600">
              <p>You haven't created any character presets yet.</p>
              <p className="text-sm mt-2">Create a character in any party to save it as a preset!</p>
              <button
                onClick={() => navigate('/party-management')}
                className="fantasy-button mt-4"
              >
                Go to Parties
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {characterPresets.map(preset => (
                <div key={preset.id} className="fantasy-card bg-emerald-50 border border-emerald-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-stone-800">{preset.name}</h3>
                      <p className="text-stone-600 mt-1">
                        {preset.data.race} {preset.data.class}
                      </p>
                      <p className="text-sm text-stone-500 mt-1">
                        Level {preset.data.level} • {preset.data.background || 'No background'}
                      </p>
                      {preset.data.alignment && (
                        <p className="text-sm text-stone-500">{preset.data.alignment}</p>
                      )}
                      {preset.createdAt && (
                        <p className="text-xs text-stone-400 mt-2">
                          Created: {new Date(preset.createdAt.toDate()).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeletePreset(preset.id)}
                      className="text-red-600 hover:text-red-800 text-sm ml-2"
                      title="Delete preset"
                    >
                      🗑️
                    </button>
                  </div>
                  
                  {/* Character Stats Preview */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-stone-700 mb-2">Ability Scores:</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-semibold">STR</div>
                        <div className="text-stone-600">{preset.data.strength}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">DEX</div>
                        <div className="text-stone-600">{preset.data.dexterity}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">CON</div>
                        <div className="text-stone-600">{preset.data.constitution}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">INT</div>
                        <div className="text-stone-600">{preset.data.intelligence}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">WIS</div>
                        <div className="text-stone-600">{preset.data.wisdom}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">CHA</div>
                        <div className="text-stone-600">{preset.data.charisma}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Character Details Preview */}
                  {preset.data.personality && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-stone-700 mb-1">Personality:</h4>
                      <p className="text-sm text-stone-600 line-clamp-2">
                        {preset.data.personality}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        alert(`To use "${preset.name}" in a party:\n\n1. Go to the Parties tab\n2. Join or create a party\n3. When creating your character, click "📋 Load Preset"\n4. Select "${preset.name}" from the list\n5. Modify the character name and submit!`);
                        navigate('/party-management');
                      }}
                      className="fantasy-button bg-emerald-600 hover:bg-emerald-700 flex-1"
                    >
                      Use in Party
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
