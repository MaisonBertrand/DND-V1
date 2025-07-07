import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { 
  getPartyCharacters, 
  getPartyById,
  getUserProfile,
  getUserProfiles
} from '../firebase/database';
import { manualCampaignService } from '../services/manualCampaign';

export default function CampaignLobby() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [party, setParty] = useState(null);
  const [partyCharacters, setPartyCharacters] = useState([]);
  const [partyMemberProfiles, setPartyMemberProfiles] = useState({});
  const [userCharacter, setUserCharacter] = useState(null);
  const [isDM, setIsDM] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
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
  const [showAllCharacterSheets, setShowAllCharacterSheets] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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
      loadLobbyData();
      handleLoadMap();
    }
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

  const loadLobbyData = async () => {
    try {
      setLoading(true);
      
      // Load party information
      const partyData = await getPartyById(partyId);
      setParty(partyData);
      
      // Check if user is DM
      setIsDM(partyData.dmId === user.uid);
      
      // Load party characters
      const characters = await getPartyCharacters(partyId);
      setPartyCharacters(characters);
      
      // Find user's character
      const userChar = characters.find(char => char.userId === user.uid);
      setUserCharacter(userChar);
      
      // Load party member profiles for ALL party members, not just those with characters
      if (partyData.members && partyData.members.length > 0) {
        const profiles = await getUserProfiles(partyData.members);
        const profileMap = {};
        profiles.forEach(profile => {
          if (profile && profile.userId) {
            profileMap[profile.userId] = profile;
          }
        });
        setPartyMemberProfiles(profileMap);
      }
    } catch (error) {
      console.error('Error loading lobby data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCampaign = () => {
    if (party.campaignType === 'manual') {
      if (party.dmId === user.uid) {
        navigate(`/manual-campaign-dm/${partyId}`);
      } else {
        navigate(`/manual-campaign/${partyId}`);
      }
    } else {
      navigate(`/campaign/${partyId}`);
    }
  };

  const handleCreateCharacter = () => {
    navigate(`/character-creation/${partyId}`);
  };

  const handleViewCharacterSheet = (character) => {
    setSelectedCharacter(character);
    setShowCharacterSheet(true);
  };

  const handleSaveMap = () => {
    // Save map to localStorage for now (could be expanded to database)
    localStorage.setItem(`campaign-map-${partyId}`, JSON.stringify({
      title: mapTitle,
      content: campaignMap,
      size: mapSize,
      subMaps: subMaps,
      updatedAt: new Date().toISOString()
    }));
    setShowMapEditor(false);
  };

  // Get tile types from service
  const tileTypes = manualCampaignService.getTileTypes();

  const initializeMap = () => {
    const newMap = [];
    for (let y = 0; y < mapSize.height; y++) {
      const row = [];
      for (let x = 0; x < mapSize.width; x++) {
        row.push('empty');
      }
      newMap.push(row);
    }
    return newMap;
  };

  const handleLoadMap = () => {
    const savedMap = localStorage.getItem(`campaign-map-${partyId}`);
    if (savedMap) {
      const mapData = JSON.parse(savedMap);
      setMapTitle(mapData.title);
      setCampaignMap(mapData.content || []);
      setSubMaps(mapData.subMaps || {});
      if (mapData.size) {
        setMapSize(mapData.size);
      }
    } else {
      setCampaignMap(initializeMap());
    }
  };

  const handleTileClick = (x, y) => {
    if (selectedTool === 'draw') {
      const newMap = [...campaignMap];
      newMap[y][x] = selectedTile;
      setCampaignMap(newMap);
    } else if (selectedTool === 'erase') {
      const newMap = [...campaignMap];
      newMap[y][x] = 'empty';
      setCampaignMap(newMap);
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

  const handleClearMap = () => {
    setCampaignMap(initializeMap());
  };

  const handleResizeMap = () => {
    const newMap = initializeMap();
    setCampaignMap(newMap);
  };

  const handleTileRightClick = (x, y, e) => {
    e.preventDefault();
    const tileKey = `${x}-${y}`;
    setSelectedSubMapTile({ x, y });
    setCurrentSubMap(subMaps[tileKey] || initializeSubMap());
    setShowSubMapEditor(true);
  };

  const initializeSubMap = () => {
    const newSubMap = [];
    for (let y = 0; y < 8; y++) {
      const row = [];
      for (let x = 0; x < 8; x++) {
        row.push('empty');
      }
      newSubMap.push(row);
    }
    return newSubMap;
  };

  const handleSubMapTileClick = (x, y) => {
    if (selectedTool === 'draw') {
      const newSubMap = [...currentSubMap];
      newSubMap[y][x] = selectedTile;
      setCurrentSubMap(newSubMap);
    } else if (selectedTool === 'erase') {
      const newSubMap = [...currentSubMap];
      newSubMap[y][x] = 'empty';
      setCurrentSubMap(newSubMap);
    }
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

  const handleSaveSubMap = () => {
    const tileKey = `${selectedSubMapTile.x}-${selectedSubMapTile.y}`;
    const newSubMaps = { ...subMaps, [tileKey]: currentSubMap };
    setSubMaps(newSubMaps);
    setShowSubMapEditor(false);
  };

  const handleClearSubMap = () => {
    setCurrentSubMap(initializeSubMap());
  };

  const getTileHasSubMap = (x, y) => {
    const tileKey = `${x}-${y}`;
    return subMaps[tileKey] && subMaps[tileKey].some(row => row.some(tile => tile !== 'empty'));
  };

  const getUsername = (userId) => {
    const profile = partyMemberProfiles[userId];
    if (profile?.username) {
      return profile.username;
    }
    if (profile?.displayName) {
      return profile.displayName;
    }
    if (profile?.email) {
      return profile.email.split('@')[0];
    }
    return 'Unknown User';
  };

  const getCharacterStatus = (character) => {
    if (!character) return 'No Character';
    if (character.name && character.race && character.class) {
      return 'Ready';
    }
    return 'Incomplete';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Ready': return 'text-green-400';
      case 'Incomplete': return 'text-yellow-400';
      case 'No Character': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Ready': return '✅';
      case 'Incomplete': return '⚠️';
      case 'No Character': return '❌';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-300 text-lg font-medium">Loading campaign lobby...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="fantasy-container">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mb-4">
              Campaign Lobby
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-amber-400 to-orange-400 mx-auto rounded-full mb-4"></div>
            <h2 className="text-2xl font-semibold text-slate-100 mb-2">{party.name}</h2>
            <p className="text-slate-400 mb-4">{party.description}</p>
            <div className="flex items-center justify-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                party.campaignType === 'ai-assist'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-600/20 text-slate-300 border border-slate-500/30'
              }`}>
                {party.campaignType === 'ai-assist' ? '🤖 AI Assist' : '✍️ Manual Campaign'}
              </div>
              <div className="text-slate-400">
                {partyCharacters.filter(char => char.userId !== party.dmId).length} / {party.maxPlayers} Players
              </div>
            </div>
          </div>
        </div>

        {/* Party Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {(() => {
            console.log('🔍 DEBUG - Party Data:', {
              partyMembers: party.members,
              dmId: party.dmId,
              currentUserId: user.uid,
              filteredMembers: party.members?.filter(memberId => memberId !== party.dmId)
            });
            
            return party.members?.filter(memberId => memberId !== party.dmId).map((memberId) => {
              const character = partyCharacters.find(char => char.userId === memberId);
              const status = getCharacterStatus(character);
              const isCurrentUser = memberId === user.uid;
            
              return (
                <div key={memberId} className={`fantasy-card ${isCurrentUser ? 'ring-2 ring-amber-500/50' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center mr-3">
                        <span className="text-slate-300 font-semibold">
                          {getUsername(memberId).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-100">{getUsername(memberId)}</h3>
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${getStatusColor(status)}`}>
                      {getStatusIcon(status)} {status}
                    </div>
                  </div>
                  
                  {character && (
                    <div className="space-y-2">
                      <div className="bg-slate-700/30 rounded-lg p-3">
                        <h4 className="font-semibold text-slate-100 mb-1">{character.name}</h4>
                        <p className="text-sm text-slate-400">
                          {character.race} {character.class} • Level {character.level}
                        </p>
                        {character.background && (
                          <p className="text-xs text-slate-500 mt-1">{character.background}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>



        {/* Campaign Map Display */}
        {campaignMap && campaignMap.length > 0 && (
          <div className="fantasy-card mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-100">{mapTitle}</h3>
              {isDM && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowMapEditor(true)}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                  >
                    🗺️ Edit Map
                  </button>
                  <button
                    onClick={() => setShowAllCharacterSheets(true)}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                  >
                    📋 View Characters
                  </button>
                </div>
              )}
            </div>
            
            <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-4 overflow-x-auto">
              <div className="inline-block">
                {campaignMap.map((row, y) => (
                  <div key={y} className="flex">
                    {row.map((tile, x) => (
                      <div
                        key={`${x}-${y}`}
                        className={`w-8 h-8 border border-slate-600 flex items-center justify-center text-xs relative ${tileTypes[tile]?.color || 'bg-slate-700'}`}
                        title={`${x}, ${y}: ${tileTypes[tile]?.name || 'Unknown'}${getTileHasSubMap(x, y) ? ' (Has sub-map)' : ''}`}
                        onContextMenu={(e) => handleTileRightClick(x, y, e)}
                      >
                        {tileTypes[tile]?.symbol || '⬜'}
                        {getTileHasSubMap(x, y) && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center text-[8px] text-white">
                            📍
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="text-xs text-slate-400 text-center sm:text-left">
                💡 <strong>Tip:</strong> Right-click on any tile to create or edit sub-maps (detailed areas within tiles)
              </div>
              <div className="text-xs text-slate-400 text-center sm:text-right">
                📍 Purple pins indicate tiles with sub-maps
              </div>
            </div>
          </div>
        )}



        {/* Campaign Info */}
        <div className="mt-8 fantasy-card">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Campaign Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Campaign Type:</span>
              <span className="text-slate-200 ml-2">
                {party.campaignType === 'ai-assist' ? 'AI-Assisted Storytelling' : 'Manual D&D Experience'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Max Players:</span>
              <span className="text-slate-200 ml-2">{party.maxPlayers}</span>
            </div>
            <div>
              <span className="text-slate-400">Dungeon Master:</span>
              <span className="text-slate-200 ml-2">{getUsername(party.dmId)}</span>
            </div>
            <div>
              <span className="text-slate-400">Status:</span>
              <span className="text-slate-200 ml-2">
                {partyCharacters.filter(char => char.userId !== party.dmId).length === (party.members?.length - 1) ? 'Ready to Start' : 'Waiting for Characters'}
              </span>
            </div>
          </div>
          
          {/* Start Campaign Button */}
          <div className="mt-6 pt-6 border-t border-slate-600">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="text-sm text-slate-400">
                {partyCharacters.filter(char => char.userId !== party.dmId).length === (party.members?.length - 1) 
                  ? 'All players have characters and are ready to begin!'
                  : 'Waiting for all players to create their characters...'
                }
              </div>
              <button
                onClick={handleStartCampaign}
                disabled={partyCharacters.filter(char => char.userId !== party.dmId).length !== (party.members?.length - 1)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                  partyCharacters.filter(char => char.userId !== party.dmId).length === (party.members?.length - 1)
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg'
                    : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isDM 
                  ? (party.campaignType === 'manual' ? '🎯 Start Manual Campaign' : '🎯 Start AI Campaign')
                  : (party.campaignType === 'manual' ? '🎮 Join Manual Campaign' : '🎮 Join AI Campaign')
                }
              </button>
            </div>
          </div>
        </div>



        {/* Character Sheet Modal */}
        {showCharacterSheet && selectedCharacter && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="fantasy-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-100">
                  Character Sheet: {selectedCharacter.name}
                </h2>
                <button
                  onClick={() => setShowCharacterSheet(false)}
                  className="text-slate-400 hover:text-slate-200 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Basic Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-slate-400">Name:</span> <span className="text-slate-200">{selectedCharacter.name}</span></div>
                      <div><span className="text-slate-400">Race:</span> <span className="text-slate-200">{selectedCharacter.race}</span></div>
                      <div><span className="text-slate-400">Class:</span> <span className="text-slate-200">{selectedCharacter.class}</span></div>
                      <div><span className="text-slate-400">Level:</span> <span className="text-slate-200">{selectedCharacter.level}</span></div>
                      <div><span className="text-slate-400">Background:</span> <span className="text-slate-200">{selectedCharacter.background}</span></div>
                      <div><span className="text-slate-400">Alignment:</span> <span className="text-slate-200">{selectedCharacter.alignment}</span></div>
                    </div>
                  </div>

                  {/* Ability Scores */}
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Ability Scores</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-slate-400">Strength:</span> <span className="text-slate-200">{selectedCharacter.strength}</span></div>
                      <div><span className="text-slate-400">Dexterity:</span> <span className="text-slate-200">{selectedCharacter.dexterity}</span></div>
                      <div><span className="text-slate-400">Constitution:</span> <span className="text-slate-200">{selectedCharacter.constitution}</span></div>
                      <div><span className="text-slate-400">Intelligence:</span> <span className="text-slate-200">{selectedCharacter.intelligence}</span></div>
                      <div><span className="text-slate-400">Wisdom:</span> <span className="text-slate-200">{selectedCharacter.wisdom}</span></div>
                      <div><span className="text-slate-400">Charisma:</span> <span className="text-slate-200">{selectedCharacter.charisma}</span></div>
                    </div>
                  </div>

                  {/* Physical Description */}
                  {(selectedCharacter.age || selectedCharacter.height || selectedCharacter.weight || selectedCharacter.eyes || selectedCharacter.skin || selectedCharacter.hair) && (
                    <div className="bg-slate-700/30 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-slate-100 mb-3">Physical Description</h3>
                      <div className="space-y-2 text-sm">
                        {selectedCharacter.age && <div><span className="text-slate-400">Age:</span> <span className="text-slate-200">{selectedCharacter.age}</span></div>}
                        {selectedCharacter.height && <div><span className="text-slate-400">Height:</span> <span className="text-slate-200">{selectedCharacter.height}</span></div>}
                        {selectedCharacter.weight && <div><span className="text-slate-400">Weight:</span> <span className="text-slate-200">{selectedCharacter.weight}</span></div>}
                        {selectedCharacter.eyes && <div><span className="text-slate-400">Eyes:</span> <span className="text-slate-200">{selectedCharacter.eyes}</span></div>}
                        {selectedCharacter.skin && <div><span className="text-slate-400">Skin:</span> <span className="text-slate-200">{selectedCharacter.skin}</span></div>}
                        {selectedCharacter.hair && <div><span className="text-slate-400">Hair:</span> <span className="text-slate-200">{selectedCharacter.hair}</span></div>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Character Details */}
                <div className="space-y-4">
                  {/* Character Traits */}
                  {(selectedCharacter.personality || selectedCharacter.ideals || selectedCharacter.bonds || selectedCharacter.flaws) && (
                    <div className="bg-slate-700/30 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-slate-100 mb-3">Character Traits</h3>
                      <div className="space-y-3 text-sm">
                        {selectedCharacter.personality && (
                          <div>
                            <div className="text-slate-400 font-medium">Personality:</div>
                            <div className="text-slate-200">{selectedCharacter.personality}</div>
                          </div>
                        )}
                        {selectedCharacter.ideals && (
                          <div>
                            <div className="text-slate-400 font-medium">Ideals:</div>
                            <div className="text-slate-200">{selectedCharacter.ideals}</div>
                          </div>
                        )}
                        {selectedCharacter.bonds && (
                          <div>
                            <div className="text-slate-400 font-medium">Bonds:</div>
                            <div className="text-slate-200">{selectedCharacter.bonds}</div>
                          </div>
                        )}
                        {selectedCharacter.flaws && (
                          <div>
                            <div className="text-slate-400 font-medium">Flaws:</div>
                            <div className="text-slate-200">{selectedCharacter.flaws}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Backstory */}
                  {selectedCharacter.backstory && (
                    <div className="bg-slate-700/30 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-slate-100 mb-3">Backstory</h3>
                      <div className="text-sm text-slate-200 leading-relaxed">
                        {selectedCharacter.backstory}
                      </div>
                    </div>
                  )}

                  {/* Equipment */}
                  {selectedCharacter.equipment && selectedCharacter.equipment.length > 0 && (
                    <div className="bg-slate-700/30 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-slate-100 mb-3">Equipment</h3>
                      <ul className="space-y-1 text-sm">
                        {selectedCharacter.equipment.map((item, index) => (
                          <li key={index} className="text-slate-200">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Spells */}
                  {selectedCharacter.spells && selectedCharacter.spells.length > 0 && (
                    <div className="bg-slate-700/30 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-slate-100 mb-3">Spells</h3>
                      <ul className="space-y-1 text-sm">
                        {selectedCharacter.spells.map((spell, index) => (
                          <li key={index} className="text-slate-200">• {spell}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Character Sheets Modal */}
        {showAllCharacterSheets && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="fantasy-card max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-100">All Party Character Sheets</h2>
                <button
                  onClick={() => setShowAllCharacterSheets(false)}
                  className="text-slate-400 hover:text-slate-200 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {partyCharacters.map((character) => (
                  <div key={character.id} className="bg-slate-700/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-100">{character.name}</h3>
                      <span className="text-sm text-slate-400">{getUsername(character.userId)}</span>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-slate-400">Race:</span> <span className="text-slate-200">{character.race}</span></div>
                        <div><span className="text-slate-400">Class:</span> <span className="text-slate-200">{character.class}</span></div>
                        <div><span className="text-slate-400">Level:</span> <span className="text-slate-200">{character.level}</span></div>
                        <div><span className="text-slate-400">Background:</span> <span className="text-slate-200">{character.background}</span></div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span className="text-slate-400">STR:</span> <span className="text-slate-200">{character.strength}</span></div>
                        <div><span className="text-slate-400">DEX:</span> <span className="text-slate-200">{character.dexterity}</span></div>
                        <div><span className="text-slate-400">CON:</span> <span className="text-slate-200">{character.constitution}</span></div>
                        <div><span className="text-slate-400">INT:</span> <span className="text-slate-200">{character.intelligence}</span></div>
                        <div><span className="text-slate-400">WIS:</span> <span className="text-slate-200">{character.wisdom}</span></div>
                        <div><span className="text-slate-400">CHA:</span> <span className="text-slate-200">{character.charisma}</span></div>
                      </div>
                      
                      <div className="flex justify-between text-xs">
                        <span><span className="text-slate-400">HP:</span> <span className="text-slate-200">{character.hp}/{character.maxHp}</span></span>
                        <span><span className="text-slate-400">AC:</span> <span className="text-slate-200">{character.ac}</span></span>
                      </div>
                      
                      {character.backstory && (
                        <div className="mt-3">
                          <div className="text-slate-400 font-medium text-xs mb-1">Backstory:</div>
                          <div className="text-slate-200 text-xs leading-relaxed line-clamp-3">
                            {character.backstory}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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
                  {/* Map Settings */}
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Map Settings</h3>
                    <div className="space-y-3">
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
                    </div>
                  </div>

                  {/* Tools */}
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Tools</h3>
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

                  {/* Tile Palette */}
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Tile Palette</h3>
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

                  {/* Actions */}
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Actions</h3>
                    <div className="space-y-2">
                      <button
                        onClick={handleClearMap}
                        className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                      >
                        🗑️ Clear Map
                      </button>
                      <button
                        onClick={handleSaveMap}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                      >
                        💾 Save Map
                      </button>
                    </div>
                  </div>
                </div>

                {/* Map Canvas */}
                <div className="lg:col-span-3">
                  <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-100">Map Canvas</h3>
                      <div className="text-sm text-slate-400">
                        {mapSize.width} × {mapSize.height} grid
                      </div>
                    </div>
                    
                    <div className="overflow-auto">
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
                                className={`w-10 h-10 border border-slate-600 flex items-center justify-center text-sm transition-colors hover:border-amber-400 relative select-none ${tileTypes[tile]?.color || 'bg-slate-700'}`}
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
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400">
                    <div className="bg-slate-700/30 rounded-lg p-3">
                      <div className="font-semibold text-slate-300 mb-1">Current Status</div>
                      <div>Tool: <span className="text-amber-300">{selectedTool === 'draw' ? '✏️ Draw' : '🗑️ Erase'}</span></div>
                      <div>Tile: <span className="text-amber-300">{tileTypes[selectedTile]?.name}</span></div>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3">
                      <div className="font-semibold text-slate-300 mb-1">Instructions</div>
                      <div>• Click or drag to place/remove</div>
                      <div>• Right-click for sub-maps</div>
                      <div>• Purple pins = sub-maps</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-4">
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
                            className={`w-12 h-12 border border-slate-600 flex items-center justify-center text-lg transition-colors hover:border-amber-400 select-none ${tileTypes[tile]?.color || 'bg-slate-700'}`}
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
      </div>
    </div>
  );
} 