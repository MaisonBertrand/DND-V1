import React from 'react';

export default function MapEditorModal({
  show,
  mapTitle,
  setMapTitle,
  mapSize,
  setMapSize,
  selectedTool,
  setSelectedTool,
  selectedTile,
  setSelectedTile,
  tileTypes,
  campaignMap,
  handleTileMouseDown,
  handleTileMouseEnter,
  handleTileMouseUp,
  handleTileRightClick,
  getTileHasSubMap,
  handleClearMap,
  handleSaveMap,
  handleResizeMap,
  onClose
}) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="fantasy-card max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-100">Grid-Based Map Editor</h2>
          <button
            onClick={onClose}
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
  );
} 