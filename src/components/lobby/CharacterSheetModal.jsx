import React from 'react';

export default function CharacterSheetModal({ character, onClose }) {
  if (!character) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="fantasy-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-100">
            Character Sheet: {character.name}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl"
          >
            ×
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="bg-slate-700/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-100 mb-3">Basic Information</h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-slate-400">Name:</span> <span className="text-slate-200">{character.name}</span></div>
                <div><span className="text-slate-400">Race:</span> <span className="text-slate-200">{character.race}</span></div>
                <div><span className="text-slate-400">Class:</span> <span className="text-slate-200">{character.class}</span></div>
                <div><span className="text-slate-400">Level:</span> <span className="text-slate-200">{character.level}</span></div>
                <div><span className="text-slate-400">Background:</span> <span className="text-slate-200">{character.background}</span></div>
                <div><span className="text-slate-400">Alignment:</span> <span className="text-slate-200">{character.alignment}</span></div>
              </div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-100 mb-3">Ability Scores</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-400">Strength:</span> <span className="text-slate-200">{character.strength}</span></div>
                <div><span className="text-slate-400">Dexterity:</span> <span className="text-slate-200">{character.dexterity}</span></div>
                <div><span className="text-slate-400">Constitution:</span> <span className="text-slate-200">{character.constitution}</span></div>
                <div><span className="text-slate-400">Intelligence:</span> <span className="text-slate-200">{character.intelligence}</span></div>
                <div><span className="text-slate-400">Wisdom:</span> <span className="text-slate-200">{character.wisdom}</span></div>
                <div><span className="text-slate-400">Charisma:</span> <span className="text-slate-200">{character.charisma}</span></div>
              </div>
            </div>
            {(character.age || character.height || character.weight || character.eyes || character.skin || character.hair) && (
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-100 mb-3">Physical Description</h3>
                <div className="space-y-2 text-sm">
                  {character.age && <div><span className="text-slate-400">Age:</span> <span className="text-slate-200">{character.age}</span></div>}
                  {character.height && <div><span className="text-slate-400">Height:</span> <span className="text-slate-200">{character.height}</span></div>}
                  {character.weight && <div><span className="text-slate-400">Weight:</span> <span className="text-slate-200">{character.weight}</span></div>}
                  {character.eyes && <div><span className="text-slate-400">Eyes:</span> <span className="text-slate-200">{character.eyes}</span></div>}
                  {character.skin && <div><span className="text-slate-400">Skin:</span> <span className="text-slate-200">{character.skin}</span></div>}
                  {character.hair && <div><span className="text-slate-400">Hair:</span> <span className="text-slate-200">{character.hair}</span></div>}
                </div>
              </div>
            )}
          </div>
          {/* Character Details */}
          <div className="space-y-4">
            {(character.personality || character.ideals || character.bonds || character.flaws) && (
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-100 mb-3">Character Traits</h3>
                <div className="space-y-3 text-sm">
                  {character.personality && (
                    <div>
                      <div className="text-slate-400 font-medium">Personality:</div>
                      <div className="text-slate-200">{character.personality}</div>
                    </div>
                  )}
                  {character.ideals && (
                    <div>
                      <div className="text-slate-400 font-medium">Ideals:</div>
                      <div className="text-slate-200">{character.ideals}</div>
                    </div>
                  )}
                  {character.bonds && (
                    <div>
                      <div className="text-slate-400 font-medium">Bonds:</div>
                      <div className="text-slate-200">{character.bonds}</div>
                    </div>
                  )}
                  {character.flaws && (
                    <div>
                      <div className="text-slate-400 font-medium">Flaws:</div>
                      <div className="text-slate-200">{character.flaws}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {character.backstory && (
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-100 mb-3">Backstory</h3>
                <div className="text-sm text-slate-200 leading-relaxed">
                  {character.backstory}
                </div>
              </div>
            )}
            {character.equipment && character.equipment.length > 0 && (
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-100 mb-3">Equipment</h3>
                <ul className="space-y-1 text-sm">
                  {character.equipment.map((item, index) => (
                    <li key={index} className="text-slate-200">• {item}</li>
                  ))}
                </ul>
              </div>
            )}
            {character.spells && character.spells.length > 0 && (
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-100 mb-3">Spells</h3>
                <ul className="space-y-1 text-sm">
                  {character.spells.map((spell, index) => (
                    <li key={index} className="text-slate-200">• {spell}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 