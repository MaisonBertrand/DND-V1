import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { getPartyCharacters, getPartyById } from '../firebase/database';
import { manualCampaignService } from '../services/manualCampaign';
import { dmToolsService } from '../services/dmTools';
import DMMapEditor from '../components/dm/DMMapEditor';
import DMInitiativeTracker from '../components/dm/DMInitiativeTracker';
import DMCatalogs from '../components/dm/DMCatalogs';

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
  const [playerViewMode, setPlayerViewMode] = useState('map'); // What players are seeing
  const [showPlayerControls, setShowPlayerControls] = useState(false);

  const navigationItems = [
    { id: 'map', name: '🗺️ Campaign Map', icon: '🗺️', description: 'Primary campaign map and player view control' },
    { id: 'scene', name: '🎭 Scene Manager', icon: '🎭', description: 'Manage current scene and objectives' },
    { id: 'players', name: '👥 Player Information', icon: '👥', description: 'View player characters and stats' },
    { id: 'initiative', name: '⚔️ Initiative Tracker', icon: '⚔️', description: 'Combat initiative and turn management' },
    { id: 'enemies', name: '👹 Enemy Catalog', icon: '👹', description: 'Monster stats and encounter builder' },
    { id: 'items', name: '⚔️ Item Catalog', icon: '⚔️', description: 'Weapons, armor, and magical items' },
    { id: 'spells', name: '✨ Spell Catalog', icon: '✨', description: 'Spell database and reference' },
    { id: 'npcs', name: '🤝 NPC Manager', icon: '🤝', description: 'Non-player characters and dialogue' },
    { id: 'dice', name: '🎲 Dice Roller', icon: '🎲', description: 'Quick dice rolling tools' },
    { id: 'notes', name: '📝 Campaign Notes', icon: '📝', description: 'Session notes and story tracking' },
    { id: 'weather', name: '🌤️ Weather & Time', icon: '🌤️', description: 'Environmental conditions tracker' }
  ];

  const playerViewOptions = [
    { id: 'map', name: '🗺️ Campaign Map', description: 'Players see the main campaign map' },
    { id: 'scene', name: '🎭 Current Scene', description: 'Players see the current scene description' },
    { id: 'combat', name: '⚔️ Combat View', description: 'Players see combat initiative and status' },
    { id: 'hidden', name: '👻 Hidden', description: 'Players see a loading screen' }
  ];

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

    console.log('Setting up DM player view listener for party:', partyId);
    const unsubscribe = dmToolsService.listenToPlayerView(partyId, (viewMode) => {
      console.log('DM: Player view updated to:', viewMode);
      setPlayerViewMode(viewMode);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, partyId]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      
      // Load party information
      const partyData = await getPartyById(partyId);
      setParty(partyData);
      
      // Verify user is DM
      if (partyData.dmId !== user.uid) {
        navigate(`/manual-campaign/${partyId}`);
        return;
      }
      
      // Load party characters
      const characters = await getPartyCharacters(partyId);
      setPartyCharacters(characters);
      
      // Load current scene
      const scene = await dmToolsService.getCurrentScene(partyId);
      if (scene) {
        setSceneTitle(scene.title);
        setSceneDescription(scene.description);
        setObjectives(scene.objectives || []);
        setProblems(scene.problems || []);
      }
    } catch (error) {
      console.error('Error loading campaign data:', error);
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
    console.log('Map updated:', mapData);
    // Could broadcast to players here
  };

  const handlePlayerViewChange = async (viewMode) => {
    try {
      console.log('DM changing player view to:', viewMode);
      setPlayerViewMode(viewMode);
      // Update what players are seeing in the database
      await dmToolsService.updatePlayerView(partyId, viewMode);
      console.log(`Players now see: ${viewMode}`);
    } catch (error) {
      console.error('Error updating player view:', error);
    }
  };

  const togglePlayerControls = () => {
    setShowPlayerControls(!showPlayerControls);
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
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-80 flex-shrink-0">
            <div className="fantasy-card sticky top-4">
              <h3 className="text-lg font-bold text-slate-100 mb-4 border-b border-slate-600 pb-2">
                🎯 DM Tools
              </h3>
              
              {/* Player View Control */}
              <div className="mb-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-200">👥 Player View</h4>
                  <button
                    onClick={togglePlayerControls}
                    className="text-xs bg-slate-600 hover:bg-slate-500 text-slate-200 px-2 py-1 rounded transition-colors"
                  >
                    {showPlayerControls ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="text-xs text-slate-400 mb-2">
                  Current: {playerViewOptions.find(opt => opt.id === playerViewMode)?.name}
                </div>
                {showPlayerControls && (
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
                )}
              </div>

              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
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
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
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
                <h3 className="text-xl font-bold text-slate-100 mb-4">👥 Player Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {partyCharacters.map((character) => (
                    <div key={character.id} className="bg-slate-700/50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-slate-100 mb-2">{character.name}</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-slate-400">Class:</span> <span className="text-slate-200">{character.class}</span></p>
                        <p><span className="text-slate-400">Level:</span> <span className="text-slate-200">{character.level}</span></p>
                        <p><span className="text-slate-400">HP:</span> <span className="text-slate-200">{character.hp}/{character.maxHp}</span></p>
                        <p><span className="text-slate-400">Player:</span> <span className="text-slate-200">{character.playerName}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scene Manager Tab */}
            {activeTab === 'scene' && (
              <div className="fantasy-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-100">🎭 Scene Manager</h3>
                  <button
                    onClick={handleCreateScene}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                  >
                    💾 Save Scene
                  </button>
                </div>

                {/* Scene Creation */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Scene Details:</h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={sceneTitle}
                        onChange={(e) => setSceneTitle(e.target.value)}
                        placeholder="Scene Title"
                        className="w-full bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 rounded-lg focus:border-slate-500 focus:outline-none"
                      />
                      <textarea
                        value={sceneDescription}
                        onChange={(e) => setSceneDescription(e.target.value)}
                        placeholder="Describe the scene for your players..."
                        rows={6}
                        className="w-full bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 rounded-lg focus:border-slate-500 focus:outline-none resize-none"
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Objectives & Problems:</h4>
                    
                    {/* Objectives */}
                    <div className="mb-4">
                      <h5 className="text-xs font-semibold text-slate-400 mb-2">Objectives:</h5>
                      <div className="space-y-2">
                        {objectives.map((obj, index) => (
                          <div key={obj.id || index} className="flex items-center gap-2 bg-slate-700 p-2 rounded">
                            <span className="text-sm text-slate-300">{obj.text}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              obj.completed ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'
                            }`}>
                              {obj.completed ? '✓' : '○'}
                            </span>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newObjective}
                            onChange={(e) => setNewObjective(e.target.value)}
                            placeholder="Add objective..."
                            className="flex-1 bg-slate-800 border border-slate-600 text-slate-100 px-2 py-1 rounded text-sm focus:border-slate-500 focus:outline-none"
                          />
                          <button
                            onClick={handleAddObjective}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            ➕
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Problems */}
                    <div>
                      <h5 className="text-xs font-semibold text-slate-400 mb-2">Problems:</h5>
                      <div className="space-y-2">
                        {problems.map((prob, index) => (
                          <div key={prob.id || index} className="flex items-center gap-2 bg-slate-700 p-2 rounded">
                            <span className="text-sm text-slate-300">{prob.text}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              prob.solved ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                            }`}>
                              {prob.solved ? '✓' : '⚠'}
                            </span>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newProblem}
                            onChange={(e) => setNewProblem(e.target.value)}
                            placeholder="Add problem..."
                            className="flex-1 bg-slate-800 border border-slate-600 text-slate-100 px-2 py-1 rounded text-sm focus:border-slate-500 focus:outline-none"
                          />
                          <button
                            onClick={handleAddProblem}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            ➕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Initiative Tracker Tab */}
            {activeTab === 'initiative' && (
              <DMInitiativeTracker partyId={partyId} partyCharacters={partyCharacters} />
            )}

            {/* Enemy Catalog Tab */}
            {activeTab === 'enemies' && (
              <div className="fantasy-card">
                <h3 className="text-xl font-bold text-slate-100 mb-4">👹 Enemy Catalog</h3>
                <p className="text-slate-400 mb-4">Monster database and encounter builder coming soon...</p>
                <div className="bg-slate-700/50 p-6 rounded-lg text-center">
                  <div className="text-4xl mb-4">👹</div>
                  <h4 className="text-lg font-semibold text-slate-200 mb-2">Enemy Catalog</h4>
                  <p className="text-slate-400">Search monsters, build encounters, and manage combat</p>
                </div>
              </div>
            )}

            {/* Item Catalog Tab */}
            {activeTab === 'items' && (
              <div className="fantasy-card">
                <h3 className="text-xl font-bold text-slate-100 mb-4">⚔️ Item Catalog</h3>
                <p className="text-slate-400 mb-4">Weapons, armor, and magical items database coming soon...</p>
                <div className="bg-slate-700/50 p-6 rounded-lg text-center">
                  <div className="text-4xl mb-4">⚔️</div>
                  <h4 className="text-lg font-semibold text-slate-200 mb-2">Item Catalog</h4>
                  <p className="text-slate-400">Browse weapons, armor, and magical items</p>
                </div>
              </div>
            )}

            {/* Spell Catalog Tab */}
            {activeTab === 'spells' && (
              <div className="fantasy-card">
                <h3 className="text-xl font-bold text-slate-100 mb-4">✨ Spell Catalog</h3>
                <p className="text-slate-400 mb-4">Spell database and reference coming soon...</p>
                <div className="bg-slate-700/50 p-6 rounded-lg text-center">
                  <div className="text-4xl mb-4">✨</div>
                  <h4 className="text-lg font-semibold text-slate-200 mb-2">Spell Catalog</h4>
                  <p className="text-slate-400">Search and reference spells by class and level</p>
                </div>
              </div>
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

            {/* Dice Roller Tab */}
            {activeTab === 'dice' && (
              <div className="fantasy-card">
                <h3 className="text-xl font-bold text-slate-100 mb-4">🎲 Dice Roller</h3>
                <p className="text-slate-400 mb-4">Quick dice rolling tools coming soon...</p>
                <div className="bg-slate-700/50 p-6 rounded-lg text-center">
                  <div className="text-4xl mb-4">🎲</div>
                  <h4 className="text-lg font-semibold text-slate-200 mb-2">Dice Roller</h4>
                  <p className="text-slate-400">Quick access to common dice rolls</p>
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

            {/* Weather & Time Tab */}
            {activeTab === 'weather' && (
              <div className="fantasy-card">
                <h3 className="text-xl font-bold text-slate-100 mb-4">🌤️ Weather & Time</h3>
                <p className="text-slate-400 mb-4">Environmental conditions tracker coming soon...</p>
                <div className="bg-slate-700/50 p-6 rounded-lg text-center">
                  <div className="text-4xl mb-4">🌤️</div>
                  <h4 className="text-lg font-semibold text-slate-200 mb-2">Weather & Time</h4>
                  <p className="text-slate-400">Track weather conditions and time of day</p>
                </div>
              </div>
            )}

            {/* Catalogs Tab */}
            {activeTab === 'catalogs' && (
              <DMCatalogs />
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 