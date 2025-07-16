import React, { useState } from 'react';
import { dmCatalogsService } from '../services/dmCatalogs';
import { levelUpService } from '../services/levelUpService';
import { 
  getAbilityModifier, 
  getAbilityScoreColor, 
  getRarityColor,
  formatAbilityModifier 
} from '../utils/characterUtils';

export default function PlayerCharacterSheet({ character, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen || !character) return null;

  // Dynamically create tabs based on character data
  const tabs = [
    { id: 'overview', name: '📊 Overview', icon: '📊' },
    { id: 'equipment', name: '🎒 Equipment', icon: '🎒' },
    { id: 'details', name: '📝 Details', icon: '📝' }
  ];

  // Only add spells tab if character has spells
  if (character.spells && character.spells.length > 0) {
    tabs.push({ id: 'spells', name: '✨ Spells', icon: '✨' });
  }

  // XP progression calculation using level-up service
  const currentXP = character.xp || 0;
  const currentLevel = character.level || 1;
  const xpForNextLevel = levelUpService.calculateXPForNextLevel(currentLevel);
  const progressPercentage = levelUpService.calculateXPProgress(currentXP, currentLevel);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-6 shadow-lg backdrop-blur-sm max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
            {character.name}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-600 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Basic Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Race:</span>
                    <span className="text-slate-200">{character.race}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Class:</span>
                    <span className="text-slate-200">{character.class}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Level:</span>
                    <span className="text-slate-200">{character.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Background:</span>
                    <span className="text-slate-200">{character.background}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Alignment:</span>
                    <span className="text-slate-200">{character.alignment}</span>
                  </div>
                </div>
              </div>

              {/* Ability Scores */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Ability Scores</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'Strength', score: character.strength },
                    { name: 'Dexterity', score: character.dexterity },
                    { name: 'Constitution', score: character.constitution },
                    { name: 'Intelligence', score: character.intelligence },
                    { name: 'Wisdom', score: character.wisdom },
                    { name: 'Charisma', score: character.charisma }
                  ].map((ability) => (
                    <div key={ability.name} className="bg-slate-700/30 rounded p-3">
                      <div className="text-xs text-slate-400">{ability.name}</div>
                      <div className={`text-lg font-bold ${getAbilityScoreColor(ability.score)}`}>
                        {ability.score}
                      </div>
                      <div className="text-sm text-slate-300">
                        {formatAbilityModifier(getAbilityModifier(ability.score))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Combat Stats */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Combat Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hit Points:</span>
                    <span className="text-slate-200">{character.hp}/{character.maxHp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Armor Class:</span>
                    <span className="text-slate-200">{character.ac}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Initiative:</span>
                    <span className="text-slate-200">{formatAbilityModifier(getAbilityModifier(character.dexterity))}</span>
                  </div>
                </div>
              </div>

              {/* Experience */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Experience</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Current XP:</span>
                    <span className="text-slate-200">{currentXP}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Next Level:</span>
                    <span className="text-slate-200">{xpForNextLevel || 'Max Level'}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-amber-400 to-orange-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-slate-400 text-center">
                    {xpForNextLevel ? `${Math.round(progressPercentage)}% to next level` : 'Maximum level reached'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Equipment Tab */}
          {activeTab === 'equipment' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-100">Equipment</h3>
              {character.equipment && character.equipment.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {character.equipment.map((item, index) => (
                    <div key={index} className="bg-slate-700/30 rounded p-3">
                      <div className="font-medium text-slate-200">{item.name}</div>
                      <div className="text-sm text-slate-400">
                        {item.type} • <span className={getRarityColor(item.rarity)}>{item.rarity}</span>
                      </div>
                      {item.description && (
                        <div className="text-sm text-slate-300 mt-2">{item.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">No equipment found.</p>
              )}
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Physical Description */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Physical Description</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
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

              {/* Personality */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Personality</h3>
                <div className="space-y-3 text-sm">
                  {character.personality && (
                    <div>
                      <span className="text-slate-400 font-medium">Personality:</span>
                      <div className="text-slate-200 mt-1">{character.personality}</div>
                    </div>
                  )}
                  {character.ideals && (
                    <div>
                      <span className="text-slate-400 font-medium">Ideals:</span>
                      <div className="text-slate-200 mt-1">{character.ideals}</div>
                    </div>
                  )}
                  {character.bonds && (
                    <div>
                      <span className="text-slate-400 font-medium">Bonds:</span>
                      <div className="text-slate-200 mt-1">{character.bonds}</div>
                    </div>
                  )}
                  {character.flaws && (
                    <div>
                      <span className="text-slate-400 font-medium">Flaws:</span>
                      <div className="text-slate-200 mt-1">{character.flaws}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Backstory */}
              {character.backstory && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-100">Backstory</h3>
                  <div className="text-sm text-slate-200 bg-slate-700/30 rounded p-4">
                    {character.backstory}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Spells Tab */}
          {activeTab === 'spells' && character.spells && character.spells.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-100">Spells</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {character.spells.map((spell, index) => (
                  <div key={index} className="bg-slate-700/30 rounded p-3">
                    <div className="font-medium text-slate-200">{spell.name}</div>
                    <div className="text-sm text-slate-400">
                      Level {spell.level} • {spell.school}
                    </div>
                    {spell.description && (
                      <div className="text-sm text-slate-300 mt-2">{spell.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 