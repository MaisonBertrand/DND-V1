import React from 'react';

export default function SubMapEditorModal({
  show,
  selectedSubMapTile,
  currentSubMap,
  setCurrentSubMap,
  selectedTool,
  setSelectedTool,
  selectedTile,
  setSelectedTile,
  tileTypes,
  handleSubMapTileMouseDown,
  handleSubMapTileMouseEnter,
  handleTileMouseUp,
  handleSaveSubMap,
  handleClearSubMap,
  onClose
}) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="fantasy-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-100">
            Sub-Map Editor - Tile ({selectedSubMapTile.x}, {selectedSubMapTile.y})
          </h2>
          <button
            onClick={onClose}
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
                onClick={onClose}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 