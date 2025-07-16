import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { getPartyCharacters, updateCharacter } from '../firebase/database';
import { manualCampaignService } from '../services/manualCampaign';
import { dmToolsService } from '../services/dmTools';
import { levelUpService } from '../services/levelUpService';
import { manualCombatService } from '../services/manualCombat';
import PlayerCharacterSheet from '../components/PlayerCharacterSheet';
import SpellSelectionModal from '../components/SpellSelectionModal';
import LevelUpNotification from '../components/LevelUpNotification';
import DMCombatView from '../components/dm/DMCombatView';
import PlayerCombatDisplay from '../components/combat/PlayerCombatDisplay';

export default function ManualCampaign() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [partyCharacters, setPartyCharacters] = useState([]);
  const [story, setStory] = useState(null);

  const [showMapEditor, setShowMapEditor] = useState(false);
  const [campaignMap, setCampaignMap] = useState([]);
  const [mapTitle, setMapTitle] = useState('Campaign Map');
  const [mapSize, setMapSize] = useState({ width: 15, height: 10 });
  const [selectedTile, setSelectedTile] = useState('grass');
  const [selectedTool, setSelectedTool] = useState('draw');
  const [showSubMapEditor, setShowSubMapEditor] = useState(false);
  const [selectedSubMapTile, setSelectedSubMapTile] = useState({ x: 0, y: 0 });
  const [subMaps, setSubMaps] = useState({});
  const [currentSubMap, setCurrentSubMap] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [playerViewMode, setPlayerViewMode] = useState('hidden');
  const [isDM, setIsDM] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showSpellSelection, setShowSpellSelection] = useState(false);
  const [spellSelectionCharacter, setSpellSelectionCharacter] = useState(null);
  const [showLevelUpNotification, setShowLevelUpNotification] = useState(false);
  const [levelUpCharacter, setLevelUpCharacter] = useState(null);
  const [showCombatView, setShowCombatView] = useState(false);
  const [combatData, setCombatData] = useState(null);

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
      loadMap();
    }
  }, [user, partyId]);

  // Real-time listener for player view changes (for non-DM users)
  useEffect(() => {
    if (!user || !partyId || isDM) return;

    const unsubscribe = dmToolsService.listenToPlayerView(partyId, (viewMode) => {
      setPlayerViewMode(viewMode);
      // Exit initial loading when any view mode is set (including 'map')
      setIsInitialLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, partyId, isDM]);

  // Real-time listener for map updates and scene changes (for all users)
  useEffect(() => {
    if (!user || !partyId) return;

    const unsubscribe = dmToolsService.listenToCampaignStory(partyId, (story) => {
      if (story) {
        // Update story state
        setStory(story);
        
        // Handle map updates
        if (story.campaignMap) {
          // Convert Firestore format back to 2D array format
          const convertedMap = manualCampaignService.convertMapFromFirestore(story.campaignMap);
          if (convertedMap) {
            setMapTitle(convertedMap.title);
            setCampaignMap(convertedMap.content);
            setSubMaps(convertedMap.subMaps);
            setMapSize(convertedMap.size);
          }
        }
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, partyId]);

  // Real-time listener for character updates (for level-up detection)
  useEffect(() => {
    if (!user || !partyId || isDM) return;

    const unsubscribe = dmToolsService.listenToPartyCharacters(partyId, (characters) => {
      if (characters) {
        setPartyCharacters(characters);
        
        // Check for level-ups for the current user's character
        const myCharacter = characters.find(char => char.userId === user.uid);
        if (myCharacter && levelUpService.shouldLevelUp(myCharacter)) {
          setLevelUpCharacter(myCharacter);
          setShowLevelUpNotification(true);
        }
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, partyId, isDM]);

  // Real-time listener for combat updates
  useEffect(() => {
    if (!user || !partyId) return;

    let unsubscribe = null;
    
    const setupCombatListener = async () => {
      try {
        unsubscribe = await manualCombatService.listenToCombatState(partyId, (combatState) => {
          if (combatState) {
            if (combatState.active) {
              setCombatData(combatState);
            } else if (combatState.setup) {
              // Show combat setup data
              setCombatData({
                ...combatState,
                active: false,
                setup: true,
                initiativeOrder: combatState.setup.combatants || []
              });
            }
          }
        });
      } catch (error) {
        console.error('Error setting up combat listener:', error);
      }
    };

    setupCombatListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, partyId]);

  // Global mouse up handler to stop dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const loadMap = async () => {
    try {
      const mapData = await manualCampaignService.loadMapFromDatabase(partyId);
      setMapTitle(mapData.title);
      setCampaignMap(mapData.content);
      setSubMaps(mapData.subMaps);
      setMapSize(mapData.size);
    } catch (error) {
      console.error('Error loading map:', error);
      // Fallback to localStorage
      const mapData = manualCampaignService.loadMap(partyId);
      setMapTitle(mapData.title);
      setCampaignMap(mapData.content);
      setSubMaps(mapData.subMaps);
      setMapSize(mapData.size);
    }
  };

  const tileTypes = manualCampaignService.getTileTypes();

  const initializeMap = () => {
    return manualCampaignService.initializeMap(mapSize);
  };

  const handleSaveMap = async () => {
    try {
      await manualCampaignService.saveMapToDatabase(partyId, {
        title: mapTitle,
        content: campaignMap,
        size: mapSize,
        subMaps: subMaps
      });
      setShowMapEditor(false);
    } catch (error) {
      console.error('Error saving map:', error);
    }
  };

  const handleTileClick = async (x, y) => {
    let newMap;
    if (selectedTool === 'draw') {
      newMap = manualCampaignService.updateMapTile(campaignMap, x, y, selectedTile);
    } else if (selectedTool === 'erase') {
      newMap = manualCampaignService.updateMapTile(campaignMap, x, y, 'empty');
    }
    
    setCampaignMap(newMap);
    
    // Save to database for real-time updates
    try {
      await manualCampaignService.saveMapToDatabase(partyId, {
        title: mapTitle,
        content: newMap,
        size: mapSize,
        subMaps: subMaps
      });
    } catch (error) {
      console.error('Error saving map to database:', error);
    }
  };

  const handleTileMouseDown = (x, y) => {
    setIsDragging(true);
    setDragStart({ x, y });
    handleTileClick(x, y);
  };

  const handleTileMouseEnter = (x, y) => {
    if (isDragging) {
      handleTileClick(x, y);
    }
  };

  const handleTileMouseUp = () => {
    setIsDragging(false);
  };

  const handleClearMap = async () => {
    const newMap = initializeMap();
    setCampaignMap(newMap);
    
    // Save to database for real-time updates
    try {
      await manualCampaignService.saveMapToDatabase(partyId, {
        title: mapTitle,
        content: newMap,
        size: mapSize,
        subMaps: subMaps
      });
    } catch (error) {
      console.error('Error saving cleared map to database:', error);
    }
  };

  const handleResizeMap = async () => {
    const newMap = initializeMap();
    setCampaignMap(newMap);
    
    // Save to database for real-time updates
    try {
      await manualCampaignService.saveMapToDatabase(partyId, {
        title: mapTitle,
        content: newMap,
        size: mapSize,
        subMaps: subMaps
      });
    } catch (error) {
      console.error('Error saving resized map to database:', error);
    }
  };

  const handleTileRightClick = (x, y, e) => {
    e.preventDefault();
    setSelectedSubMapTile({ x, y });
    setCurrentSubMap(subMaps[`${x}-${y}`] || manualCampaignService.initializeSubMap());
    setShowSubMapEditor(true);
  };

  const initializeSubMap = () => {
    return manualCampaignService.initializeSubMap();
  };

  const handleSubMapTileClick = async (x, y) => {
    let newSubMap;
    if (selectedTool === 'draw') {
      newSubMap = manualCampaignService.updateSubMapTile(currentSubMap, x, y, selectedTile);
    } else if (selectedTool === 'erase') {
      newSubMap = manualCampaignService.updateSubMapTile(currentSubMap, x, y, 'empty');
    }
    
    setCurrentSubMap(newSubMap);
  };

  const handleSubMapTileMouseDown = (x, y) => {
    setIsDragging(true);
    setDragStart({ x, y });
    handleSubMapTileClick(x, y);
  };

  const handleSubMapTileMouseEnter = (x, y) => {
    if (isDragging) {
      handleSubMapTileClick(x, y);
    }
  };

  const handleSaveSubMap = async () => {
    const newSubMaps = manualCampaignService.saveSubMap(subMaps, selectedSubMapTile.x, selectedSubMapTile.y, currentSubMap);
    setSubMaps(newSubMaps);
    setShowSubMapEditor(false);
    
    // Save to database for real-time updates
    try {
      await manualCampaignService.saveMapToDatabase(partyId, {
        title: mapTitle,
        content: campaignMap,
        size: mapSize,
        subMaps: newSubMaps
      });
    } catch (error) {
      console.error('Error saving sub-map to database:', error);
    }
  };

  const handleClearSubMap = () => {
    setCurrentSubMap(initializeSubMap());
  };

  const getTileHasSubMap = (x, y) => {
    return manualCampaignService.getTileHasSubMap(subMaps, x, y);
  };

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      
      // Load party characters
      const characters = await getPartyCharacters(partyId);
      setPartyCharacters(characters);
      
      // Check for level-ups for the current user's character
      if (!isDM && user) {
        const myCharacter = characters.find(char => char.userId === user.uid);
        if (myCharacter && levelUpService.shouldLevelUp(myCharacter)) {
          setLevelUpCharacter(myCharacter);
          setShowLevelUpNotification(true);
        }
      }
      
      // Load or create campaign story using service
      const campaignStory = await manualCampaignService.loadCampaignData(partyId);
      setStory(campaignStory);
      
      // Check if user is DM and load player view mode
      const party = await manualCampaignService.getPartyData(partyId);
      setIsDM(party?.dmId === user?.uid);
      
      if (party?.dmId !== user?.uid) {
        // Player view - check what DM wants them to see
        const viewMode = await dmToolsService.getPlayerView(partyId);
        setPlayerViewMode(viewMode);
        
        // Exit initial loading when we have a view mode (including 'map')
        setIsInitialLoading(false);
      } else {
        // DM view - not in initial loading
        setIsInitialLoading(false);
      }
    } catch (error) {
      console.error('Error loading campaign data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate available spell slots based on character level and class
  const calculateSpellSlots = (character) => {
    if (!character || !character.class) {
      return {};
    }
    
    const spellcastingClasses = ['Wizard', 'Sorcerer', 'Warlock', 'Cleric', 'Druid', 'Bard', 'Paladin', 'Ranger'];
    const isSpellcaster = spellcastingClasses.includes(character.class);
    
    if (!isSpellcaster) return {};
    
    const level = character.level || 1;
    const slots = {};
    
    // Basic spell slot calculation (simplified)
    if (level >= 1) slots[1] = 2; // 2 level 1 spells
    if (level >= 2) slots[2] = 1; // 1 level 2 spell
    if (level >= 3) slots[3] = 1; // 1 level 3 spell
    if (level >= 4) slots[4] = 1; // 1 level 4 spell
    if (level >= 5) slots[5] = 1; // 1 level 5 spell
    if (level >= 6) slots[6] = 1; // 1 level 6 spell
    if (level >= 7) slots[7] = 1; // 1 level 7 spell
    if (level >= 8) slots[8] = 1; // 1 level 8 spell
    if (level >= 9) slots[9] = 1; // 1 level 9 spell
    
    // Cantrips (always available)
    slots[0] = 3; // 3 cantrips
    
    return slots;
  };

  const handleLearnSpells = (character) => {
    if (!character) {
      console.warn('Attempted to open spell selection with null character');
      return;
    }
    setSpellSelectionCharacter(character);
    setShowSpellSelection(true);
  };

  const handleLevelUpComplete = async (updatedCharacter) => {
    try {
      // Update character in database
      await updateCharacter(updatedCharacter.id, updatedCharacter);
      
      // Reload campaign data to reflect changes
      await loadCampaignData();
      
      // Close notification
      setShowLevelUpNotification(false);
      setLevelUpCharacter(null);
    } catch (error) {
      console.error('Error completing level up:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-300 text-lg font-medium">Loading manual campaign...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="fantasy-container">
        {/* Initial Loading Screen for Players */}
        {!isDM && isInitialLoading && (
          <div className="min-h-screen flex items-center justify-center">
            <div className="fantasy-card max-w-md mx-auto text-center">
              <div className="animate-pulse mb-6">
                <div className="text-6xl mb-4">🎲</div>
                <div className="text-4xl mb-2">⚔️</div>
                <div className="text-2xl">🗺️</div>
              </div>
              <h2 className="text-2xl font-bold text-slate-100 mb-4">Campaign Starting...</h2>
              <p className="text-slate-300 mb-6">
                Please wait while the Dungeon Master sets up your game.
              </p>
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-400 border-t-transparent"></div>
                <span className="text-slate-400 text-sm">Waiting for DM...</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Only show if not in initial loading or if DM */}
        {(!isInitialLoading || isDM) && (
          <>
            {/* Header */}
            <div className="mb-8">
              <div className="mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mb-2">
                    Manual Campaign
                  </h1>
                  <p className="text-slate-400">Traditional D&D experience - full control over your story</p>
                </div>
              </div>
            </div>

        {/* Player View Content - Based on DM's choice */}
        {!isDM && (
          <div className="fantasy-card mb-8">
            {/* My Character Button - Always visible for players */}
            {(() => {
              const myCharacter = partyCharacters.find(char => char.userId === user?.uid);
              if (myCharacter) {
                return (
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-100 mb-1">My Character</h3>
                        <p className="text-sm text-slate-300">
                          {myCharacter.name} • Level {myCharacter.level} • {myCharacter.class}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCharacter(myCharacter);
                          setShowCharacterSheet(true);
                        }}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 flex items-center gap-2"
                      >
                        <span>👤</span>
                        View Character Sheet
                      </button>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {playerViewMode === 'scene' && (
              <>
                <h2 className="text-xl font-bold text-slate-100 mb-4">🎭 Current Scene</h2>
                <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-6">
                  {(() => {
                    if (story && story.currentScene) {
                      const currentScene = story.currentScene;
                      return (
                        <>
                          <div className="mb-4">
                            <h3 className="text-lg font-semibold text-slate-200 mb-2">{currentScene.title}</h3>
                            <p className="text-slate-300 leading-relaxed">{currentScene.description}</p>
                          </div>
                          
                          {/* Display objectives if any */}
                          {currentScene.objectives && currentScene.objectives.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-md font-semibold text-slate-200 mb-2">🎯 Objectives</h4>
                              <ul className="space-y-1">
                                {currentScene.objectives.map((objective, index) => (
                                  <li key={objective.id || index} className="flex items-center gap-2 text-sm">
                                    <span className={`w-2 h-2 rounded-full ${objective.completed ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                    <span className={`${objective.completed ? 'text-slate-400 line-through' : 'text-slate-300'}`}>
                                      {objective.text}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Display problems if any */}
                          {currentScene.problems && currentScene.problems.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-md font-semibold text-slate-200 mb-2">⚠️ Problems</h4>
                              <ul className="space-y-1">
                                {currentScene.problems.map((problem, index) => (
                                  <li key={problem.id || index} className="flex items-center gap-2 text-sm">
                                    <span className={`w-2 h-2 rounded-full ${problem.solved ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    <span className={`${problem.solved ? 'text-slate-400 line-through' : 'text-slate-300'}`}>
                                      {problem.text}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      );
                    } else {
                      return (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-4">🎭</div>
                          <h3 className="text-lg font-semibold text-slate-200 mb-2">No Active Scene</h3>
                          <p className="text-slate-400">
                            The Dungeon Master hasn't set up a scene yet.
                          </p>
                        </div>
                      );
                    }
                  })()}
                </div>
              </>
            )}

            {playerViewMode === 'map' && (
              <>
                <h2 className="text-xl font-bold text-slate-100 mb-4">🗺️ Campaign Map</h2>
                <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-6">
                  {campaignMap && campaignMap.length > 0 ? (
                    <div className="overflow-x-auto">
                      <div className="inline-block">
                        {campaignMap.map((row, y) => (
                          <div key={y} className="flex">
                            {row.map((tile, x) => (
                              <div
                                key={`${x}-${y}`}
                                className={`w-8 h-8 border border-slate-600 flex items-center justify-center text-xs ${tileTypes[tile]?.color || 'bg-slate-700'}`}
                                title={`${x}, ${y}: ${tileTypes[tile]?.name || 'Unknown'}`}
                              >
                                {tileTypes[tile]?.symbol || '⬜'}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">🗺️</div>
                      <h3 className="text-lg font-semibold text-slate-200 mb-2">No Map Available</h3>
                      <p className="text-slate-400">
                        The Dungeon Master hasn't created a map yet.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {playerViewMode === 'combat' && (
              <>
                <h2 className="text-xl font-bold text-slate-100 mb-4">⚔️ Combat View</h2>
                <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-6">
                  {combatData ? (
                    <PlayerCombatDisplay 
                      combatData={combatData} 
                      currentUserId={user?.uid}
                      partyId={partyId}
                    />
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl mb-4">⚔️</div>
                      <h3 className="text-lg font-semibold text-slate-200 mb-2">Combat in Progress</h3>
                      <p className="text-slate-300 mb-4">
                        The Dungeon Master is managing the combat. You'll see your turn when it comes up.
                      </p>
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-pulse w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-slate-400 text-sm">Waiting for your turn...</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {playerViewMode === 'hidden' && (
              <>
                <h2 className="text-xl font-bold text-slate-100 mb-4">🎭 DM is Setting Up</h2>
                <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-12 text-center">
                  <div className="text-6xl mb-6 animate-pulse">🎭</div>
                  <h3 className="text-2xl font-bold text-slate-200 mb-4">Please Wait</h3>
                  <p className="text-slate-300 mb-4 text-lg">
                    The Dungeon Master is preparing something special for you...
                  </p>
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-400 border-t-transparent"></div>
                    <span className="text-slate-400">Setting up the scene</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    This screen will automatically update when the DM reveals the content.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* DM View - Full Campaign Map */}
        {isDM && (
          <div className="fantasy-card mb-8">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Campaign Map</h2>
            {campaignMap && campaignMap.length > 0 ? (
              <>
                <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-4 overflow-x-auto">
                  <div className="inline-block">
                    {campaignMap.map((row, y) => (
                      <div key={y} className="flex">
                        {row.map((tile, x) => (
                          <div
                            key={`${x}-${y}`}
                            className={`w-8 h-8 border border-slate-600 flex items-center justify-center text-xs ${tileTypes[tile]?.color || 'bg-slate-700'}`}
                            title={`${x}, ${y}: ${tileTypes[tile]?.name || 'Unknown'}`}
                          >
                            {tileTypes[tile]?.symbol || '⬜'}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={() => setShowMapEditor(true)}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                  >
                    Edit Map
                  </button>
                  <button
                    onClick={() => setShowCombatView(true)}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                  >
                    ⚔️ Combat Setup
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">No map created yet.</p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setShowMapEditor(true)}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300"
                  >
                    Create Map
                  </button>
                  <button
                    onClick={() => setShowCombatView(true)}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300"
                  >
                    ⚔️ Combat Setup
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Party Characters */}
        <div className="fantasy-card">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Party Members</h2>
          <div className="space-y-3">
            {partyCharacters
              .filter(character => character.userId !== user?.uid) // Filter out current user's character
              .map((character) => (
                <div key={character.id} className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <h3 className="font-semibold text-slate-100">{character.name}</h3>
                        <p className="text-sm text-slate-400">{character.class} • Level {character.level}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm text-slate-300">
                          HP: {character.hp}/{character.maxHp}
                        </div>
                        <div className="text-xs text-slate-400">
                          AC: {character.ac}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedCharacter(character);
                            setShowCharacterSheet(true);
                          }}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-medium px-3 py-1 rounded-lg transition-all duration-300"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            {partyCharacters.filter(character => character.userId !== user?.uid).length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-2">No other party members yet.</p>
                <p className="text-slate-500 text-sm">Other players will appear here when they join the campaign.</p>
              </div>
            )}
          </div>
        </div>

        {/* Map Editor Modal */}
        {showMapEditor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="fantasy-card max-w-6xl w-full max-h-[95vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-100">Grid-Based Map Editor</h2>
                <button
                  onClick={() => setShowMapEditor(false)}
                  className="text-slate-400 hover:text-slate-200 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Map Controls */}
                <div className="lg:col-span-1 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Map Title
                    </label>
                    <input
                      type="text"
                      value={mapTitle}
                      onChange={(e) => setMapTitle(e.target.value)}
                      className="w-full bg-slate-700/50 border border-slate-600/50 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                      placeholder="Enter map title..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Map Size
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Width</label>
                        <input
                          type="number"
                          min="5"
                          max="30"
                          value={mapSize.width}
                          onChange={(e) => {
                            setMapSize(prev => ({ ...prev, width: parseInt(e.target.value) }));
                            handleResizeMap();
                          }}
                          className="w-full bg-slate-700/50 border border-slate-600/50 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Height</label>
                        <input
                          type="number"
                          min="5"
                          max="20"
                          value={mapSize.height}
                          onChange={(e) => {
                            setMapSize(prev => ({ ...prev, height: parseInt(e.target.value) }));
                            handleResizeMap();
                          }}
                          className="w-full bg-slate-700/50 border border-slate-600/50 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Tools
                    </label>
                    <div className="space-y-2">
                      <button
                        onClick={() => setSelectedTool('draw')}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          selectedTool === 'draw' 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                            : 'bg-slate-700/30 text-slate-300 hover:bg-slate-700/50'
                        }`}
                      >
                        ✏️ Draw
                      </button>
                      <button
                        onClick={() => setSelectedTool('erase')}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          selectedTool === 'erase' 
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                            : 'bg-slate-700/30 text-slate-300 hover:bg-slate-700/50'
                        }`}
                      >
                        🗑️ Erase
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Tiles
                    </label>
                    <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                      {Object.entries(tileTypes).map(([key, tile]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedTile(key)}
                          className={`p-2 rounded-lg border transition-colors ${
                            selectedTile === key 
                              ? 'border-amber-500 bg-amber-500/20' 
                              : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                          }`}
                        >
                          <div className={`w-6 h-6 ${tile.color} rounded flex items-center justify-center text-xs mx-auto mb-1`}>
                            {tile.symbol}
                          </div>
                          <div className="text-xs text-slate-300 truncate">{tile.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleClearMap}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                    >
                      Clear Map
                    </button>
                    <button
                      onClick={handleSaveMap}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                    >
                      Save Map
                    </button>
                  </div>
                </div>

                {/* Map Canvas */}
                <div className="lg:col-span-3">
                  <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-4 overflow-auto map-editor">
                    <div className="inline-block">
                      {campaignMap.map((row, y) => (
                        <div key={y} className="flex">
                          {row.map((tile, x) => (
                            <button
                              key={`${x}-${y}`}
                              onMouseDown={() => handleTileMouseDown(x, y)}
                              onMouseEnter={() => handleTileMouseEnter(x, y)}
                              onMouseUp={handleTileMouseUp}
                              onContextMenu={(e) => handleTileRightClick(x, y, e)}
                              className={`w-10 h-10 border border-slate-600 flex items-center justify-center text-sm transition-colors hover:border-amber-400 relative ${tileTypes[tile]?.color || 'bg-slate-700'}`}
                              title={`${x}, ${y}: ${tileTypes[tile]?.name || 'Unknown'}${getTileHasSubMap(x, y) ? ' (Right-click for sub-map)' : ' (Right-click to create sub-map)'}`}
                            >
                              {tileTypes[tile]?.symbol || '⬜'}
                              {getTileHasSubMap(x, y) && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center text-[10px] text-white">
                                  📍
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-400 text-center">
                    Click or drag to place/remove tiles. Current tool: {selectedTool === 'draw' ? 'Draw' : 'Erase'} | Selected tile: {tileTypes[selectedTile]?.name}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Character Sheet Modal */}
        <PlayerCharacterSheet
          character={selectedCharacter}
          isOpen={showCharacterSheet}
          onClose={() => {
            setShowCharacterSheet(false);
            setSelectedCharacter(null);
          }}
        />

        {/* Sub-Map Editor Modal */}
        {showSubMapEditor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="fantasy-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-100">
                  Sub-Map Editor - Tile ({selectedSubMapTile.x}, {selectedSubMapTile.y})
                </h2>
                <button
                  onClick={() => setShowSubMapEditor(false)}
                  className="text-slate-400 hover:text-slate-200 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sub-Map Canvas */}
                <div className="lg:col-span-2">
                  <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-4 map-editor">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-slate-100">Sub-Map (8x8)</h3>
                      <button
                        onClick={handleClearSubMap}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                      >
                        Clear
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-8 gap-1 mb-4">
                      {currentSubMap.map((row, y) =>
                        row.map((tile, x) => (
                          <button
                            key={`sub-${x}-${y}`}
                            onMouseDown={() => handleSubMapTileMouseDown(x, y)}
                            onMouseEnter={() => handleSubMapTileMouseEnter(x, y)}
                            onMouseUp={handleTileMouseUp}
                            className={`w-12 h-12 border border-slate-600 flex items-center justify-center text-lg transition-colors hover:border-amber-400 ${tileTypes[tile]?.color || 'bg-slate-700'}`}
                            title={`${x}, ${y}: ${tileTypes[tile]?.name || 'Empty'}`}
                          >
                            {tileTypes[tile]?.symbol || '⬜'}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-Map Controls */}
                <div className="space-y-4">
                  <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Tools</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => setSelectedTool('draw')}
                        className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                          selectedTool === 'draw'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        ✏️ Draw
                      </button>
                      <button
                        onClick={() => setSelectedTool('erase')}
                        className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                          selectedTool === 'erase'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        🗑️ Erase
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Tile Types</h3>
                    <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                      {Object.entries(tileTypes).map(([key, tile]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedTile(key)}
                          className={`p-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                            selectedTile === key
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          <span className="text-lg">{tile.symbol}</span>
                          <span className="truncate">{tile.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveSubMap}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium"
                    >
                      Save Sub-Map
                    </button>
                    <button
                      onClick={() => setShowSubMapEditor(false)}
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Spell Selection Modal */}
        {spellSelectionCharacter && (
          <SpellSelectionModal
            character={spellSelectionCharacter}
            isOpen={showSpellSelection}
            onClose={() => {
              setShowSpellSelection(false);
              setSpellSelectionCharacter(null);
            }}
            onUpdate={() => {
              loadCampaignData();
            }}
            availableSpellSlots={calculateSpellSlots(spellSelectionCharacter)}
          />
        )}

        {/* Level Up Notification */}
        <LevelUpNotification
          character={levelUpCharacter}
          isVisible={showLevelUpNotification}
          onClose={() => {
            setShowLevelUpNotification(false);
            setLevelUpCharacter(null);
          }}
          onLevelUpComplete={handleLevelUpComplete}
        />

        {/* Combat View Modal */}
        {showCombatView && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="fantasy-card max-w-7xl w-full max-h-[95vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-100">⚔️ Combat Management</h2>
                <button
                  onClick={() => setShowCombatView(false)}
                  className="text-slate-400 hover:text-slate-200 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <DMCombatView
                partyId={partyId}
                partyCharacters={partyCharacters}
                onCombatStart={(data) => {
                  setCombatData(data);
                  // Set player view to combat mode
                  dmToolsService.setPlayerView(partyId, 'combat');
                  setShowCombatView(false);
                }}
              />
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
} 