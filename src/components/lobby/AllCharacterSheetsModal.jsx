import React from 'react';

export default function AllCharacterSheetsModal({ partyCharacters, getUsername, onClose }) {
  if (!partyCharacters || partyCharacters.length === 0) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="fantasy-card max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-100">All Party Character Sheets</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl"
          >
            ×
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {partyCharacters.map((character) => (
            <div key={character.id} className="bg-slate-700/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-100">{character.name}</h3>
                <span className="text-sm text-slate-400">{getUsername(character.userId)}</span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-slate-400">Race:</span> <span className="text-slate-200">{character.race}</span></div>
                  <div><span className="text-slate-400">Class:</span> <span className="text-slate-200">{character.class}</span></div>
                  <div><span className="text-slate-400">Level:</span> <span className="text-slate-200">{character.level}</span></div>
                  <div><span className="text-slate-400">Background:</span> <span className="text-slate-200">{character.background}</span></div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-slate-400">STR:</span> <span className="text-slate-200">{character.strength}</span></div>
                  <div><span className="text-slate-400">DEX:</span> <span className="text-slate-200">{character.dexterity}</span></div>
                  <div><span className="text-slate-400">CON:</span> <span className="text-slate-200">{character.constitution}</span></div>
                  <div><span className="text-slate-400">INT:</span> <span className="text-slate-200">{character.intelligence}</span></div>
                  <div><span className="text-slate-400">WIS:</span> <span className="text-slate-200">{character.wisdom}</span></div>
                  <div><span className="text-slate-400">CHA:</span> <span className="text-slate-200">{character.charisma}</span></div>
                </div>
                <div className="flex justify-between text-xs">
                  <span><span className="text-slate-400">HP:</span> <span className="text-slate-200">{character.hp}/{character.maxHp}</span></span>
                  <span><span className="text-slate-400">AC:</span> <span className="text-slate-200">{character.ac}</span></span>
                </div>
                {character.backstory && (
                  <div className="mt-3">
                    <div className="text-slate-400 font-medium text-xs mb-1">Backstory:</div>
                    <div className="text-slate-200 text-xs leading-relaxed line-clamp-3">
                      {character.backstory}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 