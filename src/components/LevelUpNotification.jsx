import React, { useState, useEffect } from 'react';
import { levelUpService } from '../services/levelUpService';

export default function LevelUpNotification({ 
  character, 
  isVisible, 
  onClose, 
  onLevelUpComplete 
}) {
  const [levelUpInfo, setLevelUpInfo] = useState(null);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);

  useEffect(() => {
    if (isVisible && character) {
      const info = levelUpService.getLevelUpInfo(character);
      setLevelUpInfo(info);
    }
  }, [isVisible, character]);

  if (!isVisible || !levelUpInfo) return null;

  return (
    <>
      {/* Level Up Notification */}
      <div className="fixed top-4 right-4 z-50 animate-bounce">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-lg shadow-lg border-2 border-amber-300 max-w-sm">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🎉</div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Level Up!</h3>
              <p className="text-sm opacity-90">
                {character.name} reached level {levelUpInfo.newLevel}!
              </p>
              {levelUpInfo.hasAbilityScoreImprovement && (
                <p className="text-xs opacity-75 mt-1">
                  +{levelUpInfo.abilityScorePoints} ability score points available
                </p>
              )}
              {levelUpInfo.canLearnSpells && (
                <p className="text-xs opacity-75">
                  New spells available
                </p>
              )}
            </div>
            <button
              onClick={() => setShowLevelUpModal(true)}
              className="bg-white text-amber-600 px-3 py-1 rounded text-sm font-semibold hover:bg-amber-50 transition-colors"
            >
              Level Up
            </button>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-lg"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      {/* Level Up Modal */}
      {showLevelUpModal && (
        <LevelUpModal
          character={character}
          levelUpInfo={levelUpInfo}
          isOpen={showLevelUpModal}
          onClose={() => setShowLevelUpModal(false)}
          onComplete={(updatedCharacter) => {
            setShowLevelUpModal(false);
            onLevelUpComplete(updatedCharacter);
          }}
        />
      )}
    </>
  );
}

// Level Up Modal Component
function LevelUpModal({ character, levelUpInfo, isOpen, onClose, onComplete }) {
  const [abilityScoreIncreases, setAbilityScoreIncreases] = useState({});
  const [selectedSpells, setSelectedSpells] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const abilityScores = [
    { key: 'strength', name: 'Strength', current: character.strength },
    { key: 'dexterity', name: 'Dexterity', current: character.dexterity },
    { key: 'constitution', name: 'Constitution', current: character.constitution },
    { key: 'intelligence', name: 'Intelligence', current: character.intelligence },
    { key: 'wisdom', name: 'Wisdom', current: character.wisdom },
    { key: 'charisma', name: 'Charisma', current: character.charisma }
  ];

  const availableSpells = levelUpService.getAvailableSpells(character.class, levelUpInfo.newLevel);
  const remainingPoints = levelUpInfo.abilityScorePoints - Object.values(abilityScoreIncreases).reduce((sum, val) => sum + val, 0);

  const handleAbilityScoreIncrease = (ability, increase) => {
    if (increase > 0 && remainingPoints < increase) return;
    if (increase < 0 && !abilityScoreIncreases[ability]) return;

    setAbilityScoreIncreases(prev => ({
      ...prev,
      [ability]: (prev[ability] || 0) + increase
    }));
  };

  const handleSpellSelection = (spell) => {
    setSelectedSpells(prev => {
      const exists = prev.find(s => s.name === spell.name);
      if (exists) {
        return prev.filter(s => s.name !== spell.name);
      } else {
        return [...prev, spell];
      }
    });
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const updatedCharacter = levelUpService.applyLevelUp(
        character, 
        levelUpInfo, 
        abilityScoreIncreases, 
        selectedSpells
      );
      onComplete(updatedCharacter);
    } catch (error) {
      console.error('Error completing level up:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    if (currentStep === 1 && levelUpInfo.hasAbilityScoreImprovement) {
      return remainingPoints === 0;
    }
    return true;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-6 shadow-lg backdrop-blur-sm max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
            Level Up - {character.name}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex mb-6">
          <div className={`flex-1 text-center ${currentStep >= 1 ? 'text-amber-400' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
              currentStep >= 1 ? 'bg-amber-500' : 'bg-slate-600'
            }`}>
              1
            </div>
            <span className="text-sm">Ability Scores</span>
          </div>
          {levelUpInfo.canLearnSpells && (
            <div className={`flex-1 text-center ${currentStep >= 2 ? 'text-amber-400' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                currentStep >= 2 ? 'bg-amber-500' : 'bg-slate-600'
              }`}>
                2
              </div>
              <span className="text-sm">Spells</span>
            </div>
          )}
          <div className={`flex-1 text-center ${currentStep >= (levelUpInfo.canLearnSpells ? 3 : 2) ? 'text-amber-400' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
              currentStep >= (levelUpInfo.canLearnSpells ? 3 : 2) ? 'bg-amber-500' : 'bg-slate-600'
            }`}>
              {levelUpInfo.canLearnSpells ? '3' : '2'}
            </div>
            <span className="text-sm">Complete</span>
          </div>
        </div>

        {/* Step 1: Ability Score Improvements */}
        {currentStep === 1 && levelUpInfo.hasAbilityScoreImprovement && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-slate-100 mb-2">
                Ability Score Improvements
              </h3>
              <p className="text-slate-300">
                You have {levelUpInfo.abilityScorePoints} points to spend. 
                {remainingPoints > 0 && (
                  <span className="text-amber-400"> {remainingPoints} remaining</span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {abilityScores.map((ability) => (
                <div key={ability.key} className="bg-slate-700/30 rounded p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-slate-200">{ability.name}</h4>
                    <div className="text-lg font-bold text-slate-100">
                      {ability.current + (abilityScoreIncreases[ability.key] || 0)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAbilityScoreIncrease(ability.key, 1)}
                      disabled={remainingPoints < 1 || (ability.current + (abilityScoreIncreases[ability.key] || 0)) >= 20}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 disabled:text-slate-400 text-white py-2 rounded text-sm font-medium transition-colors"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => handleAbilityScoreIncrease(ability.key, 2)}
                      disabled={remainingPoints < 2 || (ability.current + (abilityScoreIncreases[ability.key] || 0)) >= 19}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 disabled:text-slate-400 text-white py-2 rounded text-sm font-medium transition-colors"
                    >
                      +2
                    </button>
                    {(abilityScoreIncreases[ability.key] || 0) > 0 && (
                      <button
                        onClick={() => handleAbilityScoreIncrease(ability.key, -1)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm font-medium transition-colors"
                      >
                        Undo
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <button
                onClick={onClose}
                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setCurrentStep(levelUpInfo.canLearnSpells ? 2 : 3)}
                disabled={!canProceed()}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 disabled:text-slate-400 text-white px-6 py-2 rounded font-medium transition-colors"
              >
                {levelUpInfo.canLearnSpells ? 'Next: Spells' : 'Complete Level Up'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Spell Selection */}
        {currentStep === 2 && levelUpInfo.canLearnSpells && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-slate-100 mb-2">
                Learn New Spells
              </h3>
              <p className="text-slate-300">
                Choose spells to add to your spellbook
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {availableSpells.map((spell) => (
                <div
                  key={spell.name}
                  onClick={() => handleSpellSelection(spell)}
                  className={`bg-slate-700/30 rounded p-4 cursor-pointer transition-colors ${
                    selectedSpells.find(s => s.name === spell.name)
                      ? 'ring-2 ring-amber-400 bg-amber-900/20'
                      : 'hover:bg-slate-700/50'
                  }`}
                >
                  <div className="font-semibold text-slate-200">{spell.name}</div>
                  <div className="text-sm text-slate-400">
                    Level {spell.level} • {spell.school}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded font-medium transition-colors"
              >
                Next: Complete
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Summary and Complete */}
        {currentStep === (levelUpInfo.canLearnSpells ? 3 : 2) && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-slate-100 mb-2">
                Level Up Summary
              </h3>
              <p className="text-slate-300">
                {character.name} is now level {levelUpInfo.newLevel}!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Level Changes */}
              <div className="bg-slate-700/30 rounded p-4">
                <h4 className="font-semibold text-slate-200 mb-3">Level Changes</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Old Level:</span>
                    <span className="text-slate-200">{levelUpInfo.oldLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">New Level:</span>
                    <span className="text-amber-400 font-semibold">{levelUpInfo.newLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">HP Increase:</span>
                    <span className="text-slate-200">+{levelUpInfo.newLevel - levelUpInfo.oldLevel} max HP</span>
                  </div>
                </div>
              </div>

              {/* Ability Score Changes */}
              {levelUpInfo.hasAbilityScoreImprovement && Object.keys(abilityScoreIncreases).length > 0 && (
                <div className="bg-slate-700/30 rounded p-4">
                  <h4 className="font-semibold text-slate-200 mb-3">Ability Score Changes</h4>
                  <div className="space-y-2 text-sm">
                    {Object.entries(abilityScoreIncreases).map(([ability, increase]) => (
                      <div key={ability} className="flex justify-between">
                        <span className="text-slate-400 capitalize">{ability}:</span>
                        <span className="text-green-400">+{increase}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Spell Changes */}
              {levelUpInfo.canLearnSpells && selectedSpells.length > 0 && (
                <div className="bg-slate-700/30 rounded p-4 md:col-span-2">
                  <h4 className="font-semibold text-slate-200 mb-3">New Spells</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedSpells.map((spell) => (
                      <div key={spell.name} className="text-sm text-slate-300">
                        • {spell.name} (Level {spell.level})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(levelUpInfo.canLearnSpells ? 2 : 1)}
                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:text-slate-400 text-white px-6 py-2 rounded font-medium transition-colors"
              >
                {isLoading ? 'Completing...' : 'Complete Level Up'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 