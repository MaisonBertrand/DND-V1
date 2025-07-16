import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { manualCampaignService } from '../services/manualCampaign';

const MapContext = createContext();

export const useMap = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMap must be used within a MapProvider');
  }
  return context;
};

export const MapProvider = ({ children }) => {
  const { partyId } = useParams();
  
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

  // Memoized tile types to prevent recreation on every render
  const tileTypes = useMemo(() => manualCampaignService.getTileTypes(), []);

  // Initialize map
  const initializeMap = useCallback(() => {
    const newMap = [];
    for (let y = 0; y < mapSize.height; y++) {
      const row = [];
      for (let x = 0; x < mapSize.width; x++) {
        row.push('empty');
      }
      newMap.push(row);
    }
    return newMap;
  }, [mapSize]);

  // Initialize sub-map
  const initializeSubMap = useCallback(() => {
    const subMap = [];
    for (let y = 0; y < 8; y++) {
      const row = [];
      for (let x = 0; x < 8; x++) {
        row.push('empty');
      }
      subMap.push(row);
    }
    return subMap;
  }, []);

  // Load map from localStorage
  const handleLoadMap = useCallback(() => {
    if (!partyId) return;
    
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
  }, [partyId, initializeMap]);

  // Save map to localStorage
  const handleSaveMap = useCallback(() => {
    if (!partyId) return;
    
    localStorage.setItem(`campaign-map-${partyId}`, JSON.stringify({
      title: mapTitle,
      content: campaignMap,
      size: mapSize,
      subMaps: subMaps,
      updatedAt: new Date().toISOString()
    }));
    setShowMapEditor(false);
  }, [partyId, mapTitle, campaignMap, mapSize, subMaps]);

  // Tile click handler
  const handleTileClick = useCallback((x, y) => {
    if (selectedTool === 'draw') {
      const newMap = [...campaignMap];
      newMap[y][x] = selectedTile;
      setCampaignMap(newMap);
    } else if (selectedTool === 'erase') {
      const newMap = [...campaignMap];
      newMap[y][x] = 'empty';
      setCampaignMap(newMap);
    }
  }, [campaignMap, selectedTool, selectedTile]);

  // Mouse event handlers
  const handleTileMouseDown = useCallback((x, y) => {
    setIsDragging(true);
    setDragStart({ x, y });
    handleTileClick(x, y);
  }, [handleTileClick]);

  const handleTileMouseEnter = useCallback((x, y) => {
    if (isDragging) {
      handleTileClick(x, y);
    }
  }, [isDragging, handleTileClick]);

  const handleTileMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Clear map
  const handleClearMap = useCallback(() => {
    setCampaignMap(initializeMap());
  }, [initializeMap]);

  // Resize map
  const handleResizeMap = useCallback(() => {
    const newMap = initializeMap();
    // Copy existing map data to new map
    for (let y = 0; y < Math.min(campaignMap.length, newMap.length); y++) {
      for (let x = 0; x < Math.min(campaignMap[y].length, newMap[y].length); x++) {
        newMap[y][x] = campaignMap[y][x];
      }
    }
    setCampaignMap(newMap);
  }, [campaignMap, initializeMap]);

  // Right-click handler for sub-maps
  const handleTileRightClick = useCallback((x, y, e) => {
    e.preventDefault();
    const subMapKey = `${x}-${y}`;
    if (subMaps[subMapKey]) {
      setCurrentSubMap([...subMaps[subMapKey]]);
    } else {
      setCurrentSubMap(initializeSubMap());
    }
    setSelectedSubMapTile({ x, y });
    setShowSubMapEditor(true);
  }, [subMaps, initializeSubMap]);

  // Sub-map tile handlers
  const handleSubMapTileClick = useCallback((x, y) => {
    if (selectedTool === 'draw') {
      const newSubMap = [...currentSubMap];
      newSubMap[y][x] = selectedTile;
      setCurrentSubMap(newSubMap);
    } else if (selectedTool === 'erase') {
      const newSubMap = [...currentSubMap];
      newSubMap[y][x] = 'empty';
      setCurrentSubMap(newSubMap);
    }
  }, [currentSubMap, selectedTool, selectedTile]);

  const handleSubMapTileMouseDown = useCallback((x, y) => {
    setIsDragging(true);
    handleSubMapTileClick(x, y);
  }, [handleSubMapTileClick]);

  const handleSubMapTileMouseEnter = useCallback((x, y) => {
    if (isDragging) {
      handleSubMapTileClick(x, y);
    }
  }, [isDragging, handleSubMapTileClick]);

  // Save sub-map
  const handleSaveSubMap = useCallback(() => {
    const subMapKey = `${selectedSubMapTile.x}-${selectedSubMapTile.y}`;
    setSubMaps(prev => ({
      ...prev,
      [subMapKey]: currentSubMap
    }));
    setShowSubMapEditor(false);
  }, [selectedSubMapTile, currentSubMap]);

  // Clear sub-map
  const handleClearSubMap = useCallback(() => {
    setCurrentSubMap(initializeSubMap());
  }, [initializeSubMap]);

  // Check if tile has sub-map
  const getTileHasSubMap = useCallback((x, y) => {
    const subMapKey = `${x}-${y}`;
    return subMaps[subMapKey] && subMaps[subMapKey].some(row => row.some(tile => tile !== 'empty'));
  }, [subMaps]);

  // Global mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // Load map on mount
  useEffect(() => {
    handleLoadMap();
  }, [handleLoadMap]);

  // Memoized context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    // State
    showMapEditor,
    campaignMap,
    mapTitle,
    mapSize,
    selectedTile,
    selectedTool,
    showSubMapEditor,
    selectedSubMapTile,
    subMaps,
    currentSubMap,
    tileTypes,
    isDragging,
    
    // Actions
    setShowMapEditor,
    setMapTitle,
    setMapSize,
    setSelectedTile,
    setSelectedTool,
    setShowSubMapEditor,
    setSelectedSubMapTile,
    setCurrentSubMap,
    setCampaignMap,
    setSubMaps,
    
    // Functions
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
    getTileHasSubMap
  }), [
    showMapEditor,
    campaignMap,
    mapTitle,
    mapSize,
    selectedTile,
    selectedTool,
    showSubMapEditor,
    selectedSubMapTile,
    subMaps,
    currentSubMap,
    tileTypes,
    isDragging,
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
    getTileHasSubMap
  ]);

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
}; 