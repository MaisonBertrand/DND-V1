import React, { memo } from 'react';

const PartyMemberCard = memo(({ 
  memberId, 
  character, 
  isCurrentUser, 
  getUsername, 
  getCharacterStatus, 
  getStatusColor, 
  getStatusIcon, 
  onViewCharacterSheet 
}) => {
  const status = getCharacterStatus(character);

  return (
    <div className={`fantasy-card ${isCurrentUser ? 'ring-2 ring-amber-500/50' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center mr-3">
            <span className="text-slate-300 font-semibold">
              {getUsername(memberId).charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">{getUsername(memberId)}</h3>
          </div>
        </div>
        <div className={`text-sm font-medium ${getStatusColor(status)}`}>
          {getStatusIcon(status)} {status}
        </div>
      </div>
      
      {character && (
        <div className="space-y-2">
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-slate-100">{character.name}</h4>
              <button
                onClick={() => onViewCharacterSheet(character)}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
              >
                Manage
              </button>
            </div>
            <p className="text-sm text-slate-400">
              {character.race} {character.class} • Level {character.level}
            </p>
            {character.background && (
              <p className="text-xs text-slate-500 mt-1">{character.background}</p>
            )}
            {character.alignment && (
              <p className="text-xs text-slate-500">{character.alignment}</p>
            )}
            {(character.age || character.height || character.weight) && (
              <div className="mt-2 pt-2 border-t border-slate-600/30">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {character.age && (
                    <div>
                      <span className="text-slate-400">Age:</span>
                      <div className="text-slate-200">{character.age}</div>
                    </div>
                  )}
                  {character.height && (
                    <div>
                      <span className="text-slate-400">Height:</span>
                      <div className="text-slate-200">{character.height}</div>
                    </div>
                  )}
                  {character.weight && (
                    <div>
                      <span className="text-slate-400">Weight:</span>
                      <div className="text-slate-200">{character.weight}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {(character.eyes || character.skin || character.hair) && (
              <div className="mt-2 pt-2 border-t border-slate-600/30">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {character.eyes && (
                    <div>
                      <span className="text-slate-400">Eyes:</span>
                      <div className="text-slate-200">{character.eyes}</div>
                    </div>
                  )}
                  {character.skin && (
                    <div>
                      <span className="text-slate-400">Skin:</span>
                      <div className="text-slate-200">{character.skin}</div>
                    </div>
                  )}
                  {character.hair && (
                    <div>
                      <span className="text-slate-400">Hair:</span>
                      <div className="text-slate-200">{character.hair}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {(character.personality || character.ideals || character.bonds || character.flaws) && (
              <div className="mt-2 pt-2 border-t border-slate-600/30">
                <div className="space-y-1 text-xs">
                  {character.personality && (
                    <div>
                      <span className="text-slate-400 font-medium">Personality:</span>
                      <div className="text-slate-200 text-xs mt-1 line-clamp-2">{character.personality}</div>
                    </div>
                  )}
                  {character.ideals && (
                    <div>
                      <span className="text-slate-400 font-medium">Ideals:</span>
                      <div className="text-slate-200 text-xs mt-1 line-clamp-2">{character.ideals}</div>
                    </div>
                  )}
                  {character.bonds && (
                    <div>
                      <span className="text-slate-400 font-medium">Bonds:</span>
                      <div className="text-slate-200 text-xs mt-1 line-clamp-2">{character.bonds}</div>
                    </div>
                  )}
                  {character.flaws && (
                    <div>
                      <span className="text-slate-400 font-medium">Flaws:</span>
                      <div className="text-slate-200 text-xs mt-1 line-clamp-2">{character.flaws}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

PartyMemberCard.displayName = 'PartyMemberCard';

export default PartyMemberCard; 