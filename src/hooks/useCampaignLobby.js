import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { 
  getPartyCharacters, 
  getPartyById,
  getUserProfiles
} from '../firebase/database';
import { manualCampaignService } from '../services/manualCampaign';

export const useCampaignLobby = () => {
  const { partyId } = useParams();
  const navigate = useNavigate();
  
  // Core state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [party, setParty] = useState(null);
  const [partyCharacters, setPartyCharacters] = useState([]);
  const [partyMemberProfiles, setPartyMemberProfiles] = useState({});
  const [userCharacter, setUserCharacter] = useState(null);
  const [isDM, setIsDM] = useState(false);
  
  // Character sheet state
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [showAllCharacterSheets, setShowAllCharacterSheets] = useState(false);
  
  // Map editor state
  const [showMapEditor, setShowMapEditor] = useState(false);
  const [campaignMap, setCampaignMap] = useState([]);
  const [mapTitle, setMapTitle] = useState('Campaign Map');
  const [mapSize, setMapSize] = useState({ width: 15, height: 10 });
  const [selectedTile, setSelectedTile] = useState('grass');
  const [selectedTool, setSelectedTool] = useState('draw');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Sub-map editor state
  const [showSubMapEditor, setShowSubMapEditor] = useState(false);
  const [selectedSubMapTile, setSelectedSubMapTile] = useState({ x: 0, y: 0 });
  const [subMaps, setSubMaps] = useState({});
  const [currentSubMap, setCurrentSubMap] = useState(null);

  // Get tile types from service
  const tileTypes = manualCampaignService.getTileTypes();

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

  // Map editor functions
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

  const handleSaveMap = () => {
    localStorage.setItem(`campaign-map-${partyId}`, JSON.stringify({
      title: mapTitle,
      content: campaignMap,
      size: mapSize,
      subMaps: subMaps,
      updatedAt: new Date().toISOString()
    }));
    setShowMapEditor(false);
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
    // Copy existing map data to new map
    for (let y = 0; y < Math.min(campaignMap.length, newMap.length); y++) {
      for (let x = 0; x < Math.min(campaignMap[y].length, newMap[y].length); x++) {
        newMap[y][x] = campaignMap[y][x];
      }
    }
    setCampaignMap(newMap);
  };

  const handleTileRightClick = (x, y, e) => {
    e.preventDefault();
    const subMapKey = `${x}-${y}`;
    if (subMaps[subMapKey]) {
      setCurrentSubMap([...subMaps[subMapKey]]);
    } else {
      setCurrentSubMap(initializeSubMap());
    }
    setSelectedSubMapTile({ x, y });
    setShowSubMapEditor(true);
  };

  const initializeSubMap = () => {
    const subMap = [];
    for (let y = 0; y < 8; y++) {
      const row = [];
      for (let x = 0; x < 8; x++) {
        row.push('empty');
      }
      subMap.push(row);
    }
    return subMap;
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
    handleSubMapTileClick(x, y);
  };

  const handleSubMapTileMouseEnter = (x, y) => {
    if (isDragging) {
      handleSubMapTileClick(x, y);
    }
  };

  const handleSaveSubMap = () => {
    const subMapKey = `${selectedSubMapTile.x}-${selectedSubMapTile.y}`;
    setSubMaps(prev => ({
      ...prev,
      [subMapKey]: currentSubMap
    }));
    setShowSubMapEditor(false);
  };

  const handleClearSubMap = () => {
    setCurrentSubMap(initializeSubMap());
  };

  const getTileHasSubMap = (x, y) => {
    const subMapKey = `${x}-${y}`;
    return subMaps[subMapKey] && subMaps[subMapKey].some(row => row.some(tile => tile !== 'empty'));
  };

  // Utility functions
  const getUsername = (userId) => {
    const profile = partyMemberProfiles[userId];
    if (profile && profile.username) {
      return profile.username;
    }
    return 'Unknown User';
  };

  const getCharacterStatus = (character) => {
    if (!character) return 'No Character';
    if (character.hp <= 0) return 'Dead';
    if (character.hp < character.maxHp * 0.5) return 'Injured';
    return 'Ready';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Ready': return 'text-green-400';
      case 'Injured': return 'text-yellow-400';
      case 'Dead': return 'text-red-400';
      case 'No Character': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Ready': return '✅';
      case 'Injured': return '⚠️';
      case 'Dead': return '💀';
      case 'No Character': return '❌';
      default: return '❓';
    }
  };

  return {
    // State
    user,
    loading,
    party,
    partyCharacters,
    partyMemberProfiles,
    userCharacter,
    isDM,
    selectedCharacter,
    showCharacterSheet,
    showAllCharacterSheets,
    showMapEditor,
    campaignMap,
    mapTitle,
    mapSize,
    selectedTile,
    selectedTool,
    isDragging,
    showSubMapEditor,
    selectedSubMapTile,
    subMaps,
    currentSubMap,
    tileTypes,
    
    // Actions
    setShowCharacterSheet,
    setShowAllCharacterSheets,
    setShowMapEditor,
    setShowSubMapEditor,
    setMapTitle,
    setMapSize,
    setSelectedTile,
    setSelectedTool,
    setSelectedCharacter,
    
    // Functions
    handleStartCampaign,
    handleCreateCharacter,
    handleViewCharacterSheet,
    handleLoadMap,
    handleSaveMap,
    handleTileClick,
    handleTileMouseDown,
    handleTileMouseEnter,
    handleTileMouseUp,
    handleClearMap,
    handleResizeMap,
    handleTileRightClick,
    handleSubMapTileClick,
    handleSubMapTileMouseDown,
    handleSubMapTileMouseEnter,
    handleSaveSubMap,
    handleClearSubMap,
    getTileHasSubMap,
    getUsername,
    getCharacterStatus,
    getStatusColor,
    getStatusIcon
  };
}; 