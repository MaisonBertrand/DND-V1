import React, { memo } from 'react';

const LobbyHeader = memo(({ party }) => {
  return (
    <div className="mb-8">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mb-4">
          Campaign Lobby
        </h1>
        <div className="w-24 h-1 bg-gradient-to-r from-amber-400 to-orange-400 mx-auto rounded-full mb-4"></div>
        <h2 className="text-2xl font-semibold text-slate-100 mb-2">{party.name}</h2>
        <p className="text-slate-400 mb-4">{party.description}</p>
        <div className="flex items-center justify-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            party.campaignType === 'ai-assist'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-slate-600/20 text-slate-300 border border-slate-500/30'
          }`}>
            {party.campaignType === 'ai-assist' ? '🤖 AI Assist' : '✍️ Manual Campaign'}
          </div>
          <div className="text-slate-400">
            {party.members?.filter(memberId => memberId !== party.dmId).length} / {party.maxPlayers} Players
          </div>
        </div>
      </div>
    </div>
  );
});

LobbyHeader.displayName = 'LobbyHeader';

export default LobbyHeader; 