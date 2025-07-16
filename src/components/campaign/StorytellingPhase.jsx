import React from 'react';

export default function StorytellingPhase({ 
  story, 
  party, 
  user, 
  partyCharacters, 
  showDebug, 
  setShowDebug, 
  playerResponse, 
  setPlayerResponse, 
  loading, 
  onSendResponse, 
  onSetSpeaker,
  highlightKeywords 
}) {
  const getSortedCharacters = () => {
    return partyCharacters.sort((a, b) => a.name.localeCompare(b.name));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar: Party Members, Campaign Progress, Objectives */}
      <div className="lg:col-span-1">
        <div className="flex flex-col gap-y-6 lg:sticky lg:top-6">
          {/* Party Members */}
          <div className="hidden lg:block bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-200">Party Members</h3>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs bg-slate-600 hover:bg-slate-500 px-2 py-1 rounded text-slate-200"
              >
                {showDebug ? 'Hide Debug' : 'Show Debug'}
              </button>
            </div>
            {showDebug && (
              <div className="mb-2 p-2 bg-slate-700/50 rounded text-xs">
                <p className="text-slate-300">Debug: Characters loaded: {partyCharacters.length}</p>
                <p className="text-slate-300">Debug: Current Speaker: {JSON.stringify(story?.currentSpeaker)}</p>
                <p className="text-slate-300">Debug: User UID: {user?.uid}</p>
                <p className="text-slate-300">Debug: Party DM ID: {party?.dmId}</p>
                <p className="text-slate-300">Debug: Is DM speaking: {story?.currentSpeaker?.id === 'dm' ? 'Yes' : 'No'}</p>
                <p className="text-slate-300">Debug: Is user DM: {user?.uid === party?.dmId ? 'Yes' : 'No'}</p>
              </div>
            )}
            <div className="space-y-2">
              {getSortedCharacters().map((character) => {
                const isCurrentSpeaker = story?.currentSpeaker?.userId === character.userId;
                const isCurrentUser = user?.uid === character.userId;
                
                // Allow selection if the current user is the current speaker OR if DM is speaking and user is DM OR if no speaker and user is DM
                const canBeSelected = (
                  (story?.currentSpeaker?.userId === user?.uid) || 
                  (story?.currentSpeaker?.id === 'dm' && user?.uid === party?.dmId) ||
                  (!story?.currentSpeaker && user?.uid === party?.dmId)
                );
                return (
                  <div 
                    key={character.id}
                    className={`p-2 rounded transition-colors ${
                      isCurrentSpeaker
                        ? 'bg-blue-600/30 border border-blue-500' 
                        : canBeSelected
                          ? 'bg-slate-700/50 hover:bg-slate-600/50 cursor-pointer'
                          : 'bg-slate-700/30 opacity-60 cursor-not-allowed'
                    }`}
                    onClick={canBeSelected ? () => onSetSpeaker(character) : undefined}
                  >
                    <div className="font-semibold text-slate-200 text-xs">{character.name}</div>
                    <div className="text-slate-400 text-xs">{character.race} {character.class}</div>
                    {isCurrentSpeaker && (
                      <div className="text-blue-400 text-xs mt-1">Currently Speaking</div>
                    )}
                    {!canBeSelected && !isCurrentSpeaker && (
                      <div className="text-slate-500 text-xs mt-1">Waiting for turn...</div>
                    )}
                    {canBeSelected && !isCurrentSpeaker && (
                      <div className="text-green-400 text-xs mt-1">Click to select</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Objectives */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-4">
            <h3 className="font-bold text-slate-200 mb-3">🎯 Campaign Objectives</h3>
            <div className="space-y-2">
              <div className="text-slate-300 text-sm">
                <span className="text-yellow-400">●</span> Main Quest: Complete the adventure
              </div>
              <div className="text-slate-300 text-sm">
                <span className="text-green-400">●</span> Survive encounters
              </div>
              <div className="text-slate-300 text-sm">
                <span className="text-blue-400">●</span> Work together as a team
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Story Content */}
      <div className="lg:col-span-3">
        {/* Current Story Content */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <h3 className="font-bold text-slate-200 mb-2">
              {story?.currentSpeaker?.name || 'Narrator'}
            </h3>
            <div className="text-slate-400 text-sm">
              {story?.currentSpeaker?.race} {story?.currentSpeaker?.class}
            </div>
          </div>
          
          <div 
            className="text-slate-300 leading-7 text-lg"
            dangerouslySetInnerHTML={{ __html: highlightKeywords(story?.currentContent || 'The story begins...') }}
          />
        </div>

        {/* Player Response Input */}
        {((story?.currentSpeaker?.userId === user?.uid) || 
          (story?.currentSpeaker?.id === 'dm' && user?.uid === party?.dmId) ||
          (!story?.currentSpeaker && user?.uid === party?.dmId)) && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-6 mb-6">
            <h3 className="font-bold text-slate-200 mb-4">Dungeon Master Response</h3>
            
            <div className="space-y-4">
              <textarea
                value={playerResponse}
                onChange={(e) => setPlayerResponse(e.target.value)}
                placeholder="Continue the story or describe what happens next..."
                className="w-full bg-slate-800/50 border border-slate-600 text-slate-100 px-4 py-3 rounded-lg focus:border-slate-500 focus:outline-none transition-colors min-h-[120px] resize-none"
                rows={4}
              />
              <div className="flex space-x-3">
                <button
                  onClick={onSendResponse}
                  disabled={!playerResponse.trim() || loading}
                  className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Continue Story'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Party Members Selection - Mobile Side by Side */}
        <div className="lg:hidden bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-slate-200 mb-3">Party Members</h3>
          <div className="grid grid-cols-2 gap-2">
            {getSortedCharacters().map((character) => {
              const isCurrentSpeaker = story?.currentSpeaker?.userId === character.userId;
              const isCurrentUser = user?.uid === character.userId;
              // Allow selection if the current user is the current speaker OR if DM is speaking and user is DM OR if no speaker and user is DM
              const canBeSelected = (
                (story?.currentSpeaker?.userId === user?.uid) || 
                (story?.currentSpeaker?.id === 'dm' && user?.uid === party?.dmId) ||
                (!story?.currentSpeaker && user?.uid === party?.dmId)
              );
              return (
                <div 
                  key={character.id}
                  className={`p-2 rounded transition-colors ${
                    isCurrentSpeaker
                      ? 'bg-blue-600/30 border border-blue-500' 
                      : canBeSelected
                        ? 'bg-slate-700/50 hover:bg-slate-600/50 cursor-pointer'
                        : 'bg-slate-700/30 opacity-60 cursor-not-allowed'
                  }`}
                  onClick={canBeSelected ? () => onSetSpeaker(character) : undefined}
                >
                  <div className="font-semibold text-slate-200 text-xs">{character.name}</div>
                  <div className="text-slate-400 text-xs">{character.race} {character.class}</div>
                  {isCurrentSpeaker && (
                    <div className="text-blue-400 text-xs mt-1">Currently Speaking</div>
                  )}
                  {!canBeSelected && !isCurrentSpeaker && (
                    <div className="text-slate-500 text-xs mt-1">Waiting for turn...</div>
                  )}
                  {canBeSelected && !isCurrentSpeaker && (
                    <div className="text-green-400 text-xs mt-1">Click to select</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Story Messages History */}
        {story?.storyMessages && story.storyMessages.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-6 mt-8 shadow-lg">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-100 mb-2 border-b border-slate-600 pb-3">
                📜 Story History
              </h3>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {story.storyMessages.map((message, index) => (
                <div key={index} className="border-l-4 border-slate-500 pl-4 py-2 bg-slate-800/30 rounded-r-lg">
                  <div className="text-slate-300 text-sm font-semibold mb-2 flex items-center">
                    <span className="mr-2">👤</span>
                    {message.speaker || 'Narrator'}
                  </div>
                  <div 
                    className="text-slate-400 text-sm leading-6 pl-6 border-l border-slate-600"
                    dangerouslySetInnerHTML={{ __html: highlightKeywords(message.content) }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 