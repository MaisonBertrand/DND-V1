import React from 'react';

export default function VotingPhase({ 
  story, 
  party, 
  user, 
  loading, 
  showDebug, 
  setShowDebug, 
  onPlotSelection, 
  onStartStory 
}) {
  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-8 max-w-4xl mx-auto mb-6">
      <h2 className="text-3xl font-bold text-slate-200 mb-6 text-center">Choose Your Adventure</h2>
      
      {/* Debug toggle button */}
      <div className="mb-4 flex justify-center">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {showDebug ? 'Hide Debug' : 'Show Debug'}
        </button>
      </div>
      
      {/* Debug info */}
      {showDebug && (
        <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
          <p className="text-slate-300 text-sm">Debug: Available plots count: {story?.availablePlots?.length || 0}</p>
          <p className="text-slate-300 text-sm">Debug: Raw plots: {JSON.stringify(story?.availablePlots?.slice(0, 2))}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.isArray(story?.availablePlots) && story.availablePlots.length > 0 ? (
          story.availablePlots
            .map((plot, index) => (
              <div key={index} className="bg-slate-800/70 border-2 border-slate-600 rounded-xl p-6 hover:border-slate-500 transition-all duration-300">
                <h3 className="font-bold text-slate-200 text-xl mb-3">{plot.title}</h3>
                <p className="text-slate-300 mb-4">{plot.description || "Adventure description here..."}</p>
                
                {/* Campaign Length */}
                {plot.campaignLength && (
                  <div className="mb-4">
                    <span className="text-slate-400 text-sm">Length: </span>
                    <span className="text-slate-200 font-semibold capitalize">{plot.campaignLength}</span>
                  </div>
                )}
                
                {/* Only show selection button to DM */}
                {party?.dmId === user?.uid ? (
                  <button
                    onClick={() => onPlotSelection(index)}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Selecting...' : `Choose This Plot`}
                  </button>
                ) : (
                  <div className="text-center py-3">
                    <span className="text-slate-400 text-sm">Waiting for DM to choose...</span>
                  </div>
                )}
              </div>
            ))
        ) : (
          // Fallback if no plots are available
          <div className="col-span-3 text-center">
            <p className="text-slate-300">No plots available. Please try generating the story again.</p>
            {party?.dmId === user?.uid && (
              <button
                onClick={onStartStory}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Regenerate Plots
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Show waiting message to non-DM players */}
      {party?.dmId !== user?.uid && (
        <div className="text-center mt-6">
          <p className="text-slate-300 text-lg">Waiting for the Dungeon Master to select a plot...</p>
        </div>
      )}
    </div>
  );
} 