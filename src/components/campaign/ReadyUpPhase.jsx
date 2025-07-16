import React from 'react';

export default function ReadyUpPhase({ 
  story, 
  party, 
  user, 
  partyCharacters, 
  partyMembers, 
  isReady, 
  allPlayersReady, 
  loading, 
  isGeneratingPlots,
  onReadyUp, 
  onStartStory, 
  navigate, 
  partyId 
}) {
  const getReadyCount = () => story?.readyPlayers?.length || 0;
  const getTotalPlayers = () => partyMembers.length;

  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-8 max-w-4xl mx-auto mb-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-200 mb-3">Campaign Lobby</h2>
        <p className="text-slate-300 text-lg">Waiting for all players to ready up</p>
        
        <div className="mt-8 mb-8">
          <div className="flex justify-center items-center space-x-4 mb-4">
            <div className="text-2xl font-semibold text-slate-300">
              {getReadyCount()}/{getTotalPlayers()} Players Ready
            </div>
            <div className="text-lg text-slate-400">
              ({Math.round((getReadyCount() / getTotalPlayers()) * 100)}%)
            </div>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-4 max-w-lg mx-auto">
            <div 
              className="bg-gradient-to-r from-green-500 to-green-400 h-4 rounded-full transition-all duration-500"
              style={{ width: `${(getReadyCount() / getTotalPlayers()) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="text-center">
        {!isReady ? (
          <div className="space-y-4">
            {!partyCharacters.find(char => char.userId === user?.uid) ? (
              <div className="space-y-4">
                <p className="text-slate-300">You need to create a character first</p>
                <button
                  onClick={() => navigate(`/character-creation/${partyId}`)}
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Create Character
                </button>
              </div>
            ) : (
              <button
                onClick={onReadyUp}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Ready Up
              </button>
            )}
          </div>
        ) : (
          <div className="text-green-400 font-semibold text-xl bg-green-900/30 px-6 py-3 rounded-xl">You are ready!</div>
        )}
        
        {/* Only show Start Story button to DM when all players are ready */}
        {allPlayersReady && party?.dmId === user?.uid && (
          <div className="mt-6">
            <button
              onClick={onStartStory}
              disabled={loading || isGeneratingPlots}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || isGeneratingPlots ? 'Generating Story...' : 'Start Story Generation'}
            </button>
          </div>
        )}
        
        {/* Show waiting message to non-DM players when all are ready */}
        {allPlayersReady && party?.dmId !== user?.uid && (
          <div className="mt-6">
            <div className="text-blue-400 font-semibold text-lg bg-blue-900/30 px-6 py-3 rounded-xl">
              Waiting for Dungeon Master to start the story...
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 