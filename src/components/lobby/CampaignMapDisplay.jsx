import React, { memo } from 'react';

const CampaignMapDisplay = memo(({ 
  campaignMap, 
  mapTitle, 
  isDM, 
  tileTypes, 
  getTileHasSubMap, 
  handleTileRightClick, 
  onEditMap, 
  onViewCharacters 
}) => {
  if (!campaignMap || campaignMap.length === 0) {
    return null;
  }

  return (
    <div className="fantasy-card mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-100">{mapTitle}</h3>
        {isDM && (
          <div className="flex gap-2">
            <button
              onClick={onEditMap}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
            >
              🗺️ Edit Map
            </button>
            <button
              onClick={onViewCharacters}
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
  );
});

CampaignMapDisplay.displayName = 'CampaignMapDisplay';

export default CampaignMapDisplay; 