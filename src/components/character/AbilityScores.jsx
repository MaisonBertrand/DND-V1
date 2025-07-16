import React from 'react';
import { standardArray } from '../../data/characterData';

export default function AbilityScores({ 
  character, 
  onInputChange, 
  abilityScoreMethod, 
  setAbilityScoreMethod,
  rolledScores,
  unassignedScores,
  assignedScores,
  hasRolled,
  onRollAllScores,
  onApplyStandardArray,
  onAssignScore,
  onUnassignScore
}) {
  return (
    <div className="space-y-8">
      {/* Ability Score Generation Method */}
      <div className="bg-gray-700 border border-gray-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Ability Score Generation Method</h3>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex items-center p-3 bg-gray-600 rounded-lg cursor-pointer hover:bg-gray-500 transition-colors duration-200">
              <input
                id="ability-method-standard"
                type="radio"
                name="abilityMethod"
                value="standard"
                checked={abilityScoreMethod === 'standard'}
                onChange={(e) => setAbilityScoreMethod(e.target.value)}
                className="mr-3 text-amber-500 focus:ring-amber-500"
              />
              <div>
                <span className="text-gray-100 font-medium">Standard Array</span>
                <p className="text-gray-300 text-sm">15, 14, 13, 12, 10, 8</p>
              </div>
            </label>
            <label className="flex items-center p-3 bg-gray-600 rounded-lg cursor-pointer hover:bg-gray-500 transition-colors duration-200">
              <input
                id="ability-method-roll"
                type="radio"
                name="abilityMethod"
                value="roll"
                checked={abilityScoreMethod === 'roll'}
                onChange={(e) => setAbilityScoreMethod(e.target.value)}
                className="mr-3 text-amber-500 focus:ring-amber-500"
              />
              <div>
                <span className="text-gray-100 font-medium">Roll 4d6, Drop Lowest</span>
                <p className="text-gray-300 text-sm">More random, potentially higher scores</p>
              </div>
            </label>
          </div>
          
          {abilityScoreMethod === 'standard' && (
            <button
              type="button"
              onClick={onApplyStandardArray}
              className="fantasy-button"
            >
              Apply Standard Array
            </button>
          )}
          
          {abilityScoreMethod === 'roll' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={onRollAllScores}
                disabled={hasRolled}
                className={`fantasy-button ${hasRolled ? 'bg-gray-500 cursor-not-allowed' : ''}`}
              >
                {hasRolled ? 'Scores Already Rolled' : 'Roll Ability Scores'}
              </button>
              {hasRolled && (
                <p className="text-sm text-gray-300">
                  You can only roll once, but you can reassign scores as many times as you like.
                </p>
              )}
              {rolledScores.length > 0 && (
                <div className="bg-gray-600 border border-gray-500 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-100 mb-3">Rolled Scores</h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {unassignedScores.map((score, index) => (
                      <span
                        key={`${score}-${index}`}
                        className="bg-amber-900 text-amber-200 border border-amber-600 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {score}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-300">
                    Click on an ability score below to assign your rolled scores. You can reassign them as many times as you want.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Ability Score Assignment */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map(ability => {
          const assignedScore = assignedScores[ability];
          const currentValue = assignedScore || character[ability] || 10;
          const modifier = Math.floor((currentValue - 10) / 2);
          
          return (
            <div key={ability} className="bg-gray-700 border border-gray-600 rounded-lg p-4 hover:border-amber-500/40 transition-colors duration-200">
              <label htmlFor={`ability-${ability}`} className="block text-sm font-medium text-amber-200 mb-3 capitalize">
                {ability}
              </label>
              
              {assignedScore ? (
                // Show assigned score
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-amber-400 text-center">{assignedScore}</div>
                  <div className="text-center">
                    <span className={`text-sm font-medium ${modifier >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {modifier >= 0 ? '+' : ''}{modifier}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUnassignScore(ability)}
                    className="w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 py-1 rounded transition-colors duration-200"
                  >
                    Unassign
                  </button>
                </div>
              ) : (
                // Show assignment options
                <div className="space-y-3">
                  <input
                    id={`ability-${ability}`}
                    name={`ability-${ability}`}
                    type="number"
                    min="1"
                    max="20"
                    value={currentValue}
                    onChange={(e) => onInputChange(ability, parseInt(e.target.value))}
                    className="fantasy-input text-center text-lg font-semibold"
                    required
                  />
                  <div className="text-center">
                    <span className={`text-sm font-medium ${modifier >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {modifier >= 0 ? '+' : ''}{modifier}
                    </span>
                  </div>
                  {unassignedScores.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {unassignedScores.map((score, index) => (
                        <button
                          key={`${score}-${index}`}
                          type="button"
                          onClick={() => onAssignScore(score, ability)}
                          className="bg-amber-900 hover:bg-amber-800 border border-amber-600 text-amber-200 px-2 py-1 rounded text-xs font-medium transition-colors duration-200"
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ability Score Summary */}
      {(character.strength || character.dexterity || character.constitution || 
        character.intelligence || character.wisdom || character.charisma) && (
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-100 mb-4">Ability Score Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map(ability => {
              const value = character[ability] || 10;
              const modifier = Math.floor((value - 10) / 2);
              return (
                <div key={ability} className="flex justify-between items-center">
                  <span className="text-amber-300 font-medium capitalize">{ability}</span>
                  <span className="text-gray-300">
                    {value} ({modifier >= 0 ? '+' : ''}{modifier})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 