import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { getPartyCharacters, getPartyById, fixPartyCharacterAbilityScores, createManualCampaignStory, getCampaignStory } from '../firebase/database';
import { manualCampaignService } from '../services/manualCampaign';
import { dmToolsService } from '../services/dmTools';
import DMMapEditor from '../components/dm/DMMapEditor';
import DMCombatView from '../components/dm/DMCombatView';
import DMCatalogs from '../components/dm/DMCatalogs';
import DMPlayerInventoryModal from '../components/dm/DMPlayerInventoryModal';

export default function ManualCampaignDM() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [party, setParty] = useState(null);
  const [partyCharacters, setPartyCharacters] = useState([]);
  const [activeTab, setActiveTab] = useState('map'); // Default to map view
  const [currentScene, setCurrentScene] = useState('');
  const [sceneTitle, setSceneTitle] = useState('');
  const [sceneDescription, setSceneDescription] = useState('');
  const [objectives, setObjectives] = useState([]);
  const [problems, setProblems] = useState([]);
  const [newObjective, setNewObjective] = useState('');
  const [newProblem, setNewProblem] = useState('');
  const [playerViewMode, setPlayerViewMode] = useState('hidden'); // What players are seeing
  const [showPlayerControls, setShowPlayerControls] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showInventoryModal, setShowInventoryModal] = useState(false);

  const navigationItems = useMemo(() => [
    { id: 'map', name: '🗺️ Campaign Map', icon: '🗺️', description: 'Primary campaign map and player view control' },
    { id: 'scene', name: '🎭 Scene Manager', icon: '🎭', description: 'Manage current scene and objectives' },
    { id: 'players', name: '👥 Player Information', icon: '👥', description: 'View player characters and stats' },
    { id: 'combat', name: '⚔️ Combat Planning', icon: '⚔️', description: 'Enemy selection, initiative, and combat management' },
    { id: 'npcs', name: '🤝 NPC Manager', icon: '🤝', description: 'Non-player characters and dialogue' },
    { id: 'notes', name: '📝 Campaign Notes', icon: '📝', description: 'Session notes and story tracking' }
  ], []);

  const playerViewOptions = useMemo(() => [
    { id: 'map', name: '🗺️ Campaign Map', description: 'Players see the main campaign map' },
    { id: 'scene', name: '🎭 Current Scene', description: 'Players see the current scene description' },
    { id: 'combat', name: '⚔️ Combat View', description: 'Players see combat initiative and status' },
    { id: 'hidden', name: '👻 Hidden', description: 'Players see a loading screen' }
  ], []);

  // Memoize expensive calculations
  const totalHp = useMemo(() => {
    const current = partyCharacters.reduce((total, char) => total + (char.hp || 0), 0);
    const max = partyCharacters.reduce((total, char) => total + (char.maxHp || 0), 0);
    return { current, max };
  }, [partyCharacters]);

  // Combat start handler - moved to top level to fix hooks order
  const handleCombatStart = useCallback((data) => {
    // Set player view to combat mode when combat starts
    dmToolsService.updatePlayerView(partyId, 'combat');
  }, [partyId]);

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
      loadCampaignData();
    }
  }, [user, partyId]);

  // Real-time listener for player view changes (for DM)
  useEffect(() => {
    if (!user || !partyId) return;

    const unsubscribe = dmToolsService.listenToPlayerView(partyId, (viewMode) => {
      setPlayerViewMode(viewMode);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid, partyId]); // Use user.uid instead of user object to prevent unnecessary re-renders

  // Verify user permissions and party membership
  const verifyUserPermissions = async (partyData) => {
    if (!partyData) {
      throw new Error('Party not found');
    }
    
    if (!partyData.members || !Array.isArray(partyData.members)) {
      throw new Error('Invalid party data: missing members array');
    }
    
    if (!partyData.members.includes(user.uid)) {
      throw new Error('You are not a member of this party');
    }
    
    if (partyData.dmId !== user.uid) {
      console.log('User is not DM, redirecting to player view');
      navigate(`/manual-campaign/${partyId}`);
      return false;
    }
    
    console.log('User permissions verified successfully');
    return true;
  };

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      
      console.log('Loading campaign data for partyId:', partyId);
      console.log('Current user:', user);
      
      // Load party data
      const partyData = await getPartyById(partyId);
      console.log('Party data loaded:', partyData);
      setParty(partyData);
      
      // Verify user permissions
      const hasPermission = await verifyUserPermissions(partyData);
      if (!hasPermission) {
        return;
      }
      
      console.log('User is DM, loading party characters...');
      
      // Load party characters
      try {
        const characters = await getPartyCharacters(partyId);
        console.log('Party characters loaded:', characters);
        setPartyCharacters(characters);
      } catch (error) {
        console.error('Failed to load party characters:', error);
        // Fallback: try to load characters one by one or show empty state
        setPartyCharacters([]);
        alert('Warning: Unable to load party characters. The DM interface may have limited functionality.');
      }
      
      // Ensure campaign story exists for manual campaigns
      let campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        // Create campaign story if it doesn't exist
        try {
          console.log('Creating new campaign story for manual campaign...');
          campaignStory = await createManualCampaignStory(partyId);
          console.log('Successfully created new campaign story:', campaignStory);
        } catch (error) {
          console.error('Error creating campaign story:', error);
          // Continue without campaign story for now
          // Show a user-friendly message
          alert('Warning: Unable to create campaign story. Some features may not work properly. Please try refreshing the page.');
        }
      } else {
        console.log('Found existing campaign story:', campaignStory);
      }
      
      // Load current scene
      const scene = await dmToolsService.getCurrentScene(partyId);
      if (scene) {
        setSceneTitle(scene.title);
        setSceneDescription(scene.description);
        setObjectives(scene.objectives || []);
        setProblems(scene.problems || []);
      }
      
      // Load current player view mode from database
      const currentPlayerView = await dmToolsService.getPlayerView(partyId);
      setPlayerViewMode(currentPlayerView);
    } catch (error) {
      console.error('Error loading campaign data:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      // Show user-friendly error message
      alert(`Error loading campaign data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScene = async () => {
    try {
      if (!sceneTitle.trim() || !sceneDescription.trim()) {
        alert('Please provide both title and description for the scene.');
        return;
      }

      const sceneData = {
        title: sceneTitle,
        description: sceneDescription,
        mapLocation: { x: 0, y: 0 }, // Default location
        objectives: objectives,
        problems: problems
      };

      await dmToolsService.createScene(partyId, sceneData);
      alert('Scene created successfully!');
    } catch (error) {
      console.error('Error creating scene:', error);
      alert('Failed to create scene');
    }
  };

  const handleAddObjective = async () => {
    if (!newObjective.trim()) return;
    
    try {
      const scene = await dmToolsService.getCurrentScene(partyId);
      if (!scene) {
        alert('Please create a scene first.');
        return;
      }

      await dmToolsService.addObjective(partyId, scene.id, newObjective);
      setObjectives([...objectives, { id: `obj_${Date.now()}`, text: newObjective, completed: false }]);
      setNewObjective('');
    } catch (error) {
      console.error('Error adding objective:', error);
    }
  };

  const handleAddProblem = async () => {
    if (!newProblem.trim()) return;
    
    try {
      const scene = await dmToolsService.getCurrentScene(partyId);
      if (!scene) {
        alert('Please create a scene first.');
        return;
      }

      await dmToolsService.addProblem(partyId, scene.id, newProblem);
      setProblems([...problems, { id: `prob_${Date.now()}`, text: newProblem, solved: false }]);
      setNewProblem('');
    } catch (error) {
      console.error('Error adding problem:', error);
    }
  };

  const handleMapUpdate = (mapData) => {
    // Could broadcast to players here
  };

  const handlePlayerViewChange = async (viewMode) => {
    try {
      setPlayerViewMode(viewMode);
      // Update what players are seeing in the database
      await dmToolsService.updatePlayerView(partyId, viewMode);
    } catch (error) {
      console.error('Error updating player view:', error);
    }
  };

  const togglePlayerControls = () => {
    setShowPlayerControls(!showPlayerControls);
  };

  const handleOpenInventoryModal = (character) => {
    setSelectedCharacter(character);
    setShowInventoryModal(true);
  };

  const handleCloseInventoryModal = () => {
    setShowInventoryModal(false);
    setSelectedCharacter(null);
  };

  const handleInventoryUpdate = () => {
    // Reload campaign data to refresh character information
    loadCampaignData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="fantasy-container py-8">
          <div className="fantasy-card">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
              <p className="text-gray-300">Loading DM Campaign...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="fantasy-container py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mb-4">
              DM Campaign Control
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-amber-400 to-orange-400 mx-auto rounded-full mb-4"></div>
            <h2 className="text-2xl font-semibold text-slate-100 mb-2">{party?.name}</h2>
            <p className="text-slate-400 mb-4">Manual Campaign - Dungeon Master Interface</p>
            <div className="flex items-center justify-center space-x-4 mb-4">
              <div className="px-3 py-1 rounded-full text-sm font-medium bg-slate-600/20 text-slate-300 border border-slate-500/30">
                👑 Dungeon Master
              </div>
              <div className="text-slate-400">
                {partyCharacters.length} Players
              </div>
            </div>
            
            {/* Player View Control - Prominent */}
            <div className="flex items-center justify-center">
              <div className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-slate-300">Player View:</span>
                  {playerViewMode === 'hidden' ? (
                    <button
                      onClick={() => handlePlayerViewChange('map')}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium"
                    >
                      👁️ Show Players
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePlayerViewChange('hidden')}
                      className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium"
                    >
                      👻 Hide from Players
                    </button>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    playerViewMode === 'hidden' 
                      ? 'bg-red-600/20 text-red-300 border border-red-500/30' 
                      : 'bg-green-600/20 text-green-300 border border-green-500/30'
                  }`}>
                    {playerViewOptions.find(opt => opt.id === playerViewMode)?.name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col gap-6">
          {/* Main Content - Centered */}
          <div className="flex justify-center">
            <div className="w-full max-w-6xl">
              {/* Campaign Map Tab - Primary Focus */}
              {activeTab === 'map' && (
                <div className="space-y-4">
                  {/* Map Header with Quick Stats */}
                  <div className="fantasy-card">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-slate-100">🗺️ Campaign Map</h3>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-400">
                          <span className="text-blue-400 font-semibold">{partyCharacters.length}</span> Players
                        </div>
                        <div className="text-sm text-slate-400">
                          Scene: <span className="text-green-400 font-semibold">{sceneTitle || 'None'}</span>
                        </div>
                        <div className="text-sm text-slate-400">
                          View: <span className="text-amber-400 font-semibold">{playerViewOptions.find(opt => opt.id === playerViewMode)?.name}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Map Area */}
                  <div className="fantasy-card">
                    <DMMapEditor partyId={partyId} onMapUpdate={handleMapUpdate} />
                  </div>
                </div>
              )}

              {/* Player Information Tab */}
              {activeTab === 'players' && (
                <div className="fantasy-card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-100">👥 Player Information</h3>
                    <button
                      onClick={async () => {
                        try {
                          const result = await fixPartyCharacterAbilityScores(partyId);
                          alert(`Fixed ability scores for ${result.fixedCount} out of ${result.totalCharacters} characters.`);
                          // Reload characters to show updated stats
                          const characters = await getPartyCharacters(partyId);
                          setPartyCharacters(characters);
                        } catch (error) {
                          console.error('Error fixing character ability scores:', error);
                          alert('Failed to fix character ability scores. Please try again.');
                        }
                      }}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-sm transition-colors"
                      title="Fix character ability scores if they appear incorrect"
                    >
                      🔧 Fix Stats
                    </button>
                  </div>
                  
                  {/* Party Summary */}
                  <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-600/50">
                    <h4 className="text-lg font-semibold text-slate-200 mb-3">📊 Party Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">{partyCharacters.length}</div>
                        <div className="text-xs text-slate-400">Players</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {partyCharacters.reduce((total, char) => total + (char.hp || 0), 0)}/{partyCharacters.reduce((total, char) => total + (char.maxHp || 0), 0)}
                        </div>
                        <div className="text-xs text-slate-400">Total HP</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {partyCharacters.filter(char => char.spells && char.spells.length > 0).length}
                        </div>
                        <div className="text-xs text-slate-400">Spellcasters</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-amber-400">
                          {partyCharacters.reduce((total, char) => total + (char.level || 1), 0)}
                        </div>
                        <div className="text-xs text-slate-400">Total Levels</div>
                      </div>
                    </div>
                    
                    {/* Class Distribution */}
                    <div className="mt-4 pt-4 border-t border-slate-600/50">
                      <h5 className="text-sm font-semibold text-slate-300 mb-2">Class Distribution</h5>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(
                          partyCharacters.reduce((acc, char) => {
                            acc[char.class] = (acc[char.class] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([className, count]) => (
                          <span key={className} className="px-3 py-1 bg-slate-700 text-slate-200 text-xs rounded-full border border-slate-600">
                            {className}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {partyCharacters.map((character) => (
                      <div key={character.id} className="bg-slate-700/50 p-6 rounded-lg border border-slate-600/50 hover:border-slate-500/50 transition-colors">
                        {/* Character Header */}
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-600/50">
                          <div>
                            <h4 className="text-xl font-bold text-slate-100">{character.name}</h4>
                            <p className="text-slate-400 text-sm">{character.race} {character.class} • Level {character.level}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-red-400">{character.hp}/{character.maxHp} HP</div>
                            <div className="text-sm text-slate-400">AC: {character.ac || 'N/A'}</div>
                          </div>
                        </div>
                        
                        {/* Action Button */}
                        <div className="mb-4">
                          <button
                            onClick={() => handleOpenInventoryModal(character)}
                            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                          >
                            📦 Manage Inventory & Spells
                          </button>
                        </div>

                        {/* Ability Scores */}
                        <div className="mb-4">
                          <h5 className="text-sm font-semibold text-slate-300 mb-2">Ability Scores</h5>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="bg-slate-800 p-2 rounded text-center">
                              <div className="font-bold text-red-400">STR</div>
                              <div className="text-slate-300">{character.strength}</div>
                            </div>
                            <div className="bg-slate-800 p-2 rounded text-center">
                              <div className="font-bold text-blue-400">DEX</div>
                              <div className="text-slate-300">{character.dexterity}</div>
                            </div>
                            <div className="bg-slate-800 p-2 rounded text-center">
                              <div className="font-bold text-green-400">CON</div>
                              <div className="text-slate-300">{character.constitution}</div>
                            </div>
                            <div className="bg-slate-800 p-2 rounded text-center">
                              <div className="font-bold text-purple-400">INT</div>
                              <div className="text-slate-300">{character.intelligence}</div>
                            </div>
                            <div className="bg-slate-800 p-2 rounded text-center">
                              <div className="font-bold text-yellow-400">WIS</div>
                              <div className="text-slate-300">{character.wisdom}</div>
                            </div>
                            <div className="bg-slate-800 p-2 rounded text-center">
                              <div className="font-bold text-pink-400">CHA</div>
                              <div className="text-slate-300">{character.charisma}</div>
                            </div>
                          </div>
                        </div>

                        {/* Equipment Summary */}
                        <div>
                          <h5 className="text-sm font-semibold text-slate-300 mb-2">Equipment</h5>
                          <div className="text-xs text-slate-400 space-y-1">
                            <div>Weapon: {character.weapon || 'None'}</div>
                            <div>Armor: {character.armor || 'None'}</div>
                            <div>Shield: {character.shield || 'None'}</div>
                            <div>Spells: {character.spells ? character.spells.length : 0} known</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scene Manager Tab */}
              {activeTab === 'scene' && (
                <div className="fantasy-card">
                  <h3 className="text-xl font-bold text-slate-100 mb-4">🎭 Scene Manager</h3>
                  
                  {/* Current Scene */}
                  <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-600/50">
                    <h4 className="text-lg font-semibold text-slate-200 mb-3">Current Scene</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Scene Title</label>
                        <input
                          type="text"
                          value={sceneTitle}
                          onChange={(e) => setSceneTitle(e.target.value)}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                          placeholder="Enter scene title..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Scene Description</label>
                        <textarea
                          value={sceneDescription}
                          onChange={(e) => setSceneDescription(e.target.value)}
                          rows={4}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                          placeholder="Describe the current scene..."
                        />
                      </div>
                      <button
                        onClick={handleCreateScene}
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                      >
                        🎭 Create/Update Scene
                      </button>
                    </div>
                  </div>

                  {/* Objectives */}
                  <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-600/50">
                    <h4 className="text-lg font-semibold text-slate-200 mb-3">Objectives</h4>
                    <div className="space-y-2 mb-3">
                      {objectives.map((objective, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-slate-700 rounded">
                          <input
                            type="checkbox"
                            checked={objective.completed}
                            onChange={() => {
                              const newObjectives = [...objectives];
                              newObjectives[index].completed = !newObjectives[index].completed;
                              setObjectives(newObjectives);
                            }}
                            className="text-green-500"
                          />
                          <span className={`flex-1 text-sm ${objective.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                            {objective.text}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newObjective}
                        onChange={(e) => setNewObjective(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddObjective()}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                        placeholder="Add new objective..."
                      />
                      <button
                        onClick={handleAddObjective}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Problems */}
                  <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600/50">
                    <h4 className="text-lg font-semibold text-slate-200 mb-3">Problems</h4>
                    <div className="space-y-2 mb-3">
                      {problems.map((problem, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-slate-700 rounded">
                          <input
                            type="checkbox"
                            checked={problem.solved}
                            onChange={() => {
                              const newProblems = [...problems];
                              newProblems[index].solved = !newProblems[index].solved;
                              setProblems(newProblems);
                            }}
                            className="text-green-500"
                          />
                          <span className={`flex-1 text-sm ${problem.solved ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                            {problem.text}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newProblem}
                        onChange={(e) => setNewProblem(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddProblem()}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                        placeholder="Add new problem..."
                      />
                      <button
                        onClick={handleAddProblem}
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Combat Planning Tab */}
              {activeTab === 'combat' && (
                <DMCombatView 
                  partyId={partyId} 
                  partyCharacters={partyCharacters}
                  onCombatStart={handleCombatStart}
                />
              )}

              {/* NPC Manager Tab */}
              {activeTab === 'npcs' && (
                <div className="fantasy-card">
                  <h3 className="text-xl font-bold text-slate-100 mb-4">🤝 NPC Manager</h3>
                  <p className="text-slate-400 mb-4">Non-player characters and dialogue management coming soon...</p>
                  <div className="bg-slate-700/50 p-6 rounded-lg text-center">
                    <div className="text-4xl mb-4">🤝</div>
                    <h4 className="text-lg font-semibold text-slate-200 mb-2">NPC Manager</h4>
                    <p className="text-slate-400">Create and manage NPCs with dialogue trees</p>
                  </div>
                </div>
              )}

              {/* Campaign Notes Tab */}
              {activeTab === 'notes' && (
                <div className="fantasy-card">
                  <h3 className="text-xl font-bold text-slate-100 mb-4">📝 Campaign Notes</h3>
                  <p className="text-slate-400 mb-4">Session notes and story tracking coming soon...</p>
                  <div className="bg-slate-700/50 p-6 rounded-lg text-center">
                    <div className="text-4xl mb-4">📝</div>
                    <h4 className="text-lg font-semibold text-slate-200 mb-2">Campaign Notes</h4>
                    <p className="text-slate-400">Track session notes and story progression</p>
                  </div>
                </div>
              )}

              {/* Catalogs Tab */}
              {activeTab === 'catalogs' && (
                <DMCatalogs />
              )}
            </div>
          </div>

          {/* DM Tools - Moved to Bottom */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Player View Control */}
            <div className="fantasy-card bg-slate-800/50">
              <h3 className="text-lg font-bold text-slate-100 mb-4 border-b border-slate-600 pb-2">
                👥 Player View Control
              </h3>
              <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
                <div className="mb-2">
                  <h4 className="text-sm font-semibold text-slate-200">Current View</h4>
                </div>
                <div className="text-xs text-slate-400 mb-3">
                  {playerViewOptions.find(opt => opt.id === playerViewMode)?.name}
                </div>
                <div className="space-y-1">
                  {playerViewOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handlePlayerViewChange(option.id)}
                      className={`w-full text-left p-2 rounded text-xs transition-colors ${
                        playerViewMode === option.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-600/50 hover:bg-slate-500/50 text-slate-300'
                      }`}
                    >
                      <div className="font-medium">{option.name}</div>
                      <div className="text-xs opacity-75">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation Tools */}
            <div className="fantasy-card bg-slate-800/50">
              <h3 className="text-lg font-bold text-slate-100 mb-4 border-b border-slate-600 pb-2">
                🎯 DM Tools
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 group ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                        : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.name.split(' ').slice(1).join(' ')}</div>
                        <div className={`text-xs mt-1 ${
                          activeTab === item.id ? 'text-blue-100' : 'text-slate-400'
                        }`}>
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="fantasy-card bg-slate-800/50">
              <h3 className="text-lg font-bold text-slate-100 mb-4 border-b border-slate-600 pb-2">
                📊 Quick Stats
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-sm text-slate-400">Players</div>
                  <div className="text-2xl font-bold text-blue-400">{partyCharacters.length}</div>
                </div>
                <div className="p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-sm text-slate-400">Total HP</div>
                  <div className="text-2xl font-bold text-green-400">
                    {totalHp.current}/{totalHp.max}
                  </div>
                </div>
                <div className="p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-sm text-slate-400">Current Scene</div>
                  <div className="text-lg font-bold text-amber-400">{sceneTitle || 'None'}</div>
                </div>
                <div className="p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-sm text-slate-400">Player View</div>
                  <div className="text-lg font-bold text-purple-400">
                    {playerViewOptions.find(opt => opt.id === playerViewMode)?.name}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player Inventory Modal */}
      {selectedCharacter && (
        <DMPlayerInventoryModal
          character={selectedCharacter}
          isOpen={showInventoryModal}
          onClose={handleCloseInventoryModal}
          onUpdate={handleInventoryUpdate}
        />
      )}
    </div>
  );
} 