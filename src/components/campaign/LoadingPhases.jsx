import React from 'react';

export default function LoadingPhases({ story }) {
  return (
    <>
      {/* Story Generation Loading */}
      {story?.status === 'generating' && (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-8 max-w-4xl mx-auto mb-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-200 mb-4">Generating Your Adventure</h2>
            <p className="text-slate-300 text-lg mb-8">The Dungeon Master is crafting your story. This may take a moment...</p>
            
            <div className="flex justify-center items-center space-x-4 mb-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-400"></div>
              <div className="text-slate-300 font-semibold text-lg">Creating Story Plots...</div>
            </div>
          </div>
        </div>
      )}

      {/* Story Content Generation Loading */}
      {story?.status === 'generating_story' && (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-8 max-w-4xl mx-auto mb-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-200 mb-4">Crafting Your Story</h2>
            <p className="text-slate-300 text-lg mb-8">The Dungeon Master is weaving the tale of your adventure...</p>
            
            <div className="flex justify-center items-center space-x-4 mb-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-400"></div>
              <div className="text-slate-300 font-semibold text-lg">Generating Story Content...</div>
            </div>
            
            {story?.selectedPlotData && (
              <div className="bg-slate-900/50 rounded-lg p-4 max-w-2xl mx-auto">
                <h3 className="text-slate-200 font-semibold mb-2">Selected Plot: {story.selectedPlotData.title}</h3>
                <p className="text-slate-300 text-sm">{story.selectedPlotData.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
} 