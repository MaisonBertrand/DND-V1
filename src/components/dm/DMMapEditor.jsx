import React, { useState, useEffect } from 'react';
import { manualCampaignService } from '../../services/manualCampaign';
import { dmToolsService } from '../../services/dmTools';

export default function DMMapEditor({ partyId, onMapUpdate }) {
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
  const [playerPositions, setPlayerPositions] = useState({});

  useEffect(() => {
    loadMap();
  }, [partyId]);

  const loadMap = async () => {
    try {
      const mapData = await manualCampaignService.loadMapFromDatabase(partyId);
      setMapTitle(mapData.title);
      setCampaignMap(mapData.content);
      setSubMaps(mapData.subMaps);
      setMapSize(mapData.size);
    } catch (error) {
      console.error('Error loading map:', error);
      // Fallback to default map
      const defaultMapData = manualCampaignService.loadMap(partyId);
      setMapTitle(defaultMapData.title);
      setCampaignMap(defaultMapData.content);
      setSubMaps(defaultMapData.subMaps);
      setMapSize(defaultMapData.size);
    }
  };

  const tileTypes = manualCampaignService.getTileTypes();

  const initializeMap = () => {
    return manualCampaignService.initializeMap(mapSize);
  };

  const handleSaveMap = () => {
    manualCampaignService.saveMap(partyId, {
      title: mapTitle,
      content: campaignMap,
      size: mapSize,
      subMaps: subMaps
    });
    
    // Notify parent component of map update
    if (onMapUpdate) {
      onMapUpdate({
        title: mapTitle,
        content: campaignMap,
        size: mapSize,
        subMaps: subMaps
      });
    }
  };

  const handleTileClick = async (x, y) => {
    let newMap;
    if (selectedTool === 'draw') {
      newMap = manualCampaignService.updateMapTile(campaignMap, x, y, selectedTile);
    } else if (selectedTool === 'erase') {
      newMap = manualCampaignService.updateMapTile(campaignMap, x, y, 'empty');
    } else if (selectedTool === 'player') {
      // Add player marker
      setPlayerPositions(prev => ({
        ...prev,
        [`player_${Date.now()}`]: { x, y, name: 'Player' }
      }));
      return; // Don't save for player markers yet
    }

    // Update local state
    setCampaignMap(newMap);

    // Save to database and notify other players
    try {
      await manualCampaignService.saveMapToDatabase(partyId, {
        title: mapTitle,
        content: newMap,
        size: mapSize,
        subMaps: subMaps
      });
      
      // Notify parent component of map update
      if (onMapUpdate) {
        onMapUpdate({
          title: mapTitle,
          content: newMap,
          size: mapSize,
          subMaps: subMaps
        });
      }
    } catch (error) {
      console.error('Error saving map:', error);
    }
  };

  const handleTileMouseDown = (x, y) => {
    setIsDragging(true);
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
    setSelectedSubMapTile({ x, y });
    setCurrentSubMap(subMaps[`${x}-${y}`] || manualCampaignService.initializeSubMap());
    setShowSubMapEditor(true);
  };

  const initializeSubMap = () => {
    return manualCampaignService.initializeSubMap();
  };

  const handleSubMapTileClick = (x, y) => {
    if (selectedTool === 'draw') {
      setCurrentSubMap(manualCampaignService.updateSubMapTile(currentSubMap, x, y, selectedTile));
    } else if (selectedTool === 'erase') {
      setCurrentSubMap(manualCampaignService.updateSubMapTile(currentSubMap, x, y, 'empty'));
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
    setSubMaps(manualCampaignService.saveSubMap(subMaps, selectedSubMapTile.x, selectedSubMapTile.y, currentSubMap));
    setShowSubMapEditor(false);
  };

  const handleClearSubMap = () => {
    setCurrentSubMap(initializeSubMap());
  };

  const getTileHasSubMap = (x, y) => {
    return manualCampaignService.getTileHasSubMap(subMaps, x, y);
  };

  const removePlayerPosition = (playerId) => {
    setPlayerPositions(prev => {
      const newPositions = { ...prev };
      delete newPositions[playerId];
      return newPositions;
    });
  };

  return (
    <div className="fantasy-card">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-slate-100">🗺️ Campaign Map</h3>
        <p className="text-sm text-slate-400 mt-1">Click and drag to edit the map. Changes are saved automatically.</p>
      </div>



      {/* Tool Selection */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            onClick={() => setSelectedTool('draw')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              selectedTool === 'draw' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            ✏️ Draw
          </button>
          <button
            onClick={() => setSelectedTool('erase')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              selectedTool === 'erase' 
                ? 'bg-red-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            🧽 Erase
          </button>
          <button
            onClick={() => setSelectedTool('player')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              selectedTool === 'player' 
                ? 'bg-purple-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            👤 Player
          </button>
        </div>
      </div>

      {/* Tile Palette */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">Tile Types:</h4>
        <div className="grid grid-cols-6 gap-1 max-h-32 overflow-y-auto">
          {Object.entries(tileTypes).map(([key, tile]) => (
            <button
              key={key}
              onClick={() => setSelectedTile(key)}
              className={`p-2 rounded text-xs transition-colors ${
                selectedTile === key 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              title={tile.name}
            >
              <div className="text-lg">{tile.symbol}</div>
              <div className="text-xs">{tile.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Map Display */}
      <div className="mb-4">
        <div className="bg-slate-900 p-4 rounded-lg overflow-auto">
          <div 
            className="grid gap-0"
            style={{
              gridTemplateColumns: `repeat(${mapSize.width}, 1fr)`,
              width: 'fit-content'
            }}
          >
            {campaignMap.map((row, y) =>
              row.map((tile, x) => {
                const tileData = tileTypes[tile] || tileTypes.empty;
                const hasSubMap = getTileHasSubMap(x, y);
                const playerAtPosition = Object.values(playerPositions).find(
                  pos => pos.x === x && pos.y === y
                );

                return (
                  <div
                    key={`${x}-${y}`}
                    className={`w-8 h-8 border border-slate-600 cursor-pointer transition-colors relative ${
                      tileData.color
                    }`}
                    onClick={() => handleTileClick(x, y)}
                    onMouseDown={() => handleTileMouseDown(x, y)}
                    onMouseEnter={() => handleTileMouseEnter(x, y)}
                    onMouseUp={handleTileMouseUp}
                    onContextMenu={(e) => handleTileRightClick(x, y, e)}
                    title={`${tileData.name} at (${x}, ${y})`}
                  >
                    <div className="flex items-center justify-center w-full h-full text-xs">
                      {playerAtPosition ? (
                        <span className="text-blue-400 font-bold">👤</span>
                      ) : (
                        tileData.symbol
                      )}
                    </div>
                    {hasSubMap && (
                      <div className="absolute top-0 right-0 w-2 h-2 bg-purple-500 rounded-full"></div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Player Positions */}
      {Object.keys(playerPositions).length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">Player Positions:</h4>
          <div className="space-y-1">
            {Object.entries(playerPositions).map(([id, pos]) => (
              <div key={id} className="flex items-center justify-between bg-slate-700 p-2 rounded">
                <span className="text-sm text-slate-300">
                  {pos.name} at ({pos.x}, {pos.y})
                </span>
                <button
                  onClick={() => removePlayerPosition(id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Map Editor Modal */}
      {showSubMapEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-100">
                Sub-Map Editor - Tile ({selectedSubMapTile.x}, {selectedSubMapTile.y})
              </h3>
              <button
                onClick={() => setShowSubMapEditor(false)}
                className="text-slate-400 hover:text-slate-300"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-slate-900 p-4 rounded-lg overflow-auto mb-4">
              <div className="grid grid-cols-8 gap-0 w-fit">
                {currentSubMap.map((row, y) =>
                  row.map((tile, x) => {
                    const tileData = tileTypes[tile] || tileTypes.empty;
                    return (
                      <div
                        key={`sub-${x}-${y}`}
                        className={`w-6 h-6 border border-slate-600 cursor-pointer transition-colors ${
                          tileData.color
                        }`}
                        onClick={() => handleSubMapTileClick(x, y)}
                        onMouseDown={() => handleSubMapTileMouseDown(x, y)}
                        onMouseEnter={() => handleSubMapTileMouseEnter(x, y)}
                        onMouseUp={handleTileMouseUp}
                        title={`${tileData.name} at (${x}, ${y})`}
                      >
                        <div className="flex items-center justify-center w-full h-full text-xs">
                          {tileData.symbol}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleSaveSubMap}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
              >
                Save Sub-Map
              </button>
              <button
                onClick={handleClearSubMap}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
              >
                Clear Sub-Map
              </button>
              <button
                onClick={() => setShowSubMapEditor(false)}
                className="bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 